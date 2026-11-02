const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const supabaseUrl = url;
export const supabaseKey = publishable;

/** True when the browser-safe connection details are present. */
export const isSupabaseConfigured = url.length > 0 && publishable.length > 0;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
