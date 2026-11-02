import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";
import type { Author, Profile, Role } from "./types";

export type Viewer = {
  user: User;
  profile: Profile;
  author: Author | null;
};

/**
 * One request-scoped lookup for the signed-in person, their profile and (when
 * they are an author) their public author record.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("ink_profiles")
    .select("id, email, full_name, role, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  let author: Author | null = null;
  if (profile.role === "author" || profile.role === "admin") {
    const { data } = await supabase
      .from("ink_authors")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();
    author = (data as Author | null) ?? null;
  }

  return { user, profile: profile as Profile, author };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return viewer;
}

export async function requireRole(role: Role | Role[], next?: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(viewer.profile.role)) {
    redirect(viewer.profile.role === "admin" ? "/admin" : "/library");
  }
  return viewer;
}

export async function requireAuthor(): Promise<Viewer & { author: Author }> {
  const viewer = await requireRole(["author", "admin"], "/studio");
  if (!viewer.author) {
    redirect("/studio/onboarding");
  }
  return viewer as Viewer & { author: Author };
}

export async function requireAdmin(): Promise<Viewer> {
  return requireRole("admin", "/admin");
}

export const COMMISSION_RATE = 0.1;

export function isStaff(role: Role) {
  return role === "admin";
}
