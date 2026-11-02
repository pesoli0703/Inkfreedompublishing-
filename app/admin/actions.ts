"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { CATEGORY_SECTIONS } from "@/lib/category-sections";

export type ActionState = { ok: boolean; message: string } | null;

function failure(error: unknown): ActionState {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Something went wrong.";
  return { ok: false, message };
}

async function adminClient() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return null;
  return createServerSupabaseClient();
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function done(message: string, ...paths: string[]): ActionState {
  for (const path of paths) revalidatePath(path);
  return { ok: true, message };
}

export async function decideApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_decide_author_application", {
    p_application_id: text(formData, "application_id"),
    p_decision: text(formData, "decision"),
    p_note: text(formData, "note"),
  });
  if (error) return failure(error);
  return done("Decision recorded.", "/admin/applications", "/admin");
}

/**
 * Approve, reject, or send a book back for changes.
 *
 * Approving publishes in the same action when asked: the decision is recorded
 * by `admin_moderate_book`, then `admin_set_publication` lists it. Both are the
 * existing database functions — this only saves the administrator a second
 * click and makes "approved means on sale" true, as authors expect.
 */
export async function moderateBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };

  const bookId = text(formData, "book_id");
  const decision = text(formData, "decision");
  if (!bookId) return { ok: false, message: "No book selected." };

  const { error } = await supabase.rpc("admin_moderate_book", {
    p_book_id: bookId,
    p_decision: decision,
    p_note: text(formData, "note"),
  });
  if (error) return failure(error);

  const publish = decision === "approved" && text(formData, "publish") !== "false";
  if (publish) {
    const { error: publishError } = await supabase.rpc("admin_set_publication", {
      p_book_id: bookId,
      p_publish: true,
    });
    if (publishError) {
      return {
        ok: false,
        message: `Approved, but could not publish: ${publishError.message}`,
      };
    }
    revalidatePath("/books");
    revalidatePath("/");
    revalidatePath("/categories");
    return done("Approved and published to the bookstore.", "/admin/books", "/admin");
  }

  return done("Moderation recorded.", "/admin/books", "/admin");
}

export async function setPublicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_publication", {
    p_book_id: text(formData, "book_id"),
    p_publish: text(formData, "publish") === "true",
  });
  if (error) return failure(error);
  return done("Publication state updated.", "/admin/books", "/admin");
}

export async function setFeaturedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const kind = text(formData, "kind");
  const featured = text(formData, "featured") === "true";
  if (kind === "book") {
    const { error } = await supabase.rpc("admin_set_featured", {
      p_book_id: text(formData, "id"),
      p_featured: featured,
      p_rank: Number(formData.get("rank")) || null,
    });
    if (error) return failure(error);
  } else {
    const { error } = await supabase.rpc("admin_set_featured_author", {
      p_author_id: text(formData, "id"),
      p_featured: featured,
    });
    if (error) return failure(error);
  }
  return done("Feature updated.", "/admin/categories", "/admin");
}

export async function transitionWithdrawalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_transition_withdrawal", {
    p_withdrawal_id: text(formData, "withdrawal_id"),
    p_to: text(formData, "to"),
    p_note: text(formData, "note") || null,
  });
  if (error) return failure(error);
  return done("Withdrawal updated.", "/admin/withdrawals", "/admin");
}

export async function recordPayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const amount = Number(formData.get("amount") ?? 0);
  const { error } = await supabase.rpc("admin_record_payout", {
    p_withdrawal_id: text(formData, "withdrawal_id"),
    p_method: text(formData, "method"),
    p_reference: text(formData, "reference"),
    p_amount_minor: Math.round(amount * 100),
  });
  if (error) return failure(error);
  return done("Payout recorded.", "/admin/withdrawals", "/admin");
}

export async function recordRefundAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const amount = Number(formData.get("amount") ?? 0);
  const { error } = await supabase.rpc("admin_record_refund", {
    p_order_id: text(formData, "order_id"),
    p_amount_minor: Math.round(amount * 100),
    p_reason: text(formData, "reason"),
    p_provider_refund_id: text(formData, "provider_refund_id") || null,
  });
  if (error) return failure(error);
  return done("Refund recorded and the ledger reversed.", "/admin/refunds", "/admin/orders", "/admin");
}

export async function setUserRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: text(formData, "user_id"),
    p_role: text(formData, "role"),
  });
  if (error) return failure(error);
  return done("Role updated.", "/admin/users");
}

