const API = "https://api.flutterwave.com/v3";

export const flutterwaveConfigured = () =>
  Boolean(process.env.FLUTTERWAVE_SECRET_KEY);

export const webhookHashConfigured = () =>
  Boolean(process.env.FLUTTERWAVE_SECRET_HASH);

type InitiateInput = {
  txRef: string;
  amountMinor: bigint;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  redirectUrl: string;
  title: string;
};

/**
 * Creates a hosted checkout. `amountMinor` is converted to major units in the
 * ISO minor-unit sense; NGN, USD, GBP and EUR all use two decimals, so the
 * division is exact for the launch currencies.
 */
export async function createCheckout(input: InitiateInput) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("Flutterwave is not configured.");

  const response = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: Number(input.amountMinor) / 100,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: {
        email: input.customerEmail,
        name: input.customerName ?? input.customerEmail,
      },
      customizations: {
        title: input.title,
        description: `Order ${input.txRef}`,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; data?: { link?: string } }
    | null;

  if (!response.ok || payload?.status !== "success" || !payload.data?.link) {
    throw new Error(
      payload?.message ?? "Flutterwave did not return a checkout link.",
    );
  }

  return { link: payload.data.link };
}

export type VerifiedTransaction = {
  status: "successful" | "failed" | "unknown";
  amountMinor: bigint;
  currency: string;
  providerTransactionId: string | null;
  providerStatus: string;
  channel: string | null;
  customerEmail: string | null;
  raw: unknown;
};

/** Server-side lookup. This is the only source of truth for a payment. */
export async function verifyTransactionByReference(
  txRef: string,
): Promise<VerifiedTransaction> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("Flutterwave is not configured.");

  const response = await fetch(
    `${API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        status?: string;
        data?: {
          status?: string;
          amount?: number | string;
          currency?: string;
          id?: number | string;
          tx_ref?: string;
          payment_type?: string;
          customer?: { email?: string };
        };
      }
    | null;

  const data = payload?.data;
  if (!response.ok || !data) {
    return {
      status: "unknown",
      amountMinor: 0n,
      currency: "",
      providerTransactionId: null,
      providerStatus: "unverifiable",
      channel: null,
      customerEmail: null,
      raw: payload,
    };
  }

  const providerStatus = String(data.status ?? "").toLowerCase();
  const amountMajor = Number(data.amount ?? 0);
  const amountMinor = BigInt(Math.round(amountMajor * 100));

  return {
    status:
      providerStatus === "successful"
        ? "successful"
        : providerStatus === ""
          ? "unknown"
          : "failed",
    amountMinor,
    currency: String(data.currency ?? "").toUpperCase(),
    providerTransactionId: data.id != null ? String(data.id) : null,
    providerStatus,
    channel: data.payment_type ?? null,
    customerEmail: data.customer?.email ?? null,
    raw: payload,
  };
}
