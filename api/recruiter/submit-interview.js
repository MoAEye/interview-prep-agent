import { createClient } from "@supabase/supabase-js";
import { loadEnvLocalSafe } from "../_lib/loadEnvLocalSafe.js";
import { applyRateLimit, sanitizeAiInput, setApiSecurityHeaders } from "../_lib/httpSecurity.js";

loadEnvLocalSafe();

function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match && Number.isFinite(Number(match[0]))) return Number(match[0]);
  }
  return fallback;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

// Same grading as candidate side (grade-interview.js) so scores are consistent
const GRADING_SYSTEM_PROMPT =
  'You are an interview coach. Return ONLY valid JSON with this exact shape: {"overall_score":number,"star_rating":number,"summary":string,"strengths":string[],"improvements":string[],"question_grades":[{"question":string,"score":number,"answer_given":string,"what_was_good":string,"what_to_improve":string,"ideal_answer":string}]}. Rules: overall_score must be 0-100. star_rating 0-5. Each question score 0-10. Keep summary under 60 words. strengths/improvements max 3 items. Keep fields non-empty when possible. No markdown, no extra text. STRICT GRADING: Give 0 for any question that is unanswered, empty, or only a few characters with no substance. Minimal or nonsensical answers (e.g. 1-3 words or random letters) must get 0-1 out of 10 for that question. The overall_score must reflect completeness: if most questions are unanswered or very poor, overall_score must be in the 0-15 range (e.g. one minimal answer and rest unanswered = around 5-10 out of 100). When the user message includes CV and/or job description, weigh relevance to that role and alignment with the CV in your scores and feedback.';

function buildGradingUserContent(answers, { cv_text, job_description, job_title } = {}) {
  const cv = typeof cv_text === "string" ? cv_text.trim() : "";
  const jd = typeof job_description === "string" ? job_description.trim() : "";
  const role = typeof job_title === "string" ? job_title.trim() : "";
  const blocks = [];
  if (cv) blocks.push(`CV (candidate resume):\n${cv}`);
  if (jd) blocks.push(`Job description:\n${jd}`);
  if (role) blocks.push(`Role title:\n${role}`);
  blocks.push(
    "Use the above context when provided to judge how well the answers demonstrate fit for this role, consistency with the CV, and relevance to the job requirements. If no CV or job description was provided, grade on general interview quality and clarity.\n\nInterview answers (JSON array):\n" +
      JSON.stringify(answers)
  );
  return blocks.join("\n\n---\n\n");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  setApiSecurityHeaders(res);

  loadEnvLocalSafe();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (req.method === "GET") {
    res.status(200).json({ ok: true, config: !!supabaseUrl && !!serviceRoleKey });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!applyRateLimit(req, res, { limit: 30, windowMs: 60_000, key: "recruiter-submit-interview" })) {
    return;
  }

  let body = req.body;
  if (!body && typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch (_) {
      body = {};
    }
  }
  body = body || {};

  const slug = sanitizeAiInput(typeof body.slug === "string" ? body.slug.trim() : "");
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const candidateName = sanitizeAiInput(typeof body.candidate_name === "string" ? body.candidate_name.trim() : "");
  const candidateEmail = sanitizeAiInput(typeof body.candidate_email === "string" ? body.candidate_email.trim() : "");
  const candidateCv = sanitizeAiInput(typeof body.candidate_cv === "string" ? body.candidate_cv.trim() : "");

  if (!slug) {
    res.status(400).json({ error: "Missing slug" });
    return;
  }
  if (!candidateName) {
    res.status(400).json({ error: "Name is required." });
    return;
  }
  if (!candidateEmail) {
    res.status(400).json({ error: "Email address is required." });
    return;
  }
  if (!candidateCv) {
    res.status(400).json({ error: "CV / resume is required." });
    return;
  }
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Server misconfiguration: Supabase URL or service role key missing." });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRows, error: roleErr } = await supabase
      .from("recruiter_roles")
      .select("id, title, description")
      .eq("share_slug", slug)
      .limit(1);
    if (roleErr) {
      res.status(500).json({ error: roleErr.message || "Could not load role." });
      return;
    }
    const role = Array.isArray(roleRows) && roleRows[0] ? roleRows[0] : null;
    if (!role || !role.id) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    const roleTitle = typeof role.title === "string" ? role.title : "";
    const roleDescription = typeof role.description === "string" ? role.description : "";
    const gradingUserContent = buildGradingUserContent(answers, {
      cv_text: candidateCv,
      job_description: roleDescription,
      job_title: roleTitle,
    });

    let score = 0;
    if (process.env.OPENAI_API_KEY && answers.length > 0) {
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: GRADING_SYSTEM_PROMPT },
            { role: "user", content: gradingUserContent },
          ],
          response_format: { type: "json_object" },
        });
        const raw = completion?.choices?.[0]?.message?.content || "";
        const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsed = {};
        try {
          const m = cleaned.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : {};
        } catch (_) {
          const scoreMatch = raw.match(/"overall_score"\s*:\s*(\d+(?:\.\d+)?)/);
          parsed = { overall_score: scoreMatch ? Number(scoreMatch[1]) : 0 };
        }
        let overall = clamp(Math.round(safeNumber(parsed.overall_score)), 0, 100);
        if (overall > 0 && overall <= 10) overall = clamp(Math.round(overall * 10), 0, 100);
        // Derive from question_grades when present so unanswered = 0 and score is strict
        const grades = Array.isArray(parsed.question_grades) ? parsed.question_grades : [];
        if (grades.length > 0) {
          const totalPerQ = grades.reduce((sum, q) => sum + clamp(safeNumber(q.score), 0, 10), 0);
          const maxPerQ = grades.length * 10;
          const derived = maxPerQ > 0 ? Math.round((totalPerQ / maxPerQ) * 100) : 0;
          score = clamp(derived, 0, 100);
        } else {
          score = overall;
        }
      } catch (_) {
        score = 0;
      }
    }

    const payload = {
      role_id: role.id,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      candidate_cv: candidateCv,
      answers: answers,
      score: Number.isFinite(score) ? score : 0,
    };
    const { error: insertErr } = await supabase.from("recruiter_candidates").insert([payload]);
    if (insertErr) {
      res.status(500).json({ error: insertErr.message || "Could not save submission." });
      return;
    }
    res.status(200).json({ score });
  } catch (e) {
    res.status(500).json({ error: (e && (e.message || String(e))) || "Server error" });
  }
}
