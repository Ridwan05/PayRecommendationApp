import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client that uses the Supabase service-role key and bypasses RLS.
// Used for cross-user lookups (e.g. finding CEO/HR emails to notify) that the
// acting user's own session is not permitted to read. NEVER import this into a
// Client Component or expose the key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
