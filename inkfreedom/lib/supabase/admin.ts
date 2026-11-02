import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Service-role client. Bypasses RLS, so every caller must have checked the
 * authorisation of the person making the request first.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
