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

  return (
    <Button variant="study" className="h-auto min-h-24 w-full justify-start gap-3 whitespace-normal px-4 py-4 text-left" onClick={enable} disabled={busy || on}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-accent">{on ? <BellRing /> : <Bell />}</span>
      <span className="min-w-0"><span className="block font-display text-lg text-primary">Daily reminder</span><span className="block text-xs font-normal text-muted-foreground">{on ? "8 AM · On for this device" : busy ? "Turning on…" : "8 AM · Enable notifications"}</span></span>
    </Button>
  );
}
