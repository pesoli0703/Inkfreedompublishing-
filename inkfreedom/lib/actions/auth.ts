"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/config";

export type AuthState = { error: string | null; message?: string | null };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!emailPattern.test(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "That email and password do not match an account."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(next && next.startsWith("/") ? next : "/library");
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "reader") === "author" ? "author" : "reader";
  const next = String(formData.get("next") ?? "");

  if (fullName.length < 2) return { error: "Tell us the name to print on your account." };
  if (!emailPattern.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // If the project requires email confirmation there is no session yet.
  if (!data.session) {
    return {
      error: null,
      message: "Almost there — confirm your email address to finish creating the account.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next && next.startsWith("/") ? next : role === "author" ? "/studio" : "/library");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailPattern.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/account/password`,
  });

  if (error) return { error: error.message };
  return { error: null, message: "If that address has an account, a reset link is on its way." };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { error: null, message: "Password updated." };
}

export async function becomeAuthorAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=/account");

  const { error } = await supabase
    .from("ink_profiles")
    .update({ role: "author" })
    .eq("id", user.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/studio");
}
