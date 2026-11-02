import { NextResponse } from "next/server";
import { flutterwaveConfigured } from "@/lib/payments/flutterwave";
import { settleByProviderRef } from "@/lib/payments/settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Flutterwave sends the browser after checkout.
 *
 * A redirect is never proof of payment: this handler asks the gateway for the
 * transaction and only then lets the database settle it. Every outcome ends on
 * the /checkout/return page with an explicit state, so the customer is never
 * shown a success screen we cannot back up.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const txRef = url.searchParams.get("tx_ref");
  const transactionId = url.searchParams.get("transaction_id");
  const orderId = url.searchParams.get("order");
  const gatewayStatus = (url.searchParams.get("status") ?? "").toLowerCase();

  const back = (state: string, extra: Record<string, string> = {}) => {
    const target = new URL("/checkout/return", origin);
    target.searchParams.set("state", state);
    if (orderId) target.searchParams.set("order", orderId);
    if (txRef) target.searchParams.set("ref", txRef);
    for (const [key, value] of Object.entries(extra)) target.searchParams.set(key, value);
    return NextResponse.redirect(target);
  };

  if (!flutterwaveConfigured()) return back("unconfigured");

  // The gateway forwards its own status; a cancelled or failed checkout needs no
  // server lookup, and we never settle from the query string alone.
  if (!transactionId && ["cancelled", "failed", "user_cancelled"].includes(gatewayStatus)) {
    return back("cancelled");
  }

  if (!txRef && !transactionId) return back("unverified");

  const result = await settleByProviderRef({
    txRef,
    transactionId,
    source: "server_lookup",
  });

  switch (result.outcome) {
    case "settled":
      return back("confirmed", { number: result.orderNumber ?? "" });
    case "duplicate":
      return back("confirmed", { number: result.orderNumber ?? "" });
    case "failed":
      return back("failed");
    case "mismatch":
      return back("mismatch");
    case "not_found":
    case "unverifiable":
      // Delayed webhooks and slow gateways are normal; the reconciliation job
      // will settle the order if the money does arrive.
      return back("pending");
    default:
      return back("unverified");
  }
}
