import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Bookmark, CircleAlert } from "lucide-react";
import { subjectIcon } from "./subject-icons";
import { inDeck, type Deck, type Marked } from "@/lib/qbank";
import { cn } from "@/lib/utils";

export type Pick = { title: string; subtitle?: string; path?: string; total?: number; ids?: number[]; kind?: "bookmarks" | "mistakes" };
type MarkedSets = { bookmarks: Marked[]; mistakes: Marked[] };

export function SubjectGrid({ decks, marked, onPick }: { decks: Deck[]; marked?: MarkedSets | undefined; onPick: (p: Pick) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const subjects = useMemo(() => decks.filter((d) => d.depth === 1), [decks]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <div key={s.path} className={cn(open === s.path && "sm:col-span-2 lg:col-span-3")}>
          <Tile label={s.path} icon={(() => { const I = subjectIcon(s.path); return <I className="h-5 w-5" strokeWidth={1.5} />; })()} active={open === s.path} onClick={() => setOpen(open === s.path ? null : s.path)} />
          {open === s.path && <SubjectPanel subject={s} decks={decks} marked={marked} onPick={onPick} />}
        </div>
      ))}
    </div>
  );
}

function Tile({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[4.5rem] w-full items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
        active && "border-primary bg-secondary",
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground", active && "bg-primary text-primary-foreground")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 break-words font-display text-lg leading-snug tracking-tight">{label}</span>
      <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", active && "rotate-90")} />
    </button>
  );
}

function SubjectPanel({ subject, decks, marked, onPick }: { subject: Deck; decks: Deck[]; marked?: MarkedSets | undefined; onPick: (p: Pick) => void }) {
  const [openSec, setOpenSec] = useState<string | null>(null);
  const sections = decks.filter((d) => d.depth === 2 && d.subject === subject.path);
  return (
    <div className="mt-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl text-primary">{subject.path}</h3>
        <button
          type="button"
          onClick={() => onPick({ title: subject.path, path: subject.path, total: subject.question_count })}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-primary hover:text-primary-foreground"
        >
          Practise whole subject
        </button>
      </div>
      <div className="divide-y rounded-lg border">
        {sections.map((sec) => {
          const name = sec.path.split(" > ").pop()!;
          const chapters = decks.filter((d) => d.depth === 3 && d.path.startsWith(sec.path + " > "));
          const isOpen = openSec === sec.path;
          return (
            <div key={sec.path}>
              <button
                type="button"
                onClick={() => setOpenSec(isOpen ? null : sec.path)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
              >
                <span className="min-w-0 flex-1 break-words font-medium leading-snug">{name}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="grid gap-2 bg-muted/50 p-3 sm:grid-cols-2">
                  <ChapterBtn strong label={`Practise all of ${name}`} onClick={() => onPick({ title: name, subtitle: subject.path, path: sec.path, total: sec.question_count })} />
                  {chapters.map((ch) => {
                    const cn2 = ch.path.split(" > ").pop()!;
                    return (
                      <div key={ch.path} className="rounded-lg border bg-card">
                        <ChapterBtn
                          flat
                          label={cn2}
                          onClick={() => onPick({ title: cn2, subtitle: `${subject.path} › ${name}`, path: ch.path, total: ch.question_count })}
                        />
                        <MarkChips path={ch.path} title={cn2} subtitle={`${subject.path} › ${name}`} marked={marked} onPick={onPick} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarkChips({ path, title, subtitle, marked, onPick }: { path: string; title: string; subtitle: string; marked?: MarkedSets | undefined; onPick: (p: Pick) => void }) {
  if (!marked) return null;
  const b = inDeck(marked.bookmarks, path);
  const m = inDeck(marked.mistakes, path);
  if (!b.length && !m.length) return null;
  const chip = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-primary";
  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2.5">
      {b.length > 0 && (
        <button type="button" className={chip} onClick={() => onPick({ title: `${title} · Bookmarks`, subtitle, ids: b, kind: "bookmarks", total: b.length })}>
          <Bookmark className="h-3.5 w-3.5 text-accent" /> {b.length} bookmarked
        </button>
      )}
      {m.length > 0 && (
        <button type="button" className={chip} onClick={() => onPick({ title: `${title} · Mistake vault`, subtitle, ids: m, kind: "mistakes", total: m.length })}>
          <CircleAlert className="h-3.5 w-3.5 text-destructive" /> {m.length} mistakes
        </button>
      )}
    </div>
  );
}

function ChapterBtn({ label, strong, flat, onClick }: { label: string; strong?: boolean; flat?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border bg-card px-3 py-2.5 text-left text-sm leading-snug break-words hover:border-accent hover:text-primary",
        flat && "border-transparent",
        strong && "border-accent/50 font-semibold text-primary",
      )}
    >
      {label}
    </button>
  );
}
