import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

function loadEnvLocal() {
  try {
    const dirs = [path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), process.cwd()];
    for (const dir of dirs) {
      const p = path.join(dir, ".env.local");
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        content.split("\n").forEach((line) => {
          const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
          if (m) process.env[m[1]] = m[2].trim();
        });
        return;
      }
    }
  } catch (_) {}
}
loadEnvLocal();

/**
 * Returns jobs in demand for a location.
 * Optional: set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local to use real Adzuna data.
 * Otherwise returns sensible placeholder data based on the location/keywords.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const location = (req.query?.location || req.query?.where || "").trim() || "your area";
  const jobKeyword = (req.query?.job || req.query?.what || "").trim();

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (appId && appKey) {
    try {
      // UK-only for now
      const country = "gb";
      const encodedWhat = encodeURIComponent(jobKeyword || "developer");
      const encodedWhere = encodeURIComponent(location);
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodedWhat}&where=${encodedWhere}&results_per_page=10&content-type=application/json`;
      const r = await fetch(url);
      const data = await r.json();
      const results = data?.results || [];
      const count = data?.count ?? results.length;
      return res.status(200).json({
        location,
        total_count: count,
        jobs: results.slice(0, 10).map((j) => ({
          title: j.title,
          company: j.company?.display_name,
          location: j.location?.display_name,
          url: j.redirect_url,
          created: j.created,
        })),
        source: "adzuna",
      });
    } catch (err) {
      console.error("Adzuna API error:", err);
      // Fall through to placeholder
    }
  }

  // Placeholder: UK job market – in-demand roles
  const inDemandRoles = [
    { title: "Software Engineer", demand: "High", trend: "Growing" },
    { title: "Data Analyst", demand: "High", trend: "Growing" },
    { title: "Product Manager", demand: "Medium", trend: "Stable" },
    { title: "UX Designer", demand: "Medium", trend: "Growing" },
    { title: "DevOps / Cloud Engineer", demand: "High", trend: "Growing" },
    { title: "Full Stack Developer", demand: "High", trend: "Growing" },
  ];
  if (jobKeyword) {
    inDemandRoles.unshift({
      title: jobKeyword,
      demand: "See UK listings",
      trend: "—",
    });
  }

  return res.status(200).json({
    location,
    total_count: null,
    jobs: [],
    in_demand_roles: inDemandRoles,
    source: "placeholder",
    region: "UK",
    message: "Add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env.local to see real UK job listings for your area.",
  });
}
