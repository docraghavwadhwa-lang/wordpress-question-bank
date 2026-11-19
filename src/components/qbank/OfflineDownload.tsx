import { useEffect, useState } from "react";
import { CloudDownload, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadAllQuestions, loadOfflineData } from "@/lib/offline-data";

/** One-tap download of the whole question bank so the app works fully offline. */
export function OfflineDownload() {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    void loadOfflineData().then((d) => {
      if (d) {
        setSavedAt(d.savedAt);
        setCount(d.questions.length);
      }
    });
  }, []);

  async function download() {
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    try {
      const d = await downloadAllQuestions((done, total) => setProgress({ done, total }));
      setSavedAt(d.savedAt);
      setCount(d.questions.length);
      toast.success(`Saved ${d.questions.length.toLocaleString()} questions — the whole app now works offline`);
    } catch {
      toast.error("Download failed — check your internet and try again");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pct = progress && progress.total ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15">
            {savedAt ? <ShieldCheck className="h-5 w-5 text-accent" /> : <CloudDownload className="h-5 w-5 text-accent" />}
          </span>
          <span>
            <span className="block font-display text-lg text-primary">Offline mode</span>
            <span className="text-sm text-muted-foreground">
              {savedAt
                ? `${count.toLocaleString()} questions saved on this device · ${new Date(savedAt).toLocaleDateString()}`
                : "Download all questions once — then practise with no internet at all"}
            </span>
          </span>
        </span>
        <Button variant={savedAt ? "outline" : "default"} disabled={busy} onClick={() => void download()}>
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
