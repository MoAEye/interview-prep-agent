import { supabase } from "./supabaseClient";

/** JSON POST headers with Supabase Bearer when signed in. */
export async function jsonAuthHeaders() {
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    await supabase.auth.refreshSession();
    ({
      data: { session },
    } = await supabase.auth.getSession());
  }
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}
