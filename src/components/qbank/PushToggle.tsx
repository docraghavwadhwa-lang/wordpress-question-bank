import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enablePush, pushIsOn } from "@/lib/push";

const MESSAGES = {
  "not-configured": "Notifications aren't set up yet. Please try again later.",
  unsupported: "This browser doesn't support notifications. On iPhone, first tap Share → Add to Home Screen, then open the app from there.",
  "open-in-new-tab": "Please open the app in its own browser tab to turn on notifications.",
  denied: "Notifications are blocked. Allow them for this site in your browser settings.",
} as const;

export function PushToggle({ userId }: { userId: string }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(pushIsOn()), []);

  async function enable() {
    setBusy(true);
    try {
      const r = await enablePush(userId);
      if (r.status === "registered") { setOn(true); toast.success("You'll get the Question of the Day every morning at 8 AM."); }
      else toast.error(MESSAGES[r.status]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (on) return (
    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><BellRing className="h-4 w-4 text-accent" /> Daily 8 AM reminder is on for this device.</p>
  );
  return (
    <Button variant="outline" size="sm" className="mt-3" onClick={enable} disabled={busy}>
      <Bell className="h-4 w-4" /> {busy ? "Turning on…" : "Notify me daily at 8 AM"}
    </Button>
  );
}
