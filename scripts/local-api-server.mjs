/**
 * Local API for Vite (:5173) — no Vercel login required.
 * Run: npm run api:local  (default http://127.0.0.1:8787 — avoids clashing with Vercel on :3000)
 * Or one command: npm run dev:vite / npm run dev:local
 * Health check: GET http://127.0.0.1:8787/api/health
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function unquoteEnvValue(s) {
  let v = String(s).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, "utf8");
  content = content.replace(/^\uFEFF/, "");
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const val = unquoteEnvValue(m[2]).trim();
      if (val === "") continue;
      process.env[m[1]] = val;
    }
  }
}
loadEnvLocal();

if (process.env.VERCEL_TOKEN) {
  delete process.env.VERCEL_TOKEN;
}

function createVercelStyleRes(nodeRes) {
  let sent = false;
  const res = {
    setHeader(name, value) {
      if (!sent) nodeRes.setHeader(name, value);
      return res;
    },
    status(code) {
      if (!sent) nodeRes.statusCode = code;
      return {
        json(obj) {
          if (sent) return;
          sent = true;
          if (!nodeRes.headersSent) nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
          nodeRes.end(JSON.stringify(obj));
        },
        send(chunk) {
          if (sent) return;
          sent = true;
          nodeRes.end(chunk ?? "");
        },
        end(chunk) {
          if (sent) return;
          sent = true;
          nodeRes.end(chunk ?? "");
        },
      };
    },
  };
  return res;
}

function lowerCaseHeaders(nodeReq) {
  const h = nodeReq.headers || {};
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

async function main() {
  const generateQuestions = (await import("../api/generate-questions.js")).default;
  const gradeInterview = (await import("../api/grade-interview.js")).default;
  const myRecruiterSubmissions = (await import("../api/candidate/my-recruiter-submissions.js")).default;
  const jobsInDemand = (await import("../api/jobs-in-demand.js")).default;
  const generateCoverLetter = (await import("../api/generate-cover-letter.js")).default;
  const generateCoverNote = (await import("../api/generate-cover-note.js")).default;
  const roleBySlug = (await import("../api/recruiter/role-by-slug.js")).default;
  const submitInterview = (await import("../api/recruiter/submit-interview.js")).default;
  const companyResearch = (await import("../api/company-research.js")).default;
  const tailorCv = (await import("../api/tailor-cv.js")).default;
  const analyseCv = (await import("../api/analyse-cv.js")).default;
  const academyContent = (await import("../api/academy-content.js")).default;
  const academyFeedback = (await import("../api/academy-feedback.js")).default;
  const ariaCoach = (await import("../api/aria-coach.js")).default;
  const ariaTts = (await import("../api/aria-tts.js")).default;
  const healthHandler = (await import("../api/health.js")).default;

  const port = Number(process.env.LOCAL_API_PORT || process.env.PORT || 8787);

  const server = createServer(async (nodeReq, nodeRes) => {
    const url = new URL(nodeReq.url || "/", `http://${nodeReq.headers.host || "localhost"}`);
    let pathname = url.pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      /* keep pathname */
    }
    const method = (nodeReq.method || "GET").toUpperCase();

    if (method === "OPTIONS") {
      nodeRes.setHeader("Access-Control-Allow-Origin", "*");
      nodeRes.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      nodeRes.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      nodeRes.statusCode = 204;
      nodeRes.end();
      return;
    }

    const reqLike = {
      method,
      query: Object.fromEntries(url.searchParams),
      body: {},
      headers: lowerCaseHeaders(nodeReq),
    };

    const res = createVercelStyleRes(nodeRes);

    try {
      if (pathname === "/api/health" && method === "GET") {
        await healthHandler(reqLike, res);
        return;
      }
      if (pathname === "/api/generate-questions" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await generateQuestions(reqLike, res);
        return;
      }
      if (pathname === "/api/grade-interview" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await gradeInterview(reqLike, res);
        return;
      }
      if (pathname === "/api/candidate/my-recruiter-submissions" && method === "GET") {
        await myRecruiterSubmissions(reqLike, res);
        return;
      }
      if (pathname === "/api/jobs-in-demand" && method === "GET") {
        await jobsInDemand(reqLike, res);
        return;
      }
      if (pathname === "/api/generate-cover-letter" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await generateCoverLetter(reqLike, res);
        return;
      }
      if (pathname === "/api/generate-cover-note" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await generateCoverNote(reqLike, res);
        return;
      }
      if (pathname === "/api/recruiter/role-by-slug" && method === "GET") {
        await roleBySlug(reqLike, res);
        return;
      }
      if (pathname === "/api/recruiter/submit-interview" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await submitInterview(reqLike, res);
        return;
      }
      if (pathname === "/api/company-research" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await companyResearch(reqLike, res);
        return;
      }
      if (pathname === "/api/tailor-cv" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await tailorCv(reqLike, res);
        return;
      }
      if ((pathname === "/api/analyse-cv" || pathname === "/api/analyze-cv") && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await analyseCv(reqLike, res);
        return;
      }
      if (pathname === "/api/academy-content" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await academyContent(reqLike, res);
        return;
      }
      if (pathname === "/api/academy-feedback" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await academyFeedback(reqLike, res);
        return;
      }
      if (pathname === "/api/aria-coach" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        reqLike._streamNodeRes = nodeRes;
        await ariaCoach(reqLike, res);
        return;
      }
      if (pathname === "/api/aria-tts" && method === "POST") {
        reqLike.body = await readJsonBody(nodeReq);
        await ariaTts(reqLike, res);
        return;
      }

      nodeRes.statusCode = 404;
      nodeRes.setHeader("Content-Type", "application/json");
      nodeRes.end(JSON.stringify({ error: "Not found", path: pathname }));
    } catch (e) {
      console.error("[local-api]", e);
      if (!nodeRes.headersSent) {
        nodeRes.statusCode = 500;
        nodeRes.setHeader("Content-Type", "application/json");
        nodeRes.end(JSON.stringify({ error: (e && e.message) || "Server error" }));
      }
    }
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `[local-api] Port ${port} is already in use. Another process (often an old API) is bound there. Free it: lsof -ti :${port} | xargs kill -9  (Mac/Linux), then run npm run dev:vite or npm run api:local again.`
      );
    } else {
      console.error("[local-api] Server error:", err);
    }
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[local-api] http://127.0.0.1:${port}  (includes Pro AI routes: company-research, tailor-cv, analyse-cv, academy-*)`);
    console.log(`[local-api] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "set" : "MISSING"}`);
    console.log(`[local-api] SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING"}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
