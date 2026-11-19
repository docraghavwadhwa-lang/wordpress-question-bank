import { supabase } from "@/integrations/supabase/client";

const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;
const config = {
  apiKey: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string | undefined) ?? "",
  projectId: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string | undefined) ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered" }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

const KEY = "qb_push_on";
export const pushIsOn = () => typeof window !== "undefined" && localStorage.getItem(KEY) === "1";

/** Must be called from a click. Registers this device for daily Question of the Day pushes. */
export async function enablePush(userId: string): Promise<PushResult> {
  if (!config.apiKey || !config.projectId || !config.appId || !vapidKey || !config.messagingSenderId) return { status: "not-configured" };
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) return { status: "unsupported" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`, { scope: "/firebase-cloud-messaging-push-scope" });
  const app = getApps()[0] ?? initializeApp(config);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return { status: "denied" };
  const { error } = await supabase.from("push_tokens").upsert({ token, user_id: userId });
  if (error) throw error;
  localStorage.setItem(KEY, "1");
  return { status: "registered" };
}
