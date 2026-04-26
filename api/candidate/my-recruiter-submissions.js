import { createClient } from "@supabase/supabase-js";
import { loadEnvLocalSafe } from "../_lib/loadEnvLocalSafe.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  loadEnvLocalSafe();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: "Server misconfiguration." });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user?.email) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error } = await supabase
      .from("recruiter_candidates")
      .select("id, role_id, candidate_name, candidate_email, candidate_cv, score, created_at")
      .eq("candidate_email", user.email)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || "Failed to load submissions." });
    }

    const candidates = Array.isArray(rows) ? rows : [];
    if (candidates.length === 0) {
      return res.status(200).json({ submissions: [] });
    }

    const roleIds = [...new Set(candidates.map((c) => c.role_id).filter(Boolean))];
    const { data: rolesRows, error: rolesErr } = await supabase
      .from("recruiter_roles")
      .select("id, title, description")
      .in("id", roleIds);

    if (rolesErr) {
      return res.status(200).json({ submissions: candidates.map((c) => ({ ...c, title: "Role", description: "" })) });
    }

    const rolesMap = {};
    (Array.isArray(rolesRows) ? rolesRows : []).forEach((r) => { rolesMap[r.id] = r; });

    const submissions = candidates.map((c) => {
      const role = rolesMap[c.role_id] || {};
      return {
        id: c.id,
        role_id: c.role_id,
        title: role.title || "Role",
        description: role.description || "",
        candidate_cv: c.candidate_cv || "",
        candidate_email: c.candidate_email,
        score: c.score,
        created_at: c.created_at,
      };
    });

    return res.status(200).json({ submissions });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
