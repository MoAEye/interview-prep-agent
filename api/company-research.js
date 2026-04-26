import OpenAI from "openai";
import { requireCandidateSession } from "./_lib/candidateAuth.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are an expert career coach and company researcher.
Research the company and role provided and return a detailed briefing to help a candidate prepare for their interview.
Be specific, accurate, and practical. Focus on what will actually help them succeed in the interview.
Return ONLY valid JSON matching the schema described in the user message. No markdown fences.`;

const USER_JSON_INSTRUCTIONS = `Return ONLY valid JSON with this exact structure:
{
  "companyOverview": {
    "whatTheyDo": string,
    "industryAndSize": string,
    "foundedAndHq": string,
    "missionValues": string
  },
  "roleAnalysis": {
    "whatRoleIsAbout": string,
    "keySkills": string[],
    "seniority": string,
    "likelyTeamStructure": string
  },
  "interviewPrep": {
    "likelyQuestions": string[] (exactly 5),
    "whatTheyCareAbout": string,
    "redFlagsToAvoid": string[],
    "questionsToAskThem": string[]
  },
  "salaryInsights": {
    "typicalRange": string,
    "negotiationTips": string
  },
  "cvMatch": null | {
    "matchPercent": number (0-100),
    "topStrengths": string[] (3),
    "topGaps": string[] (3),
    "positioningLine": string
  }
}
If cvText is empty or missing, set cvMatch to null. Otherwise fill cvMatch realistically.`;

function extractResponsesText(resp) {
  const parts = [];
  const out = resp?.output;
  if (!Array.isArray(out)) return "";
  for (const item of out) {
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("\n").trim();
}

async function researchWithWebSearch(userPayload) {
  const resp = await client.responses.create({
    model: "gpt-4o",
    instructions: SYSTEM,
    tools: [{ type: "web_search_preview" }],
    input: `${USER_JSON_INSTRUCTIONS}\n\nData:\n${JSON.stringify(userPayload)}`,
    text: {
      format: {
        type: "json_object",
      },
    },
  });
  const text = extractResponsesText(resp);
  if (!text) throw new Error("empty_response");
  return JSON.parse(text);
}

async function researchChatFallback(userPayload) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${USER_JSON_INSTRUCTIONS}\n\nData:\n${JSON.stringify(userPayload)}`,
      },
    ],
  });
  const raw = completion?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

