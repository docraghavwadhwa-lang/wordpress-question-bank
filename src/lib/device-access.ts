import { supabase } from "@/integrations/supabase/client";
export const DEVICE_LIMIT = 2;
export type AccountDevice = { session_id: string; device_name: string; updated_at: string };
export type DeviceResult = { status: "active" | "choose" | "revoked"; devices?: AccountDevice[] };
/** Presentation cache only; the database still verifies every online request. */
export function deviceApprovalKey(userId: string, token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string; session_id?: string };
    return claims.sub === userId && typeof claims.session_id === "string" ? `elixir-device-session:${userId}:${claims.session_id}` : null;
  } catch { return null; }
}
export function deviceName(agent: string) {
  const platform = /Android/i.test(agent) ? "Android" : /iPhone|iPad/i.test(agent) ? "iPhone / iPad" : /Windows/i.test(agent) ? "Windows" : /Mac/i.test(agent) ? "Mac" : "Computer";
  const browser = /ElixirApp/i.test(agent) ? "Elixir app" : /Edg/i.test(agent) ? "Edge" : /Chrome/i.test(agent) ? "Chrome" : /Firefox/i.test(agent) ? "Firefox" : "Safari";
  return `${platform} · ${browser}`;
}
export async function registerDevice(replace?: string): Promise<DeviceResult> {
  let device = localStorage.getItem("elixir-device-id");
  if (!device) { device = crypto.randomUUID(); localStorage.setItem("elixir-device-id", device); }
  const { data, error } = await supabase.rpc("register_account_device", { _device: device, _name: deviceName(navigator.userAgent), ...(replace ? { _replace: replace } : {}) });
  if (error) throw error;
  return data as unknown as DeviceResult;
}