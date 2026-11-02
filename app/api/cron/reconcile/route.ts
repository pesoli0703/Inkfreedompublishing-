import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { settlePaymentById } from "@/lib/payments/settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const constantTimeEquals = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Reconciliation for payments whose customer never came back.
 *
 * A customer who closes the browser after paying leaves a payment row in
 * `initiated`/`pending`. Every run re-verifies those rows with Flutterwave and
 * settles the ones that actually succeeded. The settlement path is the same one
 * the webhook and the redirect use, so a late webhook and this job cannot both
 * settle the same payment.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !constantTimeEquals(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "Server credentials are not configured." }, { status: 503 });
  }

  const admin = createAdminClient();
  const olderThan = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const newerThan = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await admin
    .from("payments")
    .select("id")
    .in("status", ["initiated", "pending"])
    .lt("created_at", olderThan)
    .gt("created_at", newerThan)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Record<string, number> = {};
  for (const row of stale ?? []) {
    const result = await settlePaymentById({
      paymentId: row.id as string,
      source: "reconciliation",
    });
    summary[result.outcome] = (summary[result.outcome] ?? 0) + 1;
  }

  return NextResponse.json({ status: "ok", checked: stale?.length ?? 0, summary });
}
