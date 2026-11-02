import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckout, flutterwaveConfigured } from "@/lib/payments/flutterwave";

/**
 * Opens a payment attempt for an order the caller owns and asks the gateway for
 * a hosted checkout link. The amount always comes from the stored order.
 */
export async function POST(request: Request) {
  if (!flutterwaveConfigured()) {
    return NextResponse.json(
      { error: "The payment gateway is not configured on this deployment." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Accounts are not connected." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { orderId?: string } | null;
  if (!body?.orderId) {
    return NextResponse.json({ error: "An order is required." }, { status: 400 });
  }

  const { data: paymentRows, error } = await supabase.rpc("open_payment", {
    p_order_id: body.orderId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payment = Array.isArray(paymentRows) ? paymentRows[0] : paymentRows;
  if (!payment) {
    return NextResponse.json({ error: "Could not open a payment." }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", body.orderId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const origin = new URL(request.url).origin;

  try {
    const { link } = await createCheckout({
      txRef: payment.o_provider_tx_ref,
      amountMinor: BigInt(payment.o_amount_minor),
      currency: payment.o_currency,
      customerEmail: user.email ?? "",
      customerName: profile?.full_name ?? null,
      redirectUrl: `${origin}/api/payments/verify?order=${body.orderId}`,
      title: `INKFREEDOMPUBLISHING — ${order?.order_number ?? "order"}`,
    });
    return NextResponse.json({ link });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Checkout could not be opened." },
      { status: 502 },
    );
  }
}
