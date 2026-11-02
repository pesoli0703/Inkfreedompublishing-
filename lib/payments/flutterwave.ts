import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { GATEWAY_CURRENCIES, majorToMinor, type VerifiedPayment } from "./logic";

/**
 * Flutterwave v3 REST client (standard/hosted checkout).
 * Docs: https://developer.flutterwave.com/docs/flutterwave-standard-1
 *       https://developer.flutterwave.com/docs/transaction-verification
 *       https://developer.flutterwave.com/docs/webhooks
 *
 * The secret key never leaves the server: this module is server-only and is
 * never imported from a client component.
 */

const DEFAULT_BASE_URL = "https://api.flutterwave.com/v3";
const REQUEST_TIMEOUT_MS = 20_000;

export class FlutterwaveError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 502, code = "gateway_error") {
    super(message);
    this.name = "FlutterwaveError";
    this.status = status;
    this.code = code;
  }
}

export function flutterwaveConfig() {
  return {
    secretKey: (process.env.FLUTTERWAVE_SECRET_KEY ?? "").trim(),
    publicKey: (process.env.FLUTTERWAVE_PUBLIC_KEY ?? "").trim(),
    // FLUTTERWAVE_WEBHOOK_SECRET_HASH is the documented name; the older
    // FLUTTERWAVE_SECRET_HASH is still read so existing deployments keep working.
    webhookHash: (
      process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH ??
      process.env.FLUTTERWAVE_SECRET_HASH ??
      ""
    ).trim(),
    baseUrl: (process.env.FLUTTERWAVE_API_BASE ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
  };
}

export const flutterwaveConfigured = () => Boolean(flutterwaveConfig().secretKey);
export const webhookSignatureConfigured = () => Boolean(flutterwaveConfig().webhookHash);

async function call(path: string, init: RequestInit) {
  const { secretKey, baseUrl } = flutterwaveConfig();
  if (!secretKey) throw new FlutterwaveError("Flutterwave is not configured on this deployment.", 503, "not_configured");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (caught) {
    throw new FlutterwaveError(
      caught instanceof Error && caught.name === "TimeoutError"
        ? "Flutterwave did not respond in time."
        : "Could not reach Flutterwave.",
      504,
      "unreachable",
    );
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { response, payload };
}

export type CheckoutInput = {
  txRef: string;
  amountMinor: bigint;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  redirectUrl: string;
  title: string;
  description?: string;
  meta?: Record<string, string | number | null>;
};

/**
 * Creates a fresh hosted-checkout session for one order. The amount is derived
 * from the stored order, never from the browser.
 */
export async function initiateCheckout(input: CheckoutInput): Promise<{ link: string }> {
  const currency = input.currency.toUpperCase();
  if (!GATEWAY_CURRENCIES.includes(currency as (typeof GATEWAY_CURRENCIES)[number])) {
    throw new FlutterwaveError(`Unsupported payment currency: ${currency}.`, 400, "unsupported_currency");
  }
  if (input.amountMinor <= 0n) {
    throw new FlutterwaveError("Refusing to start a payment for a zero amount.", 400, "invalid_amount");
  }
  if (!input.customerEmail) {
    throw new FlutterwaveError("A customer email is required by Flutterwave.", 400, "missing_email");
  }

  const amount = `${input.amountMinor / 100n}.${(input.amountMinor % 100n).toString().padStart(2, "0")}`;

  const { response, payload } = await call("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount,
      currency,
      redirect_url: input.redirectUrl,
      customer: {
        email: input.customerEmail,
        name: input.customerName ?? input.customerEmail,
        ...(input.customerPhone ? { phonenumber: input.customerPhone } : {}),
      },
      customizations: {
        title: input.title,
        description: input.description ?? `Order ${input.txRef}`,
      },
      meta: { tx_ref: input.txRef, ...(input.meta ?? {}) },
    }),
  });

  const data = (payload?.data ?? null) as { link?: string } | null;
  if (!response.ok || payload?.status !== "success" || !data?.link) {
    throw new FlutterwaveError(
      String(payload?.message ?? "Flutterwave did not return a checkout link."),
      502,
      "checkout_failed",
    );
  }
  return { link: data.link };
}

