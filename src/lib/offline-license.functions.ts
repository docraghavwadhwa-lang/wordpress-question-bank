import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { grantSchema } from "./offline-license";
export const issueOfflineLicense = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("offline_access_grant");
  if (error) throw new Error(error.message);
  const grant = grantSchema.parse(data);
  const session = context.claims['session_id'];
  if (typeof session !== "string" || grant.owner !== context.userId) throw new Error("Active account required");
  const secret = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!secret) throw new Error("Offline access is not configured");
  const seed = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("elixir-offline-license-v1:" + secret)));
  const prefix = Uint8Array.from([48,46,2,1,0,48,5,6,3,43,101,112,4,34,4,32]);
  const bytes = new Uint8Array(prefix.length + seed.length); bytes.set(prefix); bytes.set(seed, prefix.length);
  const key = await crypto.subtle.importKey("pkcs8", bytes, { name: "Ed25519" }, false, ["sign"]);
  const payload = JSON.stringify({ ...grant, session, issuedAt: Date.now() });
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(payload)));
  return { payload, signature: btoa(String.fromCharCode(...signature)) };
});