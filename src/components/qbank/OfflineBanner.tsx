import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { flushQueue, readQueue, useOnline } from "@/lib/offline";
import { useQueryClient } from "@tanstack/react-query";

/** Shows offline status and syncs queued answers when the connection comes back. */
export function OfflineBanner() {
  const online = useOnline();
  const qc = useQueryClient();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const update = () => setPending(readQueue().length);
    update();
    window.addEventListener("qb-queue", update);
    return () => window.removeEventListener("qb-queue", update);
  }, []);
  useEffect(() => {
    if (!online) return;
    void flushQueue().then((n) => {
      if (n > 0) {
        toast.success(`Synced ${n} offline ${n === 1 ? "answer" : "answers"}`);
        void qc.invalidateQueries();
      }
    });
  }, [online, qc]);
  if (online) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline mode · {pending > 0 ? `${pending} saved, will sync` : "progress will sync"} when you're back online</span>
    </div>
  );
}
