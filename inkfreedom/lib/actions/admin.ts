"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function refreshStore() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/titles");
  revalidatePath("/books");
  revalidatePath("/");
}

export async function approveBookAction(formData: FormData) {
  await requireAdmin();
  const bookId = String(formData.get("bookId") ?? "");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ink_books")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", bookId);

  refreshStore();
  redirect("/admin/moderation?approved=1");
}

export async function rejectBookAction(formData: FormData) {
  await requireAdmin();
  const bookId = String(formData.get("bookId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ink_books")
    .update({
      status: "rejected",
      review_note: note || "The editor asked for changes before this listing can go live.",
    })
    .eq("id", bookId);

  refreshStore();
  redirect("/admin/moderation?rejected=1");
}

export async function unpublishBookAction(formData: FormData) {
  await requireAdmin();
  const bookId = String(formData.get("bookId") ?? "");
  const back = String(formData.get("back") ?? "/admin/titles");

  const supabase = await createSupabaseServerClient();
  await supabase.from("ink_books").update({ status: "draft" }).eq("id", bookId);

  refreshStore();
  redirect(back);
}

export async function publishBookAction(formData: FormData) {
  await requireAdmin();
  const bookId = String(formData.get("bookId") ?? "");
  const back = String(formData.get("back") ?? "/admin/titles");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ink_books")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", bookId);

  refreshStore();
  redirect(back);
}

export async function setAuthorStatusAction(formData: FormData) {
  await requireAdmin();
  const authorId = String(formData.get("authorId") ?? "");
  const status = String(formData.get("status") ?? "active") === "suspended" ? "suspended" : "active";

  const supabase = await createSupabaseServerClient();
  await supabase.from("ink_authors").update({ status }).eq("id", authorId);

  revalidatePath("/admin/authors");
  revalidatePath("/authors");
  redirect("/admin/authors");
}

export async function setRoleAction(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const role = String(formData.get("role") ?? "reader");
  if (!["reader", "author", "admin"].includes(role)) redirect("/admin/readers");

  // The profile guard trigger allows this because the caller is an admin.
  const supabase = await createSupabaseServerClient();
  await supabase.from("ink_profiles").update({ role }).eq("id", profileId);

  revalidatePath("/admin/readers");
  redirect("/admin/readers");
}

export async function resolvePayoutAction(formData: FormData) {
  await requireAdmin();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "approved");

  if (!["approved", "paid", "rejected"].includes(status)) redirect("/admin/payouts");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ink_payouts")
    .update({
      status: status as "approved" | "paid" | "rejected",
      resolved_at: status === "paid" || status === "rejected" ? new Date().toISOString() : null,
    })
    .eq("id", payoutId);

  revalidatePath("/admin/payouts");
  revalidatePath("/studio/earnings");
  redirect("/admin/payouts?saved=1");
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const commission = Number(String(formData.get("commission") ?? "10"));
  const checkoutMode = String(formData.get("checkout_mode") ?? "simulated");

  if (!Number.isFinite(commission) || commission < 0 || commission > 50) {
    redirect("/admin/settings?error=commission");
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ink_settings")
    .update({
      value: {
        commission_percent: commission,
        currency: "NGN",
        checkout_mode: checkoutMode,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("key", "store");

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
