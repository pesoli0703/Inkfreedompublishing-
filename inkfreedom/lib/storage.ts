import { supabaseUrl } from "./supabase/config";

/** Public URL for artwork in the `covers` bucket. */
export function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${supabaseUrl}/storage/v1/object/public/covers/${path}`;
}
