import { webcrypto } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import { verifyOfflineLicense } from "./offline-license";
const owner = "00000000-0000-4000-8000-000000000001";
const now = Date.parse("2026-11-22");
async function license() {
 vi.stubGlobal("crypto", webcrypto);
 const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]) as CryptoKeyPair;
 const key = await crypto.subtle.exportKey("jwk", keys.publicKey);
 const payload = JSON.stringify({ owner, session: "session-one", issuedAt: now, subjects: [{ subject: "Medicine", expiresAt: "2027-11-21" }, { subject: "Anatomy", expiresAt: "2026-11-21" }] });
 const bytes = new Uint8Array(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(payload)));
 return { key, value: { payload, signature: btoa(String.fromCharCode(...bytes)) } };
}
afterEach(() => vi.unstubAllGlobals());
describe("signed offline Pro access", () => {
 it("allows all purchased subjects, but excludes expired coverage", async () => { const { key, value } = await license(); expect(await verifyOfflineLicense(value, owner, "session-one", now, key)).toEqual(["Medicine"]); });
 it("does not share paid questions between accounts", async () => { const { key, value } = await license(); expect(await verifyOfflineLicense(value, "00000000-0000-4000-8000-000000000002", "session-one", now, key)).toEqual([]); });
 it("rejects another sign-in session", async () => { const { key, value } = await license(); expect(await verifyOfflineLicense(value, owner, "session-two", now, key)).toEqual([]); });
 it("rejects edited subscription coverage", async () => { const { key, value } = await license(); expect(await verifyOfflineLicense({ ...value, payload: value.payload.replace("Medicine", "Surgery") }, owner, "session-one", now, key)).toEqual([]); });
 it("ends paid offline access at subscription expiry", async () => { const { key, value } = await license(); expect(await verifyOfflineLicense(value, owner, "session-one", Date.parse("2027-11-21"), key)).toEqual([]); });
});