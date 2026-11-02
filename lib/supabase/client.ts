"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured for this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
