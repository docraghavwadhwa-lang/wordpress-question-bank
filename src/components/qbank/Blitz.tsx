import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/offline";
import { BLITZ_SIZE, BLITZ_TIMER, fetchBlitzRank } from "@/lib/blitz";

export function BlitzCard({ day, loading, onStart }: { day: string; loading: boolean; onStart: () => void }) {
  const rank = useQuery({ queryKey: ["blitz-rank", day], queryFn: () => fetchBlitzRank(day) });
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Zap className="h-5 w-5" /></span>
        <span>
          <span className="block font-display text-xl text-primary">Daily High-Yield Blitz</span>
          <span className="text-sm text-muted-foreground">
            {rank.data
              ? `Today: ${rank.data.my_score}/${BLITZ_SIZE} · ranked #${rank.data.my_rank} of ${rank.data.players}`
              : `${BLITZ_SIZE} questions · ${BLITZ_TIMER}s to finish · new set every midnight`}
          </span>
        </span>
      </span>
      {!rank.data && !rank.isLoading && (
        <Button disabled={loading} onClick={onStart}>{loading ? "Loading…" : "Start Blitz"}</Button>
      )}
    </div>
  );
}

export function BlitzRankLine({ day }: { day: string }) {
  const online = useOnline();
  const rank = useQuery({ queryKey: ["blitz-rank", day], queryFn: () => fetchBlitzRank(day), enabled: online, refetchInterval: (q) => (q.state.data ? false : 1500) });
  if (!online && !rank.data) return <p className="mt-4 text-sm text-muted-foreground">Your rank will appear once you're back online.</p>;
  if (!rank.data) return <p className="mt-4 text-sm text-muted-foreground">Calculating your rank…</p>;
  return (
    <p className="mt-4 rounded-lg bg-secondary px-4 py-3 font-display text-xl text-primary">
      You ranked #{rank.data.my_rank} of {rank.data.players} today
    </p>
  );
}