export async function setUserStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: text(formData, "user_id"),
    p_status: text(formData, "status"),
  });
  if (error) return failure(error);
  return done("Account status updated.", "/admin/users");
}

export async function setReviewStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_review_status", {
    p_review_id: text(formData, "review_id"),
    p_status: text(formData, "status"),
  });
  if (error) return failure(error);
  return done("Review updated.", "/admin/reviews");
}

export async function resolveCopyrightAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_resolve_copyright", {
    p_report_id: text(formData, "report_id"),
    p_status: text(formData, "status"),
    p_resolution: text(formData, "resolution"),
  });
  if (error) return failure(error);
  return done("Complaint updated.", "/admin/copyright");
}

export async function setTicketStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_ticket_status", {
    p_ticket_id: text(formData, "ticket_id"),
    p_status: text(formData, "status"),
  });
  if (error) return failure(error);
  return done("Ticket updated.", "/admin/support");
}

export async function upsertCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const type = text(formData, "type");
  const value = Number(formData.get("value") ?? 0);
  const { error } = await supabase.rpc("admin_upsert_coupon", {
    p_code: text(formData, "code"),
    p_type: type,
    p_value: Math.round(value * 100),
    p_currency: text(formData, "currency") || "NGN",
    p_min_order_minor: Math.round(Number(formData.get("min_order") ?? 0) * 100),
    p_max_redemptions: formData.get("max_redemptions") ? Number(formData.get("max_redemptions")) : null,
    p_starts_at: text(formData, "starts_at") || new Date().toISOString(),
    p_ends_at: text(formData, "ends_at") || null,
    p_is_active: formData.get("is_active") === "on",
    p_description: text(formData, "description") || null,
  });
  if (error) return failure(error);
  return done("Coupon saved.", "/admin/coupons");
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const patch: Record<string, unknown> = {};
  const feeBps = formData.get("platform_fee_bps");
  if (feeBps !== null && String(feeBps) !== "") patch.platform_fee_bps = Number(feeBps);
  const minimum = formData.get("payout_minimum");
  if (minimum !== null && String(minimum) !== "") patch.payout_minimum_minor = Math.round(Number(minimum) * 100);
  for (const key of ["reserve_hold_days", "refund_window_days", "download_url_ttl_seconds"]) {
    const value = formData.get(key);
    if (value !== null && String(value) !== "") patch[key] = Number(value);
  }
  for (const key of ["payments_mode", "price_rounding", "support_email"]) {
    const value = text(formData, key);
    if (value) patch[key] = value;
  }

  const { error } = await supabase.rpc("admin_update_settings", { p_patch: patch });
  if (error) return failure(error);
  return done("Settings saved.", "/admin/settings");
}

export async function upsertFxAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_upsert_fx", {
    p_base: text(formData, "base").toUpperCase(),
    p_quote: text(formData, "quote").toUpperCase(),
    p_rate: Number(formData.get("rate")),
    p_source: text(formData, "source") || "manual_admin",
  });
  if (error) return failure(error);
  return done("Rate recorded.", "/admin/pricing");
}

export async function setPriceOverrideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };
  const { error } = await supabase.rpc("admin_set_price_override", {
    p_book_format_id: text(formData, "book_format_id"),
    p_currency: text(formData, "currency").toUpperCase(),
    p_price_minor: Math.round(Number(formData.get("price") ?? 0) * 100),
    p_reason: text(formData, "reason"),
  });
  if (error) return failure(error);
  return done("Price override saved.", "/admin/pricing");
}

export async function upsertCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { ok: false, message: "Administrator session required." };

  const id = text(formData, "id");
  const section = text(formData, "section") || "non-fiction";
  const patch = {
    name: text(formData, "name"),
    blurb: text(formData, "blurb") || null,
    note: text(formData, "note") || null,
    section,
    is_active: formData.get("is_active") === "on",
    // The column is sort_order; the old form posted display_order, which meant
    // every edit silently failed the insert/update.
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  if (!patch.name) return { ok: false, message: "A category name is required." };
  if (!CATEGORY_SECTIONS.some((entry) => entry.slug === section)) {
    return { ok: false, message: "Choose one of the published sections." };
  }

  const { error } = id
    ? await supabase.from("categories").update(patch).eq("id", id)
    : await supabase.from("categories").insert({
        ...patch,
        slug: text(formData, "slug") || patch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });
  if (error) return failure(error);
  return done("Category saved.", "/admin/categories");
}
