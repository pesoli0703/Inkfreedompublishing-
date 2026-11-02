"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

const COMMISSION_PERCENT = 10;

function reference() {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INK-${stamp}-${random}`;
}

/**
 * Starts a purchase. Creates a pending order, then sends the reader to the
 * checkout screen. Payment capture is simulated until a real processor is
 * connected — the order record is real either way.
 */
export async function startCheckoutAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=/books`);

  const supabase = await createSupabaseServerClient();

  const { data: book } = await supabase
    .from("ink_books")
    .select("id, title, author_id, price_kobo, status")
    .eq("id", bookId)
    .eq("status", "published")
    .maybeSingle();

  if (!book) redirect("/books");

  const { data: owned } = await supabase
    .from("ink_entitlements")
    .select("book_id")
    .eq("reader_id", viewer.user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  if (owned) redirect("/library");

  const { data: order, error } = await supabase
    .from("ink_orders")
    .insert({
      reference: reference(),
      reader_id: viewer.user.id,
      status: "pending",
      subtotal_kobo: book.price_kobo,
      total_kobo: book.price_kobo,
      provider: "simulated",
    })
    .select("id, reference")
    .single();

  if (error || !order) {
    redirect(`/books?error=${encodeURIComponent(error?.message ?? "Could not start checkout")}`);
  }

  const fee = Math.round(book.price_kobo * (COMMISSION_PERCENT / 100));

  await supabase.from("ink_order_items").insert({
    order_id: order.id,
    book_id: book.id,
    author_id: book.author_id,
    title: book.title,
    unit_price_kobo: book.price_kobo,
    platform_fee_kobo: fee,
    author_share_kobo: book.price_kobo - fee,
  });

  redirect(`/checkout/${order.reference}`);
}

/**
 * Completes a simulated payment. Everything happens server-side with the
 * service role: the reader cannot mark their own order paid, and entitlements
 * are only ever granted here.
 */
export async function completeSimulatedPaymentAction(formData: FormData) {
  const orderReference = String(formData.get("reference") ?? "");
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("ink_orders")
    .select("id, reader_id, status, total_kobo, reference")
    .eq("reference", orderReference)
    .maybeSingle();

  if (!order || order.reader_id !== viewer.user.id) redirect("/library");

  if (order.status === "pending") {
    const paidAt = new Date().toISOString();

    await admin
      .from("ink_orders")
      .update({ status: "paid", paid_at: paidAt, provider_reference: `SIM-${orderReference}` })
      .eq("id", order.id);

    const { data: items } = await admin
      .from("ink_order_items")
      .select("id, book_id")
      .eq("order_id", order.id);

    for (const item of items ?? []) {
      await admin
        .from("ink_entitlements")
        .upsert(
          { reader_id: order.reader_id, book_id: item.book_id, order_item_id: item.id },
          { onConflict: "reader_id,book_id" },
        );
    }
  }

  revalidatePath("/library");
  revalidatePath("/studio");
  redirect(`/library?welcome=${order.id}`);
}

export async function toggleWishlistAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/books");
  const viewer = await getViewer();

  if (!viewer) redirect(`/signin?next=${encodeURIComponent(redirectTo)}`);

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("ink_wishlist")
    .select("book_id")
    .eq("reader_id", viewer.user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ink_wishlist")
      .delete()
      .eq("reader_id", viewer.user.id)
      .eq("book_id", bookId);
  } else {
    await supabase
      .from("ink_wishlist")
      .insert({ reader_id: viewer.user.id, book_id: bookId });
  }

  revalidatePath(redirectTo);
  revalidatePath("/wishlist");
}
