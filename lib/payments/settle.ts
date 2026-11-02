import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransactionByReference } from "@/lib/payments/flutterwave";

/**
 * The single settlement path used by both the redirect verifier and the webhook.
 * It re-reads the transaction from the gateway (never trusting the caller),
 * matches it against the stored payment row, and lets the database post money
 * and entitlements atomically.
 */
export type SettleResult =
  | { outcome: "settled" | "duplicate" | "failed"; orderId: string; orderNumber: string }
  | { outcome: "not_found" | "unverifiable" | "error"; message: string };

export async function settleByProviderRef(txRef: string): Promise<SettleResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id, status, amount_minor, currency, orders(order_number)")
    .eq("provider_tx_ref", txRef)
    .maybeSingle();

  if (!payment) return { outcome: "not_found", message: "Unknown payment reference." };

  const order = payment.orders as unknown as { order_number: string } | null;
  const orderId = payment.order_id as string;

  if (payment.status === "succeeded") {
    return {
      outcome: "duplicate",
      orderId,
      orderNumber: order?.order_number ?? "",
    };
  }

  let verified;
  try {
    verified = await verifyTransactionByReference(txRef);
  } catch (caught) {
    return {
      outcome: "error",
      message: caught instanceof Error ? caught.message : "Verification failed.",
    };
  }

  if (verified.status === "unknown") {
    return { outcome: "unverifiable", message: "The gateway did not return a usable status." };
  }

  // The database re-checks amount and currency; a mismatch is recorded as a
  // failure and never grants access.
  const { data, error } = await admin.rpc("settle_payment", {
    p_payment_id: payment.id,
    p_provider_transaction_id: verified.providerTransactionId,
    p_verified_amount_minor: Number(verified.amountMinor),
    p_verified_currency: verified.currency,
    p_provider_status: verified.providerStatus,
    p_source: "server_lookup",
    p_channel: verified.channel,
    p_gateway_fee_minor: null,
    p_raw: verified.raw as Record<string, unknown>,
  });

  if (error) return { outcome: "error", message: error.message };

  const outcome = (data as string) === "settled" ? "settled" : (data as string) === "duplicate" ? "duplicate" : "failed";
  return { outcome, orderId, orderNumber: order?.order_number ?? "" };
}
