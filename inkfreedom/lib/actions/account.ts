"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FormState = { error: string | null; message?: string | null };

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2) return { error: "Enter your name." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const { error } = await supabase
    .from("ink_profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.from("ink_authors").update({ name: fullName }).eq("profile_id", user.id);

  revalidatePath("/", "layout");
  return { error: null, message: "Profile saved." };
}

export async function updateAuthorProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
  };

  if (payload.name.length < 2) return { error: "Your author name is required." };

  const { error } = await supabase
    .from("ink_authors")
    .update(payload)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null, message: "Public author page updated." };
}
