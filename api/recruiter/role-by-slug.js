import { createClient } from "@supabase/supabase-js";
import { loadEnvLocalSafe } from "../_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const slug = typeof req.query.slug === "string" ? req.query.slug.trim() : "";
  if (!slug) {
    return res.status(400).json({ error: "Missing slug" });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase URL or service role key missing.",
    });
  }
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error } = await supabase
      .from("recruiter_roles")
      .select("id, title, description")
      .eq("share_slug", slug)
      .limit(1);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    const role = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    return res.status(200).json(role);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
