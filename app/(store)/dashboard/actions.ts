"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export type ActionState = { ok: boolean; message: string } | null;

function failure(error: unknown): ActionState {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Something went wrong.";
  return { ok: false, message };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const patch = {
    full_name: String(formData.get("full_name") ?? "").trim() || null,
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    country_code: String(formData.get("country_code") ?? "").trim().toUpperCase().slice(0, 2) || null,
    preferred_currency: String(formData.get("preferred_currency") ?? "NGN").slice(0, 3),
    marketing_opt_in: formData.get("marketing_opt_in") === "on",
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", viewer.id);
  if (error) return failure(error);

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Profile saved." };
}

export async function toggleWishlistAction(bookId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("id", existing.id);
  } else {
    await supabase.from("wishlist_items").insert({ reader_id: viewer.id, book_id: bookId });
  }
  revalidatePath("/dashboard/wishlist");
}

export async function createTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const { error } = await supabase.rpc("create_support_ticket", {
    p_subject: String(formData.get("subject") ?? ""),
    p_category: String(formData.get("category") ?? "general"),
    p_body: String(formData.get("body") ?? ""),
    p_order_id: null,
  });
  if (error) return failure(error);

  revalidatePath("/dashboard/support");
  return { ok: true, message: "Ticket opened. Our team will reply here." };
}

export async function replyTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const ticketId = String(formData.get("ticket_id") ?? "");
  const { error } = await supabase.rpc("support_reply", {
    p_ticket_id: ticketId,
    p_body: String(formData.get("body") ?? ""),
  });
  if (error) return failure(error);
  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/admin/support/${ticketId}`);
  return { ok: true, message: "Reply sent." };
}

export async function markNotificationsReadAction() {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  revalidatePath("/dashboard");
}
