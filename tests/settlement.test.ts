import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const paymentRow = {
  id: "pay-1",
  order_id: "order-1",
  status: "initiated",
  amount_minor: 500000,
  currency: "NGN",
  provider_tx_ref: "INKF-INK-2611-001002-abcdef",
  orders: { order_number: "INK-2611-001002" },
};

const adminMock = {
  rpc,
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: paymentRow, error: null }) }),
    }),
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
  serviceRoleConfigured: () => true,
}));

const verifyTransaction = vi.fn();
vi.mock("@/lib/payments/flutterwave", () => ({
  verifyTransaction: (...args: unknown[]) => verifyTransaction(...args),
  flutterwaveConfigured: () => true,
  webhookSignatureConfigured: () => true,
}));

const { settlePaymentById } = await import("@/lib/payments/settle");

const gateway = (over: Record<string, unknown> = {}) => ({
  found: true,
  httpStatus: 200,
  raw: { data: { id: 90210 } },
  transaction: {
    status: "successful",
    amountMinor: 500000n,
    currency: "NGN",
    providerTransactionId: "90210",
    providerStatus: "successful",
    feeMinor: 8500n,
    channel: "card",
    customerEmail: "reader@example.com",
    txRef: "INKF-INK-2611-001002-abcdef",
    ...over,
  },
});

describe("settlePaymentById", () => {
  beforeEach(() => {
    rpc.mockReset();
    verifyTransaction.mockReset();
    paymentRow.status = "initiated";
  });

  it("settles a verified payment and forwards the gateway fee", async () => {
    verifyTransaction.mockResolvedValue(gateway());
    rpc.mockResolvedValue({ data: "settled", error: null });

    const result = await settlePaymentById({ paymentId: "pay-1", source: "webhook", transactionId: "90210" });

    expect(result.outcome).toBe("settled");
    expect(verifyTransaction).toHaveBeenCalledWith({ transactionId: "90210", txRef: paymentRow.provider_tx_ref });
    const args = rpc.mock.calls[0][1];
    expect(args.p_verified_amount_minor).toBe(500000);
    expect(args.p_gateway_fee_minor).toBe(8500);
    expect(args.p_source).toBe("webhook");
    expect(args.p_provider_status).toBe("successful");
  });

  it("never calls settle_payment twice for a payment that already succeeded", async () => {
    paymentRow.status = "succeeded";
    const result = await settlePaymentById({ paymentId: "pay-1", source: "webhook" });
    expect(result.outcome).toBe("duplicate");
    expect(rpc).not.toHaveBeenCalled();
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("sends a mismatched amount to the database, which refuses it", async () => {
    verifyTransaction.mockResolvedValue(gateway({ amountMinor: 499900n }));
    rpc.mockResolvedValue({ data: "failed", error: null });

    const result = await settlePaymentById({ paymentId: "pay-1", source: "server_lookup" });
    expect(result.outcome).toBe("mismatch");
  });

  it("does not settle when the currency differs", async () => {
    verifyTransaction.mockResolvedValue(gateway({ currency: "USD" }));
    rpc.mockResolvedValue({ data: "failed", error: null });

    const result = await settlePaymentById({ paymentId: "pay-1", source: "server_lookup" });
    expect(result.outcome).toBe("mismatch");
  });

  it("does not settle an unsuccessful transaction", async () => {
    verifyTransaction.mockResolvedValue(gateway({ status: "failed", providerStatus: "failed" }));
    rpc.mockResolvedValue({ data: "failed", error: null });

    const result = await settlePaymentById({ paymentId: "pay-1", source: "server_lookup" });
    expect(result.outcome).toBe("failed");
    expect(rpc.mock.calls[0][1].p_provider_status).toBe("failed");
  });

  it("reports unverifiable (and touches nothing) when the gateway cannot be reached", async () => {
    verifyTransaction.mockRejectedValue(new Error("Could not reach Flutterwave."));
    const result = await settlePaymentById({ paymentId: "pay-1", source: "reconciliation" });
    expect(result.outcome).toBe("unverifiable");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("treats an unknown reference at the gateway as unverifiable, not settled", async () => {
    verifyTransaction.mockResolvedValue({ found: false, httpStatus: 404, raw: null, transaction: {} });
    const result = await settlePaymentById({ paymentId: "pay-1", source: "webhook" });
    expect(result.outcome).toBe("unverifiable");
    expect(rpc).not.toHaveBeenCalled();
  });
});
