import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DAILY_REMINDERS, reminderIds, reminderNotifications } from "@/lib/reminders";

type LocalNotif = {
  requestPermissions: () => Promise<{ display: string }>;
  checkPermissions: () => Promise<{ display: string }>;
  schedule: (o: unknown) => Promise<unknown>;
  cancel: (o: unknown) => Promise<unknown>;
  addListener?: (event: string, fn: (event: { notification: { extra?: { path?: string } } }) => void) => Promise<{ remove: () => void }>;
};
const plugin = () => (window as unknown as { Capacitor?: { Plugins?: { LocalNotifications?: LocalNotif } } }).Capacitor?.Plugins?.LocalNotifications;
const KEY = "el-reminder";

/** Android-app-only daily 8 AM study reminder; tapping asks the phone to "Allow notifications". */
export function PushToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const enabled = localStorage.getItem(KEY) === "1"; setOn(enabled); const ln = plugin();
    if (enabled && ln) void ln.checkPermissions().then(async p => { if (p.display === "granted") { await ln.cancel({ notifications: reminderIds() }); await ln.schedule({ notifications: reminderNotifications() }); } else { setOn(false); localStorage.removeItem(KEY); } }).catch(() => {});
    const listener = ln?.addListener?.("localNotificationActionPerformed", e => { const path = e.notification.extra?.path; if (path && DAILY_REMINDERS.some(r => r.path === path)) window.location.assign(path); });
    return () => { void listener?.then(handle => handle.remove()); };
  }, []);

  async function toggle() {
    const ln = plugin();
    if (!ln) { toast.error("Please update the Elixir app to turn on reminders."); return; }
    setBusy(true);
    try {
      if (on) {
        await ln.cancel({ notifications: reminderIds() });
        localStorage.removeItem(KEY); setOn(false); toast.success("Daily reminders turned off.");
        return;
      }
      const p = await ln.requestPermissions();
      if (p.display !== "granted") { toast.error("Notifications are blocked. Allow them for Elixir in your phone settings."); return; }
      await ln.schedule({ notifications: reminderNotifications() });
      localStorage.setItem(KEY, "1"); setOn(true); toast.success("Daily reminders enabled at 8 AM, 12 PM, 4 PM, 8 PM and 9 PM.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={toggle} disabled={busy} aria-pressed={on}>
      {on ? <BellRing className="h-4 w-4 text-accent" /> : <Bell className="h-4 w-4" />}
      Daily reminders{busy ? " · Turning on…" : ""}
    </Button>
  );
}
