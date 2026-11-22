import { describe, expect, it } from "vitest";
import { DEVICE_LIMIT, deviceName, deviceApprovalKey } from "./device-access";
describe("account devices", () => {
  it("limits accounts to two devices", () => { expect(DEVICE_LIMIT).toBe(2); });
  it("names Android and desktop browsers distinctly", () => { expect(deviceName("Android Chrome ElixirApp")).toBe("Android · Elixir app"); expect(deviceName("Windows Chrome")).toBe("Windows · Chrome"); });
  it("does not reuse an approval for another user or sign-in session", () => {
    const token = (sub: string, session_id: string) => `header.${btoa(JSON.stringify({ sub, session_id }))}.signature`;
    expect(deviceApprovalKey("a", token("a", "first"))).toBe("elixir-device-session:a:first");
    expect(deviceApprovalKey("a", token("b", "first"))).toBeNull();
    expect(deviceApprovalKey("a", token("a", "second"))).not.toBe(deviceApprovalKey("a", token("a", "first")));
    expect(deviceApprovalKey("a", "invalid")).toBeNull();
  });
});