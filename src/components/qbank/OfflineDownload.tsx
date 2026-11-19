import { useEffect, useState } from "react";
import { CloudDownload, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadAllQuestions, loadOfflineSummary } from "@/lib/offline-data";

/** One-tap download of the whole question bank so the app works fully offline. */
export function OfflineDownload() {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    void loadOfflineSummary().then((d) => {
      if (d) {
        setSavedAt(d.savedAt);
        setCount(d.count);
      }
    });
  }, []);

  async function download() {
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    try {
      const d = await downloadAllQuestions((done, total) => setProgress({ done, total }));
      setSavedAt(d.savedAt);
      setCount(d.count);
      toast.success(`Saved ${d.count.toLocaleString()} questions — questions are ready for offline practice`);
    } catch {
      toast.error("Download failed — check your internet and try again");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pct = progress && progress.total ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <section className={savedAt ? "mt-4 border-y bg-secondary/60 px-4 py-3" : "mt-4 rounded-lg border bg-card p-5"}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary">
            {savedAt ? <ShieldCheck className="h-5 w-5 text-success" /> : <CloudDownload className="h-5 w-5 text-accent" />}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-primary">{savedAt ? "Ready for offline practice" : "Offline mode"}</span>
            <span className="block text-xs text-muted-foreground">
              {savedAt
                ? `${count.toLocaleString()} questions saved on this device · ${new Date(savedAt).toLocaleDateString()}`
                : "Download all questions once — then practise with no internet at all"}
            </span>
          </span>
        </span>
        <Button variant={savedAt ? "ghost" : "default"} className="h-auto min-h-9 max-w-32 whitespace-normal text-center" disabled={busy} onClick={() => void download()}>
          {busy ? (
            `Downloading… ${pct}%`
          ) : savedAt ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Update
            </>
          ) : (
            "Download for offline"
          )}
        </Button>
      </div>
      {busy && progress && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </section>
  );
}
