import { NextResponse } from "next/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Refreshes the daily FX table.
 *
 * Rates are only ever written from a provider response that parses cleanly.
 * If the provider is not configured, fails, or returns a rate that is not a
 * positive number, nothing is written: the previous rate simply ages out of the
 * seven-day window and conversions stop rather than using a fabricated rate.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  const providerUrl = process.env.FX_PROVIDER_URL;
  if (!providerUrl) {
    return NextResponse.json(
      {
        status: "skipped",
        message:
          "FX_PROVIDER_URL is not set. No rates were written and conversions remain unavailable for currencies without an override.",
      },
      { status: 200 },
    );
  }

  let payload: unknown;
  try {
    const response = await fetch(providerUrl, {
      headers: process.env.FX_PROVIDER_API_KEY
        ? { Authorization: `Bearer ${process.env.FX_PROVIDER_API_KEY}` }
        : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    payload = await response.json();
  } catch (caught) {
    return NextResponse.json(
      {
        status: "failed",
        message: caught instanceof Error ? caught.message : "Fetch failed",
      },
      { status: 502 },
    );
  }

  // Accepted shape: { base: "NGN", rates: { USD: 0.00065, GBP: ... } }
  const parsed = payload as { base?: string; rates?: Record<string, number> } | null;
  const base = (parsed?.base ?? "NGN").toUpperCase();
  const rates = parsed?.rates ?? {};

  const admin = createAdminClient();
  const { data: enabled } = await admin
    .from("currencies")
    .select("code")
    .eq("is_enabled", true);

  const wanted = new Set((enabled ?? []).map((row) => String(row.code)));
  const written: { quote: string; rate: number }[] = [];

  for (const [quoteRaw, rate] of Object.entries(rates)) {
    const quote = quoteRaw.toUpperCase();
    if (!wanted.has(quote) || quote === base) continue;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    const { error } = await admin.from("fx_rates").insert({
      base_code: base,
      quote_code: quote,
      rate,
      source: `provider:${new URL(providerUrl).hostname}`,
    });
    if (!error) written.push({ quote, rate });
  }

  return NextResponse.json({ status: "ok", base, written });
}
