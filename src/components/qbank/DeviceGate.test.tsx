import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ register: vi.fn(), license: vi.fn(async () => {}), cancel: vi.fn(async () => {}), clear: vi.fn(), signOut: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ ready: true, user: { id: "student" } }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ cancelQueries: mocks.cancel, clear: mocks.clear }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: "student" }, access_token: `header.${btoa(JSON.stringify({ sub: "student", session_id: "session" }))}.signature` } } }), signOut: mocks.signOut } } }));
vi.mock("@/lib/device-access", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/device-access")>(), registerDevice: mocks.register }));
vi.mock("@/lib/offline-data", () => ({ refreshOfflineLicense: mocks.license }));
import { DeviceGate } from "./DeviceGate";

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); });
it("shows normal loading, not device replacement, while a new session is checked", async () => {
  mocks.register.mockReturnValue(new Promise(() => {}));
  render(<DeviceGate><p>Study page</p></DeviceGate>);
  await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
  expect(screen.queryByText("Your devices")).toBeNull();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
});
it("keeps a previously approved session visible while rechecking silently", async () => {
  sessionStorage.setItem("elixir-device-session:student:session", "yes");
  mocks.register.mockReturnValue(new Promise(() => {}));
  render(<DeviceGate><p>Study page</p></DeviceGate>);
  await screen.findByText("Study page");
  expect(screen.queryByText("Your devices")).toBeNull();
});
it("shows replacement choices and removes cached approval when the server requires it", async () => {
  sessionStorage.setItem("elixir-device-session:student:session", "yes");
  mocks.register.mockResolvedValue({ status: "choose", devices: [{ session_id: "old", device_name: "Other phone", updated_at: "2026-11-22T05:00:00Z" }] });
  render(<DeviceGate><p>Study page</p></DeviceGate>);
  await screen.findByText("Your devices");
  expect(screen.queryByText("Study page")).toBeNull();
  expect(sessionStorage.getItem("elixir-device-session:student:session")).toBeNull();
  expect(mocks.cancel).toHaveBeenCalledOnce();
});