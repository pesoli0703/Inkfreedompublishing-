import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * Request-scoped Supabase client. Reads and writes the auth cookies so server
 * components always see the signed-in reader, and RLS is applied as that user.
 */
export async function createSupabaseServerClient() {
  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component render — middleware refreshes instead.
        }
      },
    },
  });
}
