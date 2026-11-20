import { supabase } from "@/integrations/supabase/client";
export const DEVICE_LIMIT = 2;
export type AccountDevice = { session_id: string; device_name: string; updated_at: string };
export type DeviceResult = { status: "active" | "choose" | "revoked"; devices?: AccountDevice[] };
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