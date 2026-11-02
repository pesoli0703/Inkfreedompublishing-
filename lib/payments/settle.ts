import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/payments/flutterwave";
import { reconcilePayment } from "@/lib/payments/logic";

/**
 * The single settlement path shared by the redirect verifier, the webhook and
 * the reconciliation cron. Nothing here trusts the caller:
 *
 *  1. the payment row decides what was owed (amount and currency);
 *  2. the transaction is re-read from Flutterwave;
 *  3. amount, currency and status are reconciled;
 *  4. only then is `settle_payment` called, and that function is idempotent.
 */

export type SettleOutcome =
  | "settled"
  | "duplicate"
  | "failed"
  | "mismatch"
  | "not_found"
  | "unverifiable"
  | "error";

export type SettleResult = {
  outcome: SettleOutcome;
  paymentId?: string;
  orderId?: string;
  orderNumber?: string;
  message?: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  status: string;
  amount_minor: number | string;
  currency: string;
  provider_tx_ref: string;
  orders: { order_number: string } | { order_number: string }[] | null;
};

const orderNumberOf = (row: PaymentRow) => {
  const joined = Array.isArray(row.orders) ? row.orders[0] : row.orders;
  return joined?.order_number ?? "";
};

export async function settlePaymentById(input: {
  paymentId: string;
  source: "webhook" | "server_lookup" | "reconciliation";
  transactionId?: string | null;
}): Promise<SettleResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payments")
    .select("id, order_id, status, amount_minor, currency, provider_tx_ref, orders(order_number)")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (error) return { outcome: "error", message: error.message };
  if (!data) return { outcome: "not_found", message: "Unknown payment." };

  const payment = data as unknown as PaymentRow;
  const base = {
    paymentId: payment.id,
    orderId: payment.order_id,
    orderNumber: orderNumberOf(payment),
  };

  if (payment.status === "succeeded") return { ...base, outcome: "duplicate" };
  if (payment.status === "refunded" || payment.status === "partially_refunded") {
    return { ...base, outcome: "duplicate", message: "This payment has already been refunded." };
  }

  let verification;
  try {
    verification = await verifyTransaction({
      transactionId: input.transactionId ?? null,
      txRef: payment.provider_tx_ref,
    });
  } catch (caught) {
    return {
      ...base,
      outcome: "unverifiable",
      message: caught instanceof Error ? caught.message : "Verification failed.",
    };
  }

  if (!verification.found) {
    return { ...base, outcome: "unverifiable", message: "Flutterwave has no record of this transaction yet." };
  }

  const verified = verification.transaction;
  const expected = {
    amountMinor: BigInt(payment.amount_minor),
    currency: payment.currency,
  };
  const reconciled = reconcilePayment(expected, verified);

  if (reconciled.outcome === "unknown") {
    return { ...base, outcome: "unverifiable", message: reconciled.message };
  }

  const { data: settlement, error: settleError } = await admin.rpc("settle_payment", {
    p_payment_id: payment.id,
    p_provider_transaction_id: verified.providerTransactionId,
    p_verified_amount_minor: verified.amountMinor === null ? 0 : Number(verified.amountMinor),
    p_verified_currency: verified.currency || expected.currency,
    p_provider_status: verified.providerStatus,
    p_source: input.source,
    p_channel: verified.channel,
    p_gateway_fee_minor: verified.feeMinor === null ? null : Number(verified.feeMinor),
    p_raw: verification.raw as Record<string, unknown>,
  });

  if (settleError) return { ...base, outcome: "error", message: settleError.message };

  if (settlement === "settled") return { ...base, outcome: "settled" };
  if (settlement === "duplicate") return { ...base, outcome: "duplicate" };

  // The database refused to settle. Only a wrong amount or currency is
  // escalated for review; a genuinely unsuccessful transaction is just a
  // failure, and the customer can retry the same order.
  const mismatch = reconciled.outcome === "amount_mismatch" || reconciled.outcome === "currency_mismatch";
  return {
    ...base,
    outcome: mismatch ? "mismatch" : "failed",
    message: reconciled.outcome === "ok" ? "The payment was not successful." : reconciled.message,
  };
}

export async function settleByProviderRef(input: {
  txRef?: string | null;
  transactionId?: string | null;
  source: "webhook" | "server_lookup" | "reconciliation";
}): Promise<SettleResult> {
  if (!input.txRef && !input.transactionId) {
    return { outcome: "not_found", message: "No reference supplied." };
  }

  const admin = createAdminClient();

  let query = admin.from("payments").select("id").limit(1);
  if (input.txRef) query = query.eq("provider_tx_ref", input.txRef);
  else query = query.eq("provider_transaction_id", String(input.transactionId));

  const { data, error } = await query.maybeSingle();
  if (error) return { outcome: "error", message: error.message };
  if (!data) return { outcome: "not_found", message: "Unknown payment reference." };

  return settlePaymentById({
    paymentId: data.id as string,
    source: input.source,
    transactionId: input.transactionId ?? null,
  });
}
