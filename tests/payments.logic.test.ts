import { describe, expect, it } from "vitest";
import {
  checkCurrency,
  majorToMinor,
  rateIsFresh,
  reconcilePayment,
  splitCommission,
  type CurrencyRow,
  type VerifiedPayment,
} from "@/lib/payments/logic";

const ngn: CurrencyRow = {
  code: "NGN",
  is_enabled: true,
  provider_supported: true,
  min_amount_minor: 10000,
  max_amount_minor: 50000000,
};

const verified = (over: Partial<VerifiedPayment> = {}): VerifiedPayment => ({
  status: "successful",
  amountMinor: 500000n,
  currency: "NGN",
  providerTransactionId: "12345",
  providerStatus: "successful",
  feeMinor: 8500n,
  channel: "card",
  customerEmail: "reader@example.com",
  txRef: "INKF-INK-2611-001002-abcd",
  ...over,
});

describe("majorToMinor", () => {
  it("converts integer and decimal gateway amounts exactly", () => {
    expect(majorToMinor(5000)).toEqual({ ok: true, minor: 500000n });
    expect(majorToMinor("5000")).toEqual({ ok: true, minor: 500000n });
    expect(majorToMinor("5000.5")).toEqual({ ok: true, minor: 500050n });
    expect(majorToMinor("0.01")).toEqual({ ok: true, minor: 1n });
  });

  it("rejects amounts with more precision than the currency allows", () => {
    expect(majorToMinor("10.005").ok).toBe(false);
  });

  it("rejects garbage instead of coercing it to zero", () => {
    for (const bad of ["", "abc", "-10", "1,000", null, undefined, Number.POSITIVE_INFINITY]) {
      expect(majorToMinor(bad).ok).toBe(false);
    }
  });
});

describe("checkCurrency", () => {
  it("accepts an enabled, merchant-supported currency in range", () => {
    expect(checkCurrency("NGN", 500000n, ngn)).toEqual({ ok: true });
  });

  it("refuses currencies outside the supported set", () => {
    const result = checkCurrency("ZAR", 500000n, null);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("unknown_currency");
  });

  it("refuses a currency the merchant account has not enabled", () => {
    const result = checkCurrency("GBP", 500000n, { ...ngn, code: "GBP", provider_supported: false });
    expect(!result.ok && result.code).toBe("merchant_unsupported");
  });

  it("refuses a disabled currency and out-of-range amounts", () => {
    expect(checkCurrency("NGN", 500000n, { ...ngn, is_enabled: false }).ok).toBe(false);
    expect(checkCurrency("NGN", 100n, ngn).ok).toBe(false);
  });
});

describe("reconcilePayment", () => {
  const expected = { amountMinor: 500000n, currency: "NGN" };

  it("accepts a verified, matching, successful payment", () => {
    expect(reconcilePayment(expected, verified()).outcome).toBe("ok");
  });

  it("never settles a failed, pending or unknown transaction", () => {
    expect(reconcilePayment(expected, verified({ status: "failed" })).outcome).toBe("not_successful");
    expect(reconcilePayment(expected, verified({ status: "pending" })).outcome).toBe("not_successful");
    expect(reconcilePayment(expected, verified({ status: "unknown" })).outcome).toBe("unknown");
  });

  it("rejects an underpayment", () => {
    expect(reconcilePayment(expected, verified({ amountMinor: 499999n })).outcome).toBe("amount_mismatch");
  });

  it("rejects an overpayment rather than silently crediting it", () => {
    expect(reconcilePayment(expected, verified({ amountMinor: 500001n })).outcome).toBe("amount_mismatch");
  });

  it("rejects a different currency even at the same number", () => {
    expect(reconcilePayment(expected, verified({ currency: "USD" })).outcome).toBe("currency_mismatch");
  });

  it("refuses when the gateway returns no amount", () => {
    expect(reconcilePayment(expected, verified({ amountMinor: null })).outcome).toBe("unknown");
  });
});

describe("splitCommission", () => {
  it("splits a 5,000.00 sale 4,500 / 500 at 1000 bps", () => {
    expect(splitCommission(500000n, 1000)).toEqual({ authorMinor: 450000n, platformMinor: 50000n });
  });

  it("always balances and rounds half-up", () => {
    for (const amount of [1n, 3n, 999n, 1234567n]) {
      const split = splitCommission(amount, 1000);
      expect(split.authorMinor + split.platformMinor).toBe(amount);
    }
    expect(splitCommission(5n, 1000).platformMinor).toBe(1n); // 0.5 rounds up
  });
});

describe("rateIsFresh", () => {
  const now = new Date("2026-11-02T12:00:00Z");

  it("accepts a rate fetched today", () => {
    expect(rateIsFresh("2026-11-02T06:00:00Z", now)).toBe(true);
  });

  it("rejects a stale rate", () => {
    expect(rateIsFresh("2026-10-30T06:00:00Z", now)).toBe(false);
  });

  it("rejects a missing or future-dated rate", () => {
    expect(rateIsFresh(null, now)).toBe(false);
    expect(rateIsFresh("2026-11-03T12:00:00Z", now)).toBe(false);
  });
});
