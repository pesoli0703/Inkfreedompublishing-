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

export async function requireAdmin(nextPath = "/admin"): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (viewer.role !== "admin") redirect("/dashboard");
  return viewer;
}

export async function requireAuthor(nextPath = "/author"): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (viewer.role !== "author" && viewer.role !== "admin") redirect("/publish");
  return viewer;
}

export const roleHome = (role: Viewer["role"]) =>
  role === "admin" ? "/admin" : role === "author" ? "/author" : "/dashboard";
