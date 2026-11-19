import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Bookmark, CircleAlert, Search } from "lucide-react";
import { subjectIcon } from "./subject-icons";
import { inDeck, type Deck, type Marked } from "@/lib/qbank";
import { cn } from "@/lib/utils";
import { compareSubjects, subjectLabel } from "@/lib/subjects";
import { Button } from "@/components/ui/button";

export type Pick = { title: string; subtitle?: string; path?: string; total?: number; ids?: number[]; kind?: "bookmarks" | "mistakes" };
type MarkedSets = { bookmarks: Marked[]; mistakes: Marked[] };

export function SubjectGrid({ decks, marked, onPick }: { decks: Deck[]; marked?: MarkedSets | undefined; onPick: (p: Pick) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const subjects = useMemo(() => decks.filter((d) => d.depth === 1).sort((a, b) => compareSubjects(a.path, b.path)), [decks]);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hits = useMemo(() => !term ? [] : decks.filter((d) => (d.depth === 1 ? subjectLabel(d.path) : d.path.split("::").slice(1).join(" ")).toLowerCase().includes(term)).sort((a, b) => compareSubjects(a.path, b.path) || a.sort_key.localeCompare(b.sort_key)).slice(0, 40), [decks, term]);

  return (
    <>
    <label className="mb-5 flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subjects or topics" aria-label="Search subjects or topics" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
    {term ? (
      hits.length ? <div className="divide-y rounded-lg border bg-card">{hits.map((d) => {
        const parts = d.path.split("::"); const title = d.depth === 1 ? subjectLabel(d.path) : parts[parts.length - 1]!;
        return <button key={d.path} type="button" onClick={() => onPick(d.depth === 1 ? { title, path: d.path, total: d.question_count } : { title, subtitle: subjectLabel(parts[0]!), path: d.path, total: d.question_count })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary">
          <span className="min-w-0"><span className="block truncate font-medium text-primary">{title}</span>{d.depth > 1 && <span className="block truncate text-xs text-muted-foreground">{subjectLabel(parts[0]!)}{parts.length > 2 ? ` › ${parts.slice(1, -1).join(" › ")}` : ""}</span>}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{d.question_count} Qs</span>
        </button>;
      })}</div> : <p className="text-sm text-muted-foreground">No subjects or topics match “{q}”.</p>
    ) : (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <div key={s.path} className={cn(open === s.path && "sm:col-span-2 lg:col-span-3")}>
          <Tile label={subjectLabel(s.path)} icon={(() => { const I = subjectIcon(s.path); return <I className="h-5 w-5" strokeWidth={1.5} />; })()} active={open === s.path} onClick={() => setOpen(open === s.path ? null : s.path)} />
          {open === s.path && <SubjectPanel subject={s} decks={decks} marked={marked} onPick={onPick} />}
        </div>
      ))}
    </div>
    )}
    </>
  );
}

function Tile({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <Button variant="study"
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-auto min-h-[4.5rem] whitespace-normal w-full items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
        active && "border-primary bg-secondary",
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground", active && "bg-primary text-primary-foreground")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 break-words font-display text-lg leading-snug tracking-tight">{label}</span>
      <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", active && "rotate-90")} />
    </Button>
  );
}

function SubjectPanel({ subject, decks, marked, onPick }: { subject: Deck; decks: Deck[]; marked?: MarkedSets | undefined; onPick: (p: Pick) => void }) {
  const [openSec, setOpenSec] = useState<string | null>(null);
  const sections = decks.filter((d) => d.depth === 2 && d.subject === subject.path);
  return (
    <div className="mt-3 border-l-2 border-primary/20 py-3 pl-4 sm:pl-5">
      <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <h3 className="text-xl text-primary">{subjectLabel(subject.path)}</h3>
        <Button variant="study"
          type="button"
          onClick={() => onPick({ title: subjectLabel(subject.path), path: subject.path, total: subject.question_count })}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-primary hover:text-primary-foreground"
        >
          Practise whole subject
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {sections.map((sec) => {
          const name = sec.path.split(" > ").pop() ?? sec.path;
          const chapters = decks.filter((d) => d.depth === 3 && d.path.startsWith(sec.path + " > "));
          const isOpen = openSec === sec.path;
          return (
            <div key={sec.path}>
              <Button variant="study"
                type="button"
                onClick={() => setOpenSec(isOpen ? null : sec.path)}
                className="flex h-auto w-full items-center gap-3 whitespace-normal rounded-none bg-transparent px-4 py-3 text-left text-foreground shadow-none hover:bg-muted"
              >
                <span className="min-w-0 flex-1 break-words font-medium leading-snug">{name}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </Button>
              {isOpen && (
                <div className="grid gap-2 bg-muted/50 p-3 sm:grid-cols-2">
                  <ChapterBtn strong label={`Practise all of ${name}`} onClick={() => onPick({ title: name, subtitle: subjectLabel(subject.path), path: sec.path, total: sec.question_count })} />
                  {chapters.map((ch) => {
                    const cn2 = ch.path.split(" > ").pop() ?? ch.path;
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
        <Button variant="study" type="button" className={chip} onClick={() => onPick({ title: `${title} · Bookmarks`, subtitle, ids: b, kind: "bookmarks", total: b.length })}>
          <Bookmark className="h-3.5 w-3.5 text-accent" /> {b.length} bookmarked
        </Button>
      )}
      {m.length > 0 && (
        <Button variant="study" type="button" className={chip} onClick={() => onPick({ title: `${title} · Mistake vault`, subtitle, ids: m, kind: "mistakes", total: m.length })}>
          <CircleAlert className="h-3.5 w-3.5 text-destructive" /> {m.length} mistakes
        </Button>
      )}
    </div>
  );
}

function ChapterBtn({ label, strong, flat, onClick }: { label: string; strong?: boolean; flat?: boolean; onClick: () => void }) {
  return (
    <Button variant="study"
      type="button"
      onClick={onClick}
      className={cn(
        "h-auto w-full justify-start whitespace-normal rounded-lg border bg-card px-3 py-2.5 text-left text-sm leading-snug break-words hover:border-accent hover:text-primary",
        flat && "border-transparent",
        strong && "border-accent/50 font-semibold text-primary",
      )}
    >
      {label}
    </Button>
  );
}
