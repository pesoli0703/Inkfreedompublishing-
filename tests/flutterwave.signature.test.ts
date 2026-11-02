import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/payments/flutterwave";

const HASH = "test-webhook-secret-hash";

const headers = (init: Record<string, string> = {}) => new Headers(init);

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = HASH;
  });
  afterEach(() => {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    delete process.env.FLUTTERWAVE_SECRET_HASH;
  });

  it("accepts the documented verif-hash header", () => {
    expect(verifyWebhookSignature("{}", headers({ "verif-hash": HASH }))).toMatchObject({
      valid: true,
      scheme: "verif-hash",
    });
  });

  it("rejects a wrong or missing verif-hash", () => {
    expect(verifyWebhookSignature("{}", headers({ "verif-hash": "nope" })).valid).toBe(false);
    expect(verifyWebhookSignature("{}", headers()).valid).toBe(false);
  });

  it("accepts an HMAC-SHA256 signature over the raw body", () => {
    const body = JSON.stringify({ event: "charge.completed" });
    const signature = createHmac("sha256", HASH).update(body).digest("hex");
    expect(verifyWebhookSignature(body, headers({ "flutterwave-signature": signature }))).toMatchObject({
      valid: true,
      scheme: "flutterwave-signature",
    });
  });

  it("rejects a signature computed over a different body", () => {
    const signature = createHmac("sha256", HASH).update("original").digest("hex");
    expect(verifyWebhookSignature("tampered", headers({ "flutterwave-signature": signature })).valid).toBe(false);
  });

  it("falls back to the legacy FLUTTERWAVE_SECRET_HASH name", () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    process.env.FLUTTERWAVE_SECRET_HASH = HASH;
    expect(verifyWebhookSignature("{}", headers({ "verif-hash": HASH })).valid).toBe(true);
  });

  it("refuses everything when no secret hash is configured", () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    const result = verifyWebhookSignature("{}", headers({ "verif-hash": HASH }));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not configured");
  });
});
