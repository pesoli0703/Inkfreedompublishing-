import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { settleByProviderRef } from "@/lib/payments/settle";
import { verifyWebhookSignature, webhookSignatureConfigured } from "@/lib/payments/flutterwave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flutterwave webhook.
 * Docs: https://developer.flutterwave.com/docs/webhooks
 *
 * - The `verif-hash` header must match FLUTTERWAVE_WEBHOOK_SECRET_HASH. The
 *   comparison is constant-time; a mismatch is recorded and rejected with 401.
 * - Every attempt is stored in payment_events, deduplicated by Flutterwave's
 *   transaction id, so retries and duplicate deliveries cannot settle twice.
 * - The payload is treated as a hint only: the transaction is re-read from the
 *   API before settlement, so a forged body cannot grant access even if the
 *   secret hash were ever leaked.
 * - Flutterwave retries on anything other than 200, so a transient gateway
 *   failure returns 500 and the retry is safe.
 */
export async function POST(request: Request) {
  if (!webhookSignatureConfigured() || !serviceRoleConfigured()) {
    return NextResponse.json({ status: "webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = verifyWebhookSignature(rawBody, request.headers);
  const admin = createAdminClient();

  if (!signature.valid) {
    await admin.from("payment_events").insert({
      provider: "flutterwave",
      provider_event_id: `invalid:${createHash("sha256").update(rawBody).digest("hex").slice(0, 40)}`,
      event_type: "signature.invalid",
      signature_valid: false,
      payload: { reason: signature.reason },
      received_at: new Date().toISOString(),
      processing_status: "rejected",
      error: signature.reason ?? "invalid signature",
    });
    return NextResponse.json({ status: "invalid signature" }, { status: 401 });
  }

  let payload: {
    id?: number | string;
    event?: string;
    "event.type"?: string;
    data?: { id?: number | string; tx_ref?: string; status?: string };
  } | null = null;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "malformed body" }, { status: 400 });
  }

  const data = payload?.data ?? null;
  const eventType = payload?.event ?? payload?.["event.type"] ?? "unknown";
  const transactionId = data?.id != null ? String(data.id) : null;
  const eventId =
    transactionId ??
    payload?.id != null
      ? String(transactionId ?? payload?.id)
      : createHash("sha256").update(rawBody).digest("hex").slice(0, 40);

  const { error: insertError } = await admin.from("payment_events").insert({
    provider: "flutterwave",
    provider_event_id: eventId,
    event_type: eventType,
    signature_valid: true,
    payload: payload as Record<string, unknown>,
    received_at: new Date().toISOString(),
    processing_status: "received",
  });

  if (insertError) {
    // 23505 = unique violation: this delivery (or its retry) is already known.
    if (insertError.code === "23505") {
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    }
    return NextResponse.json({ status: "could not record event" }, { status: 500 });
  }

  const finish = async (status: string, detail?: string) => {
    await admin
      .from("payment_events")
      .update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        error: detail ?? null,
      })
      .eq("provider", "flutterwave")
      .eq("provider_event_id", eventId);
  };

  if (!data?.tx_ref) {
    await finish("ignored", "event carries no tx_ref");
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const result = await settleByProviderRef({
    txRef: data.tx_ref,
    transactionId,
    source: "webhook",
  });

  switch (result.outcome) {
    case "settled":
      await finish("settled");
      return NextResponse.json({ status: "settled" }, { status: 200 });
    case "duplicate":
      await finish("duplicate");
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    case "failed":
      await finish("failed", result.message);
      return NextResponse.json({ status: "failed" }, { status: 200 });
    case "mismatch":
      await finish("mismatch", result.message);
      return NextResponse.json({ status: "mismatch" }, { status: 200 });
    case "not_found":
      await finish("unknown_reference", result.message);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    case "unverifiable":
    case "error":
    default:
      await finish("retry", result.message);
      return NextResponse.json({ status: "retry" }, { status: 500 });
  }
}
