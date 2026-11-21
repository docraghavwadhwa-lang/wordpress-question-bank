import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type LocalNotif = {
  requestPermissions: () => Promise<{ display: string }>;
  checkPermissions: () => Promise<{ display: string }>;
  schedule: (o: unknown) => Promise<unknown>;
  cancel: (o: unknown) => Promise<unknown>;
};
const plugin = () => (window as unknown as { Capacitor?: { Plugins?: { LocalNotifications?: LocalNotif } } }).Capacitor?.Plugins?.LocalNotifications;
const KEY = "el-reminder";

/** Android-app-only daily 8 AM study reminder; tapping asks the phone to "Allow notifications". */
export function PushToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(localStorage.getItem(KEY) === "1"), []);

  async function toggle() {
    const ln = plugin();
    if (!ln) { toast.error("Please update the Elixir app to turn on reminders."); return; }
    setBusy(true);
    try {
      if (on) {
        await ln.cancel({ notifications: [{ id: 8 }] });
        localStorage.removeItem(KEY); setOn(false); toast.success("Daily reminders turned off.");
        return;
      }
      const p = await ln.requestPermissions();
      if (p.display !== "granted") { toast.error("Notifications are blocked. Allow them for Elixir in your phone settings."); return; }
      await ln.schedule({ notifications: [{ id: 8, title: "Your daily dose 🩺", body: "Today's Question of the Day is waiting. Keep your streak alive!", schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true } }] });
      localStorage.setItem(KEY, "1"); setOn(true); toast.success("You'll get a reminder every morning at 8 AM.");
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
