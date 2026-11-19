import { Bookmark, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupBookmarks, type Marked } from "@/lib/qbank";
import { subjectIcon } from "./subject-icons";
import type { Pick } from "./SubjectGrid";

export function Bookmarks({ marked, loading, error, onPick }: {
  marked?: Marked[] | undefined; loading: boolean; error: boolean; onPick: (pick: Pick) => void;
}) {
  const groups = groupBookmarks(marked ?? []);
  return <section className="mt-6 border-t pt-6">
    <h2 className="mb-4 font-display text-2xl text-primary">Bookmarked questions</h2>
    {loading ? <p className="text-muted-foreground">Loading bookmarks…</p> : error ? <p className="text-destructive">Couldn't load bookmarks. Please try again.</p> : !groups.length ? <p className="text-muted-foreground">No bookmarked questions yet.</p> : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ subject, ids }) => {
          const Icon = subjectIcon(subject);
          return <Button key={subject} variant="outline" className="h-auto min-h-20 justify-start whitespace-normal px-4 py-3 text-left" onClick={() => onPick({ title: `${subject} · Bookmarks`, subtitle: subject, ids, total: ids.length, kind: "bookmarks" })}>
            <Icon className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
            <span className="min-w-0 flex-1"><span className="block break-words font-display text-lg">{subject}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="h-3 w-3" />{ids.length} bookmarked</span></span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Button>;
        })}
      </div>
    )}
  </section>;
}