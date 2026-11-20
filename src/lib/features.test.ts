import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from } }));
import { fetchFeatures, featureAvailable } from "./features";

describe("public feature availability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads only the public projection, not private settings", async () => {
    const rows = [{ key: "qbanks", label: "Q-Banks", enabled: false, updated_at: null }];
    rpc.mockResolvedValue({ data: rows, error: null });
    expect(await fetchFeatures()).toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("public_feature_availability");
    expect(from).not.toHaveBeenCalled();
    expect(featureAvailable(rows, "qbanks")).toBe(false);
    expect(featureAvailable(rows, "qbanks", true)).toBe(true);
  });

  it("propagates availability errors rather than disguising them", async () => {
    const error = new Error("Unavailable");
    rpc.mockResolvedValue({ data: null, error });
    await expect(fetchFeatures()).rejects.toThrow("Unavailable");
  });
});