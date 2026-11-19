import { Bookmark, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupBookmarks, type Marked } from "@/lib/qbank";
import { subjectIcon } from "./subject-icons";
import type { Pick } from "./SubjectGrid";
import { compareSubjects, subjectLabel } from "@/lib/subjects";

export function Bookmarks({ marked, loading, error, onPick, kind = "bookmarks" }: {
  marked?: Marked[] | undefined; loading: boolean; error: boolean; onPick: (pick: Pick) => void; kind?: "bookmarks" | "mistakes";
}) {
  const groups = groupBookmarks(marked ?? []).sort((a, b) => compareSubjects(a.subject, b.subject));
  const mistakes = kind === "mistakes";
  const label = mistakes ? "Mistake vault" : "Bookmarks";
  return <section className="mt-6 border-t pt-6">
    <h2 className="mb-4 font-display text-2xl text-primary">{mistakes ? "Mistake vault" : "Bookmarked questions"}</h2>
    {loading ? <p className="text-muted-foreground">Loading saved questions…</p> : error ? <p className="text-destructive">Couldn't load saved questions. Please try again.</p> : !groups.length ? <p className="text-muted-foreground">{mistakes ? "No mistakes to revisit yet." : "No bookmarked questions yet."}</p> : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ subject, ids }) => {
          const Icon = subjectIcon(subject);
          return <Button key={subject} variant="study" className="h-auto min-h-20 justify-start whitespace-normal px-4 py-3 text-left" onClick={() => onPick({ title: `${subjectLabel(subject)} · ${label}`, subtitle: subject, ids, total: ids.length, kind })}>
            <Icon className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
            <span className="min-w-0 flex-1"><span className="block break-words font-display text-lg">{subjectLabel(subject)}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="h-3 w-3" />{ids.length} {mistakes ? "to revisit" : "bookmarked"}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Button>;
        })}
      </div>
    )}
  </section>;
}