import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { initiateCheckout, flutterwaveConfigured } from "@/lib/payments/flutterwave";
import { checkCurrency, type CurrencyRow } from "@/lib/payments/logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { orderId?: string };

/**
 * Opens a payment attempt for one of the caller's orders and asks Flutterwave
 * for a hosted checkout link.
 *
 * The browser never supplies an amount or a currency: both come from the stored
 * order, and the currency is checked against the platform's own currency table
 * before the gateway is called. Retries reuse the same order and the same
 * pending payment row, so a customer who abandons checkout does not end up with
 * duplicate orders.
 */
export async function POST(request: Request) {
  if (!flutterwaveConfigured()) {
    return NextResponse.json(
      { error: "Online payment is not configured on this deployment yet." },
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
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.orderId) return NextResponse.json({ error: "An order is required." }, { status: 400 });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, currency, total_minor")
    .eq("id", body.orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (!["draft", "pending_payment", "failed"].includes(String(order.status))) {
    return NextResponse.json({ error: "This order is not payable." }, { status: 409 });
  }

  const { data: currencyRow } = await supabase
    .from("currencies")
    .select("code, is_enabled, provider_supported, min_amount_minor, max_amount_minor")
    .eq("code", String(order.currency))
    .maybeSingle();

  const currencyCheck = checkCurrency(
    String(order.currency),
    BigInt(order.total_minor),
    (currencyRow as CurrencyRow | null) ?? null,
  );
  if (!currencyCheck.ok) {
    return NextResponse.json({ error: currencyCheck.message }, { status: 400 });
  }

  // The database owns the tx reference and the amount. open_payment is
  // idempotent: an existing initiated/pending payment is returned unchanged.
  const { data: paymentRows, error: paymentError } = await supabase.rpc("open_payment", {
    p_order_id: body.orderId,
  });

  if (paymentError) {
    const disabled = /disabled/i.test(paymentError.message);
    return NextResponse.json({ error: paymentError.message }, { status: disabled ? 503 : 400 });
  }

  const payment = Array.isArray(paymentRows) ? paymentRows[0] : paymentRows;
  if (!payment) return NextResponse.json({ error: "Could not open a payment." }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const origin = new URL(request.url).origin;
  const redirectUrl = `${origin}/api/payments/verify?tx_ref=${encodeURIComponent(
    payment.o_provider_tx_ref,
  )}&order=${encodeURIComponent(body.orderId)}`;

  try {
    const { link } = await initiateCheckout({
      txRef: payment.o_provider_tx_ref,
      amountMinor: BigInt(payment.o_amount_minor),
      currency: payment.o_currency,
      customerEmail: user.email ?? "",
      customerName: profile?.full_name ?? null,
      redirectUrl,
      title: "INKFREEDOMPUBLISHING",
      description: `Order ${order.order_number}`,
      meta: { order_id: body.orderId, order_number: order.order_number },
    });

    return NextResponse.json({
      link,
      txRef: payment.o_provider_tx_ref,
      amountMinor: payment.o_amount_minor,
      currency: payment.o_currency,
    });
  } catch (caught) {
    // The payment row stays pending so the customer can retry the same order.
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Checkout could not be opened." },
      { status: 502 },
    );
  }
}
