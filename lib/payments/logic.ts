/**
 * Pure payment rules, deliberately free of I/O so they can be unit tested.
 * Everything here is server-side only; none of it reads a secret.
 */

/** Currencies the platform is willing to bill in, before merchant enablement. */
export const GATEWAY_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type GatewayCurrency = (typeof GATEWAY_CURRENCIES)[number];

export type MinorResult =
  | { ok: true; minor: bigint }
  | { ok: false; reason: string };

/**
 * Converts a gateway amount (major units, sometimes a string) to integer minor
 * units without going through binary floating point.
 */
export function majorToMinor(amount: unknown, minorUnit = 2): MinorResult {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount)) return { ok: false, reason: "amount is not a finite number" };
    amount = amount.toFixed(minorUnit);
  }
  if (typeof amount !== "string") return { ok: false, reason: "amount is missing" };

  const cleaned = amount.trim();
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(cleaned);
  if (!match) return { ok: false, reason: `amount ${cleaned || "(empty)"} is not a decimal number` };

  const [, whole, fraction = ""] = match;
  const scaled = (fraction + "0".repeat(minorUnit + 1)).slice(0, minorUnit + 1);

  // Reject amounts with more precision than the currency allows (e.g. 10.005 NGN).
  if (scaled.slice(minorUnit) !== "0") {
    return { ok: false, reason: `amount ${cleaned} has more precision than ${minorUnit} decimals` };
  }

  return { ok: true, minor: BigInt(whole) * BigInt(10) ** BigInt(minorUnit) + BigInt(scaled.slice(0, minorUnit)) };
}

export type CurrencyRow = {
  code: string;
  is_enabled: boolean;
  provider_supported: boolean;
  min_amount_minor: number | string | null;
  max_amount_minor: number | string | null;
};

export type CurrencyCheck =
  | { ok: true }
  | { ok: false; code: "unknown_currency" | "disabled_currency" | "merchant_unsupported" | "amount_out_of_range"; message: string };

export function checkCurrency(
  currency: string,
  amountMinor: bigint,
  row: CurrencyRow | null | undefined,
): CurrencyCheck {
  const code = (currency ?? "").toUpperCase();
  if (!GATEWAY_CURRENCIES.includes(code as GatewayCurrency)) {
    return {
      ok: false,
      code: "unknown_currency",
      message: `We cannot take payment in ${code || "that currency"}.`,
    };
  }
  if (!row) {
    return { ok: false, code: "unknown_currency", message: `${code} is not configured on this platform.` };
  }
  if (!row.is_enabled) {
    return { ok: false, code: "disabled_currency", message: `Payment in ${code} is not enabled on this platform.` };
  }
  if (!row.provider_supported) {
    return {
      ok: false,
      code: "merchant_unsupported",
      message: `${code} is not enabled for this Flutterwave merchant account yet, so we cannot accept it.`,
    };
  }
  const min = row.min_amount_minor == null ? null : BigInt(row.min_amount_minor);
  const max = row.max_amount_minor == null ? null : BigInt(row.max_amount_minor);
  if (min !== null && amountMinor < min) {
    return { ok: false, code: "amount_out_of_range", message: `The minimum ${code} order is ${min} minor units.` };
  }
  if (max !== null && amountMinor > max) {
    return { ok: false, code: "amount_out_of_range", message: `The maximum ${code} order is ${max} minor units.` };
  }
  return { ok: true };
}

export type VerifiedPayment = {
  status: "successful" | "failed" | "pending" | "unknown";
  amountMinor: bigint | null;
  currency: string;
  providerTransactionId: string | null;
  providerStatus: string;
  feeMinor: bigint | null;
  channel: string | null;
  customerEmail: string | null;
  txRef: string | null;
};

export type ReconcileOutcome =
  | { outcome: "ok" }
  | { outcome: "not_successful"; message: string }
  | { outcome: "unknown"; message: string }
  | { outcome: "amount_mismatch"; message: string }
  | { outcome: "currency_mismatch"; message: string };

/**
 * The single gate that decides whether a verified transaction may settle.
 * Deliberately strict: the catalogue price is fixed, so an overpayment is a
 * mismatch to resolve with support rather than a silent credit.
 */
export function reconcilePayment(
  expected: { amountMinor: bigint; currency: string },
  verified: VerifiedPayment,
): ReconcileOutcome {
  if (verified.status === "unknown") {
    return { outcome: "unknown", message: "The gateway did not return a usable status." };
  }
  if (verified.status === "pending") {
    return { outcome: "not_successful", message: "The payment is still pending at the gateway." };
  }
  if (verified.status !== "successful") {
    return { outcome: "not_successful", message: "The gateway did not report this payment as successful." };
  }
  if (verified.amountMinor === null) {
    return { outcome: "unknown", message: "The gateway did not return an amount to verify." };
  }
  const verifiedCurrency = (verified.currency || "").toUpperCase();
  if (verifiedCurrency !== expected.currency.toUpperCase()) {
    return {
      outcome: "currency_mismatch",
      message: `Paid in ${verifiedCurrency || "an unknown currency"} but the order is in ${expected.currency}.`,
    };
  }
  if (verified.amountMinor !== expected.amountMinor) {
    return {
      outcome: "amount_mismatch",
      message: `Paid ${verified.amountMinor} against an order for ${expected.amountMinor} (minor units).`,
    };
  }
  return { outcome: "ok" };
}

/** 90/10 split, integer arithmetic, no floating point. */
export function splitCommission(amountMinor: bigint, basisPoints: number) {
  const bps = BigInt(Math.round(basisPoints));
  const platform = (amountMinor * bps + 5000n) / 10000n; // half-up rounding
  return { platformMinor: platform, authorMinor: amountMinor - platform };
}

/** A rate older than this must not be used silently. */
export const MAX_RATE_AGE_HOURS = 36;

export function rateIsFresh(fetchedAt: string | Date | null | undefined, now = new Date()): boolean {
  if (!fetchedAt) return false;
  const at = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt;
  if (Number.isNaN(at.getTime())) return false;
  const ageMs = now.getTime() - at.getTime();
  return ageMs >= 0 && ageMs <= MAX_RATE_AGE_HOURS * 60 * 60 * 1000;
}
