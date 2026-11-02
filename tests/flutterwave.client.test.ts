import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateCheckout, verifyTransaction } from "@/lib/payments/flutterwave";

const originalFetch = global.fetch;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Flutterwave client", () => {
  beforeEach(() => {
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-secret";
    process.env.FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-public";
    process.env.FLUTTERWAVE_API_BASE = "https://api.example.test/v3";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.FLUTTERWAVE_API_BASE;
  });

  it("posts a dynamic checkout for the exact stored amount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: "success", data: { link: "https://checkout.flutterwave.com/abc" } }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await initiateCheckout({
      txRef: "INKF-INK-2611-001002-abcdef",
      amountMinor: 500000n,
      currency: "NGN",
      customerEmail: "reader@example.com",
      customerName: "QA Reader",
      redirectUrl: "https://example.com/api/payments/verify?tx_ref=x",
      title: "INKFREEDOMPUBLISHING",
      meta: { order_id: "order-1" },
    });

    expect(result.link).toBe("https://checkout.flutterwave.com/abc");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v3/payments");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer FLWSECK_TEST-secret");
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      tx_ref: "INKF-INK-2611-001002-abcdef",
      amount: "5000.00",
      currency: "NGN",
      redirect_url: "https://example.com/api/payments/verify?tx_ref=x",
      customer: { email: "reader@example.com" },
    });
  });

  it("refuses to start a checkout for an unsupported currency or a zero amount", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    await expect(
      initiateCheckout({
        txRef: "x",
        amountMinor: 100n,
        currency: "ZAR",
        customerEmail: "a@b.com",
        redirectUrl: "https://example.com",
        title: "t",
      }),
    ).rejects.toThrow(/Unsupported payment currency/);

    await expect(
      initiateCheckout({
        txRef: "x",
        amountMinor: 0n,
        currency: "NGN",
        customerEmail: "a@b.com",
        redirectUrl: "https://example.com",
        title: "t",
      }),
    ).rejects.toThrow(/zero amount/);
  });

  it("surfaces a gateway error instead of pretending a link exists", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "error", message: "Invalid amount" }, 400)) as unknown as typeof fetch;

    await expect(
      initiateCheckout({
        txRef: "x",
        amountMinor: 500000n,
        currency: "NGN",
        customerEmail: "a@b.com",
        redirectUrl: "https://example.com",
        title: "t",
      }),
    ).rejects.toThrow(/Invalid amount/);
  });

  it("verifies by transaction id and normalises amount, fee and status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "success",
        data: {
          id: 90210,
          tx_ref: "INKF-1",
          status: "successful",
          amount: 5000,
          currency: "NGN",
          app_fee: 85,
          payment_type: "card",
          customer: { email: "reader@example.com" },
        },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTransaction({ transactionId: "90210" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/v3/transactions/90210/verify");
    expect(result.found).toBe(true);
    expect(result.transaction).toMatchObject({
      status: "successful",
      amountMinor: 500000n,
      feeMinor: 8500n,
      currency: "NGN",
      providerTransactionId: "90210",
    });
  });

  it("falls back to reference verification for the browser redirect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "success", data: { id: 1, status: "pending", amount: 10, currency: "USD" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTransaction({ txRef: "INKF-2" });
    expect(fetchMock.mock.calls[0][0]).toContain("/transactions/verify_by_reference?tx_ref=INKF-2");
    expect(result.transaction.status).toBe("pending");
  });

  it("returns found=false when the gateway does not know the transaction", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "error", message: "No transaction was found for this id", data: null }, 404)) as unknown as typeof fetch;

    const result = await verifyTransaction({ transactionId: "nope" });
    expect(result.found).toBe(false);
    expect(result.transaction.status).toBe("unknown");
  });
});