export type VerificationResult = {
  found: boolean;
  transaction: VerifiedPayment;
  raw: unknown;
  httpStatus: number;
};

type RawTransaction = {
  id?: number | string;
  tx_ref?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  charged_amount?: number | string;
  app_fee?: number | string;
  fee?: number | string;
  payment_type?: string;
  customer?: { email?: string };
};

function normalise(data: RawTransaction | null): VerifiedPayment {
  if (!data) {
    return {
      status: "unknown",
      amountMinor: null,
      currency: "",
      providerTransactionId: null,
      providerStatus: "not_found",
      feeMinor: null,
      channel: null,
      customerEmail: null,
      txRef: null,
    };
  }
  const providerStatus = String(data.status ?? "").toLowerCase();
  const amount = majorToMinor(data.amount);
  const fee = majorToMinor(data.app_fee ?? data.fee ?? null);
  const status: VerifiedPayment["status"] =
    providerStatus === "successful" || providerStatus === "success" || providerStatus === "completed"
      ? "successful"
      : providerStatus === "pending" || providerStatus === "new" || providerStatus === "processing"
        ? "pending"
        : providerStatus === ""
          ? "unknown"
          : "failed";

  return {
    status,
    amountMinor: amount.ok ? amount.minor : null,
    currency: String(data.currency ?? "").toUpperCase(),
    providerTransactionId: data.id != null ? String(data.id) : null,
    providerStatus,
    feeMinor: fee.ok ? fee.minor : null,
    channel: data.payment_type ?? null,
    customerEmail: data.customer?.email ?? null,
    txRef: data.tx_ref ?? null,
  };
}

/**
 * Server-side lookup. Verification by transaction id is the documented flow;
 * reference lookup is used when the browser only knows its own tx_ref.
 */
export async function verifyTransaction(input: {
  transactionId?: string | number | null;
  txRef?: string | null;
}): Promise<VerificationResult> {
  const path =
    input.transactionId != null && String(input.transactionId).length > 0
      ? `/transactions/${encodeURIComponent(String(input.transactionId))}/verify`
      : input.txRef
        ? `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(input.txRef)}`
        : null;

  if (!path) throw new FlutterwaveError("Nothing to verify.", 400, "invalid_request");

  const { response, payload } = await call(path, { method: "GET" });
  const data = (payload?.data ?? null) as RawTransaction | null;
  const found = Boolean(response.ok && payload?.status === "success" && data);

  return { found, transaction: normalise(found ? data : null), raw: payload, httpStatus: response.status };
}

export type SignatureCheck = {
  valid: boolean;
  scheme: "verif-hash" | "flutterwave-signature" | null;
  reason?: string;
};

const constantTimeEquals = (a: string, b: string) => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

/**
 * Flutterwave's documented webhook check is the `verif-hash` header matching the
 * secret hash configured in the dashboard. We additionally accept an
 * HMAC-SHA256 signature of the raw body (sent as `flutterwave-signature` by
 * newer integrations) so a future migration does not require a code change.
 */
export function verifyWebhookSignature(rawBody: string, headers: Headers): SignatureCheck {
  const { webhookHash } = flutterwaveConfig();
  if (!webhookHash) return { valid: false, scheme: null, reason: "webhook secret hash is not configured" };

  const verifHash = headers.get("verif-hash");
  if (verifHash && constantTimeEquals(verifHash, webhookHash)) {
    return { valid: true, scheme: "verif-hash" };
  }

  const signature = headers.get("flutterwave-signature");
  if (signature) {
    const digest = createHmac("sha256", webhookHash).update(rawBody, "utf8").digest();
    const hex = digest.toString("hex");
    const base64 = digest.toString("base64");
    if (constantTimeEquals(signature, hex) || constantTimeEquals(signature, base64)) {
      return { valid: true, scheme: "flutterwave-signature" };
    }
    return { valid: false, scheme: "flutterwave-signature", reason: "signature did not match" };
  }

  return {
    valid: false,
    scheme: verifHash ? "verif-hash" : null,
    reason: verifHash ? "verif-hash did not match" : "no signature header present",
  };
}
