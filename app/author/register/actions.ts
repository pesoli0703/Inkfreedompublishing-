"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

function failure(error: unknown): ActionState {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Something went wrong.";
  return { ok: false, message };
}

/**
 * Author portal sign-up.
 *
 * One step: a valid email and password, plus the pen name they will publish
 * under. There is no application, no editor deciding whether the person may
 * write, and no contract. The author workspace exists as soon as the account
 * does, which is what "register and immediately access the dashboard" means.
 *
 * Publishing rights still go through review at the book level: every upload is
 * read by an administrator before it can be bought.
 */
export async function registerAuthorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected on this deployment." };

  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = text(formData, "full_name");
  const penName = text(formData, "pen_name");
  const basedIn = text(formData, "based_in");
  const country = text(formData, "country_code").toUpperCase().slice(0, 2);

  if (!email.includes("@")) return { ok: false, message: "Enter a valid email address." };
  if (password.length < 8) {
    return { ok: false, message: "Use at least 8 characters for your password." };
  }
  if (penName.length < 2) {
    return { ok: false, message: "Choose a pen name of at least two characters." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || penName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/author`,
    },
  });
  if (error) return failure(error);

  if (!data.session) {
    return {
      ok: false,
      message:
        "Account created. Confirm your email address from the message we sent, then sign in at /author/signin.",
    };
  }

  const { error: profileError } = await supabase.rpc("start_self_publishing", {
    p_pen_name: penName,
    p_tagline: null,
    p_bio: null,
    p_based_in: basedIn || null,
    p_country: country || null,
    p_writing_in: null,
  });
  if (profileError) return failure(profileError);

  redirect("/author");
}
