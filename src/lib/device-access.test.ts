import { describe, expect, it } from "vitest";
import { DEVICE_LIMIT, deviceName } from "./device-access";
describe("account devices", () => {
  it("limits accounts to two devices", () => { expect(DEVICE_LIMIT).toBe(2); });
  it("names Android and desktop browsers distinctly", () => { expect(deviceName("Android Chrome ElixirApp")).toBe("Android · Elixir app"); expect(deviceName("Windows Chrome")).toBe("Windows · Chrome"); });
});