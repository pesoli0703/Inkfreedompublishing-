import { NextResponse } from "next/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { settleByProviderRef } from "@/lib/payments/settle";
import { webhookHashConfigured } from "@/lib/payments/flutterwave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flutterwave webhook.
 *
 * - The `verif-hash` header must equal FLUTTERWAVE_SECRET_HASH, otherwise the
 *   request is rejected before anything is read.
 * - The event is recorded once; a repeat delivery is acknowledged and ignored,
 *   so retries are safe.
 * - The transaction is re-verified with the gateway before settlement.
 */
export async function POST(request: Request) {
  if (!webhookHashConfigured() || !serviceRoleConfigured()) {
    return NextResponse.json({ status: "webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("verif-hash");
  if (!signature || signature !== process.env.FLUTTERWAVE_SECRET_HASH) {
    return NextResponse.json({ status: "invalid signature" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: number | string;
        event?: string;
        data?: { tx_ref?: string; status?: string; id?: number | string };
      }
    | null;

  if (!payload?.data?.tx_ref) {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const admin = createAdminClient();
  const eventId = String(payload.id ?? payload.data.id ?? "");

  if (eventId) {
    const { data: existing } = await admin
      .from("payment_events")
      .select("id")
      .eq("provider", "flutterwave")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    }
  }

  const result = await settleByProviderRef(payload.data.tx_ref);

  if (result.outcome === "error") {
    // Returning 500 lets the gateway retry; settlement is idempotent.
    return NextResponse.json({ status: "retry" }, { status: 500 });
  }

  return NextResponse.json({ status: result.outcome }, { status: 200 });
}
