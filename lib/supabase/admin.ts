import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Service-role client. Server-only: importing this from a client component is a
 * build error, and the key is never exposed with a NEXT_PUBLIC_ prefix.
 * Used for storage signing, gateway settlement and webhook handling only.
 */
export function serviceRoleConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !supabaseUrl) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
