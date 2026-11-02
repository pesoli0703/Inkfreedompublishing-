export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * True only when the browser-safe connection details are present. Every screen
 * that depends on live data checks this so an unconfigured deployment says so
 * instead of pretending to be connected.
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabasePublishableKey.length > 0;

export const supabaseProjectRef = (() => {
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  return match ? match[1] : null;
})();
