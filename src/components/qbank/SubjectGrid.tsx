import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Bookmark, CircleAlert, Search, Lock } from "lucide-react";
import { subjectIcon } from "./subject-icons";
import { inDeck, type Deck, type Marked } from "@/lib/qbank";
import { cn } from "@/lib/utils";
import { compareSubjects, subjectLabel, deckParts, searchDecks } from "@/lib/subjects";
import { Button } from "@/components/ui/button";

export type Pick = { title: string; subtitle?: string; path?: string; total?: number; ids?: number[]; kind?: "bookmarks" | "mistakes" };
type MarkedSets = { bookmarks: Marked[]; mistakes: Marked[] };

export function SubjectGrid({ decks, marked, locked, onPick }: { decks: Deck[]; marked?: MarkedSets | undefined; locked?: Set<string> | undefined; onPick: (p: Pick) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);
  const toPlans = () => setProOpen(true);
  const subjects = useMemo(() => decks.filter((d) => d.depth === 1).sort((a, b) => compareSubjects(a.path, b.path)), [decks]);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hits = useMemo(() => searchDecks(decks, term), [decks, term]);

  return (
    <>
    <label className="mb-5 flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subjects, topics, subtopics" aria-label="Search subjects, topics, subtopics" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
    {term ? (
      hits.length ? <><p className="mb-3 text-xs text-muted-foreground">{hits.length} matches</p><div className="divide-y rounded-lg border bg-card">{hits.map((d) => {
        const parts = deckParts(d.path); const title = d.depth === 1 ? subjectLabel(d.path) : parts.at(-1) ?? d.path;
        const subtitle = [subjectLabel(parts[0] ?? d.subject), ...parts.slice(1, -1)].join(" › ");
        const isLocked = !!locked?.has(d.subject) && !(d.depth === 3 && d.is_free);
        return <Button variant="ghost" key={d.path} type="button" onClick={() => isLocked ? toPlans() : onPick({ title, ...(d.depth > 1 ? { subtitle } : {}), path: d.path, total: d.question_count })} className="flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-none px-4 py-3 text-left hover:bg-secondary">
          <span className="min-w-0"><span className="block break-words font-medium text-primary">{title}</span>{d.depth > 1 && <span className="block break-words text-xs font-normal text-muted-foreground">{subtitle}</span>}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">{isLocked && d.depth === 3 && <LockBadge />}{d.question_count} Qs <ChevronRight className="ml-1 inline h-3 w-3" /></span>
        </Button>;
      })}</div></> : <p className="text-sm text-muted-foreground">No subjects, topics or subtopics match “{q}”.</p>
    ) : (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <div key={s.path} className={cn(open === s.path && "sm:col-span-2 lg:col-span-3")}>
          <Tile label={subjectLabel(s.path)} icon={(() => { const I = subjectIcon(s.path); return <I className="h-5 w-5" strokeWidth={1.5} />; })()} active={open === s.path} onClick={() => setOpen(open === s.path ? null : s.path)} />
          {open === s.path && <SubjectPanel subject={s} decks={decks} marked={marked} locked={locked} onPick={onPick} onLocked={toPlans} />}
        </div>
      ))}
    </div>
    )}
    <Dialog open={proOpen} onOpenChange={setProOpen}>
      <DialogContent className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent"><Crown className="h-7 w-7" /></span>
        <DialogHeader className="sm:text-center"><DialogTitle className="text-center font-display text-2xl text-primary">Unlock with Pro</DialogTitle>
        <DialogDescription className="text-center">This Q-bank is part of Elixir Pro. Subscribe to unlock every Q-bank, full subjects and explanations.</DialogDescription></DialogHeader>
        <Button asChild className="mt-2 w-full"><Link to="/plans" onClick={() => setProOpen(false)}>Go Pro</Link></Button>
        <Button variant="ghost" className="w-full" onClick={() => setProOpen(false)}>Maybe later</Button>
      </DialogContent>
    </Dialog>
    </>
  );
}

function LockBadge() {
  return <span title="Locked — 10% free, unlock the rest with a Pro plan" className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"><Lock className="h-3 w-3" />Pro</span>;
}

function Tile({ label, icon, active, locked, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; locked?: boolean; onClick: () => void }) {
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

function SubjectPanel({ subject, decks, marked, locked, onPick, onLocked }: { subject: Deck; decks: Deck[]; marked?: MarkedSets | undefined; locked?: Set<string> | undefined; onPick: (p: Pick) => void; onLocked: () => void }) {
  const [openSec, setOpenSec] = useState<string | null>(null);
  const sections = decks.filter((d) => d.depth === 2 && d.subject === subject.path);
  const isLocked = locked?.has(subject.subject);
  return (
    <div className="mt-3 border-l-2 border-primary/20 py-3 pl-4 sm:pl-5">
      <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <h3 className="text-xl text-primary">{subjectLabel(subject.path)}</h3>
        <Button variant="study"
          type="button"
          onClick={() => isLocked ? onLocked() : onPick({ title: subjectLabel(subject.path), path: subject.path, total: subject.question_count })}
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
                  <ChapterBtn strong label={`Practise all of ${name}`} onClick={() => isLocked ? onLocked() : onPick({ title: name, subtitle: subjectLabel(subject.path), path: sec.path, total: sec.question_count })} />
                  {chapters.map((ch) => {
                    const cn2 = ch.path.split(" > ").pop() ?? ch.path;
                    return (
                      <div key={ch.path} className="rounded-lg border bg-card">
                        <ChapterBtn
                          flat
                          label={cn2}
                          locked={!!isLocked && !ch.is_free}
                          free={!!isLocked && !!ch.is_free}
                          onClick={() => isLocked && !ch.is_free ? onLocked() : onPick({ title: cn2, subtitle: `${subject.path} › ${name}`, path: ch.path, total: ch.question_count })}
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

function ChapterBtn({ label, strong, flat, locked, free, onClick }: { label: string; strong?: boolean; flat?: boolean; locked?: boolean; free?: boolean; onClick: () => void }) {
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
      <span className="min-w-0 flex-1">{label}</span>
      {locked && <span className="ml-2 shrink-0"><LockBadge /></span>}{free && <span className="ml-2 shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">Free</span>}
    </Button>
  );
}
