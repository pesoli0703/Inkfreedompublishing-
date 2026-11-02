import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { settleByProviderRef } from "@/lib/payments/settle";
import { flutterwaveConfigured } from "@/lib/payments/flutterwave";

/**
 * Where the gateway sends the browser after checkout. A redirect is never proof
 * of payment: we look the transaction up on the server before granting anything.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const orderId = url.searchParams.get("order");
  const status = url.searchParams.get("status");
  const txRef = url.searchParams.get("tx_ref");

  if (!flutterwaveConfigured() || !txRef) {
    return NextResponse.redirect(`${origin}/dashboard/orders?payment=unverified`);
  }

  if (status && status !== "successful") {
    return NextResponse.redirect(`${origin}/dashboard/orders?payment=cancelled`);
  }

  const result = await settleByProviderRef(txRef);

  if (result.outcome === "settled" || result.outcome === "duplicate") {
    return NextResponse.redirect(
      `${origin}/dashboard/library?payment=confirmed&order=${encodeURIComponent(result.orderNumber)}`,
    );
  }

  if (result.outcome === "failed") {
    return NextResponse.redirect(`${origin}/dashboard/orders?payment=failed`);
  }

  // Could not verify: send them to their orders page with an honest message
  // rather than a success screen.
  void orderId;
  return NextResponse.redirect(`${origin}/dashboard/orders?payment=unverified`);
}
