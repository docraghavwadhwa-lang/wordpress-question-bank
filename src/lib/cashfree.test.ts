import { describe, expect, it, vi } from "vitest";
import { cashfreeCheckoutMode, cashfreePaymentMatches, CASHFREE_ENVIRONMENT } from "./cashfree";
import { confirmCashfreeRequest, verifyCashfreeSignature } from "./cashfree.server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), row: { id: "request", user_id: "student", status: "pending", total_paise: 399900, cashfree_order_id: "elixir_order", cashfree_environment: "live", verified_paid_at: "2026-11-21T00:00:00Z" } }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.row, error: null }) }) }) }), rpc: mocks.rpc,
} }));
const order = { order_id: "elixir_order", order_status: "PAID", order_amount: 3999, order_currency: "INR", customer_details: { customer_id: "student" } };
const expected = { orderId: "elixir_order", userId: "student", paise: 399900 };
describe("Cashfree payment rules", () => {
  it("uses live payments as requested", () => { expect(CASHFREE_ENVIRONMENT).toBe("live"); expect(cashfreeCheckoutMode(CASHFREE_ENVIRONMENT)).toBe("production"); });
  it("matches the stored Panacea offer of ₹3,999, not a struck-out price", () => {
    expect(cashfreePaymentMatches(order, expected)).toBe(true);
    expect(cashfreePaymentMatches({ ...order, order_amount: 4499 }, expected)).toBe(false);
  });
  it("rejects an unpaid callback", () => { expect(cashfreePaymentMatches({ ...order, order_status: "ACTIVE" }, expected)).toBe(false); });
  it("rejects a different student, order or currency", () => {
    expect(cashfreePaymentMatches(order, { ...expected, userId: "other" })).toBe(false);
    expect(cashfreePaymentMatches(order, { ...expected, orderId: "other" })).toBe(false);
    expect(cashfreePaymentMatches({ ...order, order_currency: "USD" }, expected)).toBe(false);
  });
  it("keeps verified payment pending administrator approval and never activates access", async () => {
    expect(await confirmCashfreeRequest("request")).toBe("received"); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("verifies exact raw webhook bytes and rejects tampering or missing signatures", async () => {
    const secret = "test-fixture-only"; const body = '{"amount":3999.00}'; const timestamp = "1795226400000";
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + body));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signed)));
    expect(await verifyCashfreeSignature(body, timestamp, signature, secret)).toBe(true);
    expect(await verifyCashfreeSignature('{"amount":3999}', timestamp, signature, secret)).toBe(false);
    expect(await verifyCashfreeSignature(body, timestamp, null, secret)).toBe(false);
    expect(await verifyCashfreeSignature(body, null, signature, secret)).toBe(false);
  });
});