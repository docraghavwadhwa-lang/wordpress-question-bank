import { expect, it, vi } from "vitest";
import { removeNativeListener } from "./native-listener";

it("cleans up synchronous native listener handles", async () => {
  const remove = vi.fn(); await removeNativeListener({ remove }); expect(remove).toHaveBeenCalledOnce();
});
it("cleans up promise-based native listener handles", async () => {
  const remove = vi.fn(); await removeNativeListener(Promise.resolve({ remove })); expect(remove).toHaveBeenCalledOnce();
});
it("accepts a missing listener", async () => {
  await expect(removeNativeListener(undefined)).resolves.toBeUndefined();
});