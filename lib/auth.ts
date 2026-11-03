import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  role: "reader" | "author" | "admin";
  fullName: string | null;
  status: string;
};

/** Current signed-in user with their profile row, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role ?? "reader") as Viewer["role"],
    fullName: profile?.full_name ?? null,
    status: profile?.status ?? "active",
  };
}

export async function requireViewer(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  if (viewer.status !== "active") redirect("/suspended");
  return viewer;
}

/**
 * Author portal guard.
 *
 * Signed out? Send them to the author portal's own sign-in screen, not the
 * storefront's, so the URL they are returned to is the one they wanted.
 */
export async function requireAuthorArea(nextPath = "/author"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/author/signin?next=${encodeURIComponent(nextPath)}`);
  if (viewer.status !== "active") redirect("/suspended");
  return viewer;
}

/**
 * Admin guard.
 *
 * Every page under /admin calls this on the server. The role check is a second
 * line of defence behind the database's row level security: hiding a button is
 * never the control.
 */
export async function requireAdmin(nextPath = "/admin"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/admin/signin?next=${encodeURIComponent(nextPath)}`);
  if (viewer.status !== "active") redirect("/suspended");
  if (viewer.role !== "admin") redirect(`/admin/no-access?from=${encodeURIComponent(nextPath)}`);
  return viewer;
}

export async function requireAuthor(nextPath = "/author"): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (viewer.role !== "author" && viewer.role !== "admin") redirect("/publish");
  return viewer;
}

export const roleHome = (role: Viewer["role"]) =>
  role === "admin" ? "/admin" : role === "author" ? "/author" : "/dashboard";
