import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Item = { bookFormatId: string; quantity?: number };

/**
 * Creates an order. The browser sends only which format and how many; every
 * price, discount and FX decision happens inside `place_order`.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Accounts are not connected." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to check out." }, { status: 401 });
  }

  let body: { currency?: string; items?: Item[]; coupon?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currency = (body.currency ?? "NGN").toUpperCase().slice(0, 3);
  const items = (body.items ?? []).filter((item) => item?.bookFormatId);

  if (items.length === 0) {
    return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("place_order", {
    p_items: items.map((item) => ({
      book_format_id: item.bookFormatId,
      quantity: item.quantity ?? 1,
    })),
    p_currency: currency,
    p_coupon: body.coupon ?? null,
    p_email: user.email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const order = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    orderId: order?.o_order_id,
    orderNumber: order?.o_order_number,
    totalMinor: order?.o_total_minor,
    currency: order?.o_currency,
  });
}
