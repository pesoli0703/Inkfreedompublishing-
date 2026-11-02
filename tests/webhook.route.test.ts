import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const update = vi.fn();

const adminMock = {
  from: () => ({
    insert,
    update: (values: unknown) => {
      update(values);
      return { eq: () => ({ eq: async () => ({ error: null }) }) };
    },
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
  serviceRoleConfigured: () => true,
}));

const settleByProviderRef = vi.fn();
vi.mock("@/lib/payments/settle", () => ({
  settleByProviderRef: (...args: unknown[]) => settleByProviderRef(...args),
}));

const { POST } = await import("@/app/api/webhooks/flutterwave/route");

const HASH = "hook-secret";

const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    event: "charge.completed",
    data: { id: 90210, tx_ref: "INKF-INK-2611-001002-abcdef", status: "successful", ...over },
  });

const post = (raw: string, headers: Record<string, string> = { "verif-hash": HASH }) =>
  POST(
    new Request("https://example.com/api/webhooks/flutterwave", {
      method: "POST",
      headers,
      body: raw,
    }),
  );

describe("Flutterwave webhook", () => {
  beforeEach(() => {
    process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = HASH;
    insert.mockReset();
    update.mockReset();
    settleByProviderRef.mockReset();
    insert.mockResolvedValue({ error: null });
  });

  it("rejects a request whose verif-hash does not match, and records it", async () => {
    const response = await post(body(), { "verif-hash": "wrong" });
    expect(response.status).toBe(401);
    expect(settleByProviderRef).not.toHaveBeenCalled();
    const recorded = insert.mock.calls[0][0];
    expect(recorded.signature_valid).toBe(false);
    expect(recorded.event_type).toBe("signature.invalid");
  });

  it("acknowledges a duplicate delivery without settling twice", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    const response = await post(body());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "duplicate" });
    expect(settleByProviderRef).not.toHaveBeenCalled();
  });

  it("settles a verified transaction and acknowledges it", async () => {
    settleByProviderRef.mockResolvedValue({ outcome: "settled", orderNumber: "INK-2611-001002" });
    const response = await post(body());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "settled" });
    expect(settleByProviderRef).toHaveBeenCalledWith({
      txRef: "INKF-INK-2611-001002-abcdef",
      transactionId: "90210",
      source: "webhook",
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ processing_status: "settled" }));
  });

  it("returns 500 when verification could not complete, so Flutterwave retries", async () => {
    settleByProviderRef.mockResolvedValue({ outcome: "unverifiable", message: "gateway timeout" });
    const response = await post(body());
    expect(response.status).toBe(500);
  });

  it("acknowledges events that carry no tx_ref without settling", async () => {
    const response = await post(JSON.stringify({ event: "charge.completed", data: { id: 5 } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ignored" });
    expect(settleByProviderRef).not.toHaveBeenCalled();
  });

  it("rejects a malformed body only after the signature has been checked", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
  });
});
