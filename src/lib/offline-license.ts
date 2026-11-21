import { z } from "zod";
import { OFFLINE_PUBLIC_KEY } from "./offline-public-key";
export const grantSchema = z.object({ owner: z.string().uuid(), subjects: z.array(z.object({ subject: z.string(), expiresAt: z.string() })) });
export const licenseSchema = grantSchema.extend({ session: z.string(), issuedAt: z.number() });
export type OfflineLicense = { payload: string; signature: string };
export async function verifyOfflineLicense(license: OfflineLicense, owner: string, session: string, now = Date.now()) {
  try {
    const key = await crypto.subtle.importKey("jwk", OFFLINE_PUBLIC_KEY, { name: "Ed25519" }, false, ["verify"]);
    const signature = Uint8Array.from(atob(license.signature), c => c.charCodeAt(0));
    if (!await crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(license.payload))) return [];
    const grant = licenseSchema.parse(JSON.parse(license.payload));
    if (grant.owner !== owner || grant.session !== session || now < grant.issuedAt - 60000) return [];
    return grant.subjects.filter(s => Date.parse(s.expiresAt) > now).map(s => s.subject);
  } catch { return []; }
}