function stripInvisible(s) {
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function trimUrlCandidate(raw) {
  return stripInvisible(String(raw || ""))
    .trim()
    .replace(/^[<[(]+/g, "")
    .replace(/[)\].,;'"»]+$/g, "")
    .trim();
}

function normalizeUrlInput(s) {
  const t = stripInvisible(s).trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-zA-Z0-9][-a-zA-Z0-9+.]*\.[a-zA-Z]{2,}/.test(t)) return `https://${t}`;
  return t;
}

function looksLikeHttpUrl(s) {
  if (!s || typeof s !== "string") return false;
  try {
    const u = new URL(normalizeUrlInput(trimUrlCandidate(s)));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Indeed search / category listing URLs — not a single job posting (often breaks fetch + briefing). */
function indeedSearchResultsUrlMessage(urlString) {
  try {
    const u = new URL(normalizeUrlInput(trimUrlCandidate(urlString)));
    if (!/indeed\./i.test(u.hostname)) return null;
    const path = u.pathname.toLowerCase();
    if (/\/viewjob/i.test(path) || /\/pagead\/clk/i.test(path) || /\/rc\/clk/i.test(path)) return null;
    if (/\/q-[^/]+-jobs\.html$/i.test(path)) {
      return "That Indeed link is a search-results page, not one job. Open a specific listing and use its URL (usually contains “viewjob”), or paste the job description.";
    }
    if (path === "/jobs" && u.searchParams.has("q") && !u.searchParams.get("jk")) {
      return "That Indeed link looks like search results. Open one job and paste its URL or the full posting text.";
    }
    return null;
  } catch {
    return null;
  }
}

/** Cloudflare / bot interstitials often return 200 or short HTML that passes a naive length check. */
function isLikelyBotWallPlainText(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return true;
  if (t.length > 1200) return false;
  return /just a moment|enable javascript|verify you are human|checking your browser|cloudflare ray id|access denied|bot or human|automated access|please complete the security check|ddos protection by/i.test(
    t
  );
}

/** Basic SSRF guard: only public http(s), no localhost / private IPs. */
function isAllowedFetchUrl(urlString) {
  let u;
  try {
    u = new URL(urlString.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "[::1]" || host.endsWith(".localhost")) return false;
  if (host === "127.0.0.1" || host.startsWith("127.")) return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const m = /^172\.(\d+)\./.exec(host);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return false;
  }
  if (/^169\.254\./.test(host)) return false;
  return true;
}

function htmlToPlainText(html) {
  if (!html || typeof html !== "string") return "";
  let s = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  const titleM = s.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, " ") : "";
  s = s.replace(/<[^>]+>/g, " ");
  const combined = `${title} ${s}`;
  return combined
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJobPostingText(urlString) {
  const urlNorm = normalizeUrlInput(urlString);
  if (!isAllowedFetchUrl(urlNorm)) throw new Error("url_not_allowed");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(urlNorm, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error("fetch_blocked");
      throw new Error(`fetch_status_${res.status}`);
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("text/plain") && !ct.includes("application/xhtml")) {
      throw new Error("fetch_not_html");
    }
    const html = await res.text();
    if (html.length > 2_000_000) throw new Error("fetch_too_large");
    const text = htmlToPlainText(html);
    if (text.length < 20) throw new Error("fetch_too_short");
    if (isLikelyBotWallPlainText(text)) throw new Error("fetch_blocked");
    return text;
  } finally {
    clearTimeout(t);
  }
}

function tryParseHttpUrlFromLine(line) {
  const t = trimUrlCandidate(line);
  if (!t) return { url: "", rest: "" };
  if (looksLikeHttpUrl(t)) {
    return { url: normalizeUrlInput(t), rest: "" };
  }
  const re = /https?:\/\/[^\s<>'"{}|\\^`[\])]+/gi;
  for (const m of t.matchAll(re)) {
    const cand = trimUrlCandidate(m[0]);
    if (cand && looksLikeHttpUrl(cand)) {
      const norm = normalizeUrlInput(cand);
      const rest = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).trim();
      return { url: norm, rest };
    }
  }
  return { url: "", rest: t };
}

/** First line may be a URL or contain https://…; remaining lines are pasted job text (matches client). */
function splitLeadingUrlFromDescription(jobDescription) {
  const t = stripInvisible(String(jobDescription || "")).trim();
  if (!t || t.length >= 2048) return { url: "", rest: t };
  const lines = t.split(/\n/).map((l) => trimUrlCandidate(l.trim())).filter(Boolean);
  if (!lines.length) return { url: "", rest: "" };
  const { url, rest } = tryParseHttpUrlFromLine(lines[0]);
  if (!url) return { url: "", rest: t };
  return { url, rest: [rest, ...lines.slice(1)].filter(Boolean).join("\n").trim() };
}

async function resolveJobDescription(body) {
  const rawField = trimUrlCandidate(stripInvisible(String(body.jobUrl || body.job_url || "")).trim());
  let jobDescription = stripInvisible(String(body.jobDescription || body.job_description || "")).trim();
  let jobUrl = "";

  if (rawField) {
    const { url, rest } = tryParseHttpUrlFromLine(rawField);
    if (url) {
      jobUrl = url;
      if (rest) {
        jobDescription = [rest, jobDescription].filter(Boolean).join("\n").trim();
      }
    }
  }

  if (!jobUrl) {
    const { url, rest } = splitLeadingUrlFromDescription(jobDescription);
    if (url) {
      jobUrl = url;
      jobDescription = rest;
    }
  }

  if (jobUrl) {
    const indeedMsg = indeedSearchResultsUrlMessage(jobUrl);
    const pastedOk = jobDescription.length >= 20;
    if (indeedMsg && !pastedOk) throw new Error(indeedMsg);
    const skipFetch = indeedMsg && pastedOk;
    if (!skipFetch) {
      try {
        const fetched = await fetchJobPostingText(jobUrl);
        jobDescription = fetched.slice(0, 24000);
      } catch (e) {
        const code = e?.message || "";
        if (jobDescription.length >= 20) {
          /* use pasted text when URL fails */
        } else if (code === "url_not_allowed") {
          throw new Error("That URL is not allowed. Use a public https job posting link or paste the description.");
        } else if (code === "fetch_too_short") {
          throw new Error("Could not extract enough text from that page. Paste the full job description below.");
        } else if (code === "fetch_blocked" || /^fetch_status_(401|403)$/.test(code)) {
          throw new Error(
            "That site blocked automatic loading (common for Indeed and LinkedIn). Paste the job description in the text box below."
          );
        } else {
          throw new Error(
            "Could not load that URL (site may block bots or the page needs a login). Paste the job description text instead."
          );
        }
      }
    }
  }

  return jobDescription;
}

function normalizeResult(parsed, hasCv) {
  const d = parsed && typeof parsed === "object" ? parsed : {};
  const co = d.companyOverview || {};
  const ra = d.roleAnalysis || {};
  const ip = d.interviewPrep || {};
  const si = d.salaryInsights || {};
  let cm = d.cvMatch;
  if (!hasCv) cm = null;
  if (cm && typeof cm !== "object") cm = null;

  return {
    companyOverview: {
      whatTheyDo: String(co.whatTheyDo || ""),
      industryAndSize: String(co.industryAndSize || ""),
      foundedAndHq: String(co.foundedAndHq || ""),
      missionValues: String(co.missionValues || ""),
    },
    roleAnalysis: {
      whatRoleIsAbout: String(ra.whatRoleIsAbout || ""),
      keySkills: Array.isArray(ra.keySkills) ? ra.keySkills.filter((x) => typeof x === "string").slice(0, 12) : [],
      seniority: String(ra.seniority || ""),
      likelyTeamStructure: String(ra.likelyTeamStructure || ""),
    },
    interviewPrep: {
      likelyQuestions: Array.isArray(ip.likelyQuestions) ? ip.likelyQuestions.filter((x) => typeof x === "string").slice(0, 8) : [],
      whatTheyCareAbout: String(ip.whatTheyCareAbout || ""),
      redFlagsToAvoid: Array.isArray(ip.redFlagsToAvoid) ? ip.redFlagsToAvoid.filter((x) => typeof x === "string").slice(0, 8) : [],
      questionsToAskThem: Array.isArray(ip.questionsToAskThem) ? ip.questionsToAskThem.filter((x) => typeof x === "string").slice(0, 12) : [],
    },
    salaryInsights: {
      typicalRange: String(si.typicalRange || ""),
      negotiationTips: String(si.negotiationTips || ""),
    },
    cvMatch: cm
      ? {
          matchPercent: Math.min(100, Math.max(0, Math.round(Number(cm.matchPercent) || 0))),
          topStrengths: Array.isArray(cm.topStrengths) ? cm.topStrengths.filter((x) => typeof x === "string").slice(0, 3) : [],
          topGaps: Array.isArray(cm.topGaps) ? cm.topGaps.filter((x) => typeof x === "string").slice(0, 3) : [],
          positioningLine: String(cm.positioningLine || ""),
        }
      : null,
    disclaimer: "Verify facts on the company website, LinkedIn, and recent news before your interview.",
  };
}

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local." });
    return;
  }
  const authed = await requireCandidateSession(req, res);
  if (!authed) return;
  try {
    const body = req.body || {};
    const companyName = String(body.companyName || body.company || "").trim();
    const cvText = String(body.cvText || body.cv_text || "").trim();
    if (!companyName) {
      res.status(400).json({ error: "companyName is required." });
      return;
    }

    let jobDescription;
    try {
      jobDescription = await resolveJobDescription(body);
    } catch (e) {
      res.status(400).json({ error: e?.message || "Invalid job URL or description." });
      return;
    }

    if (!jobDescription || jobDescription.length < 20) {
      res.status(400).json({
        error:
          "Add a job posting URL (in the URL field or as a single link in the description box) or paste the description (at least a short paragraph).",
      });
      return;
    }

    const userPayload = {
      companyName,
      jobDescription: jobDescription.slice(0, 24000),
      cvText: cvText ? cvText.slice(0, 12000) : "",
    };

    let parsed;
    try {
      parsed = await researchWithWebSearch(userPayload);
    } catch (e) {
      console.warn("[company-research] web search path failed, using chat fallback:", e?.message || e);
      parsed = await researchChatFallback(userPayload);
    }

    const out = normalizeResult(parsed, !!cvText);
    res.status(200).json(out);
  } catch (error) {
    captureApiException(error, { route: "company-research" });
    const msg = error?.message || "";
    let userMsg = "Company research failed.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Try again shortly.";
    console.error("company-research error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
