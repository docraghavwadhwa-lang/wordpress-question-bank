import { isNativeApp } from "@/lib/native-auth";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Bookmark, CircleAlert, Search, Lock, Star, Image as ImageIcon } from "lucide-react";
import { subjectIcon } from "./subject-icons";
import { inDeck, type Deck, type Marked } from "@/lib/qbank";
import { cn } from "@/lib/utils";
import { compareSubjects, subjectLabel, deckParts, searchDecks } from "@/lib/subjects";
import { QuestionBrand } from "./QuestionBrand";
import { Button } from "@/components/ui/button";
import { TrialRequestButton } from "./TrialRequest";

export type Pick = { title: string; subtitle?: string; path?: string; total?: number; ids?: number[]; kind?: "bookmarks" | "mistakes"; imagesOnly?: boolean };
type MarkedSets = { bookmarks: Marked[]; mistakes: Marked[] };

export function SubjectGrid({ decks, marked, locked, onPick, imagesEnabled = true, bookmarksEnabled = true, mistakesEnabled = true }: { decks: Deck[]; marked?: MarkedSets | undefined; locked?: Set<string> | undefined; onPick: (p: Pick) => void; imagesEnabled?: boolean; bookmarksEnabled?: boolean; mistakesEnabled?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);
  const toPlans = () => setProOpen(true);
  const subjects = useMemo(() => decks.filter((d) => d.depth === 1).sort((a, b) => compareSubjects(a.path, b.path)), [decks]);
  const [q, setQ] = useState("");
  // The website shows its own header branding, so the centred logo appears only in the app.
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  const term = q.trim().toLowerCase();
  const scoped = open && open !== IMAGES ? decks.filter(d => d.subject === open) : decks;
  const hits = useMemo(() => searchDecks(scoped, term), [scoped, term]);
  const searchLabel = open && open !== IMAGES ? `Search ${subjectLabel(open)} topics` : "Search subjects, topics, subtopics";

  return (
    <>
    {native && <QuestionBrand />}
    <div className="mb-5 flex items-center gap-2"><label className="min-w-0 flex-1 flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
    {!open && <Button asChild variant="outline" size="icon" className="shrink-0 rounded-full" title="Elixir guide"><Link to="/guide" aria-label="Elixir guide"><Info className="h-5 w-5" /></Link></Button>}
    </div>
    {term ? (
      hits.length ? <><p className="mb-3 text-xs text-muted-foreground">{hits.length} matches</p><div className="divide-y rounded-lg border bg-card">{hits.map((d) => {
        const parts = deckParts(d.path); const title = d.depth === 1 ? subjectLabel(d.path) : parts.at(-1) ?? d.path;
        const subtitle = [subjectLabel(parts[0] ?? d.subject), ...parts.slice(1, -1)].join(" › ");
        const isLocked = !!locked?.has(d.subject) && !(d.depth === 3 && d.is_free);
        return <Button variant="ghost" key={d.path} type="button" onClick={() => isLocked ? toPlans() : onPick({ title, ...(d.depth > 1 ? { subtitle } : {}), path: d.path, total: d.question_count })} className="flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-none px-4 py-3 text-left hover:bg-secondary">
          <span className="min-w-0"><span className="block break-words font-medium text-primary">{title}</span>{d.depth > 1 && <span className="block break-words text-xs font-normal text-muted-foreground">{subtitle}</span>}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">{d.depth === 3 && <Rating />}{isLocked && d.depth === 3 && <LockBadge />}{d.question_count} Qs <ChevronRight className="ml-1 inline h-3 w-3" /></span>
        </Button>;
      })}</div></> : <p className="text-sm text-muted-foreground">No subjects, topics or subtopics match “{q}”.</p>
    ) : (
    open === IMAGES && imagesEnabled ? <ImagePanel subjects={subjects} decks={decks} locked={locked} onPick={onPick} onLocked={toPlans} onBack={() => setOpen(null)} /> :
    (() => { const s = subjects.find((x) => x.path === open); return s
      ? <SubjectPanel subject={s} decks={decks} marked={marked ? { bookmarks: bookmarksEnabled ? marked.bookmarks : [], mistakes: mistakesEnabled ? marked.mistakes : [] } : undefined} locked={locked} onPick={onPick} onLocked={toPlans} onBack={() => setOpen(null)} />
      : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <Tile key={s.path} label={subjectLabel(s.path)} icon={(() => { const I = subjectIcon(s.path); return <I className="h-5 w-5" strokeWidth={1.5} />; })()} onClick={() => { setOpen(s.path); window.scrollTo({ top: 0 }); }} />
      ))}
      {imagesEnabled && <><hr className="col-span-full my-3 border-border" />
      <Tile label="Image-based questions" icon={<ImageIcon className="h-5 w-5" strokeWidth={1.5} />} onClick={() => { setOpen(IMAGES); window.scrollTo({ top: 0 }); }} /></>}
    </div>; })()
    )}
    <Dialog open={proOpen} onOpenChange={setProOpen}>
      <DialogContent className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent"><Crown className="h-7 w-7" /></span>
        <DialogHeader className="sm:text-center"><DialogTitle className="text-center font-display text-2xl text-primary">Unlock with Pro</DialogTitle>
        <DialogDescription className="text-center">This Q-bank is part of Elixir Pro. Subscribe to unlock every Q-bank, full subjects and explanations.</DialogDescription></DialogHeader>
        <Button asChild className="mt-2 w-full"><Link to="/plans" onClick={() => setProOpen(false)}>Go Pro</Link></Button>
        <TrialRequestButton />
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

/** Q-bank ratings are fixed at 5 stars for every Q-bank. */
export const QBANK_RATING = 5;
export function Rating() {
  return <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-gold text-gold" />{QBANK_RATING.toFixed(1)}</span>;
}

function SubjectPanel({ subject, decks, marked, locked, onPick, onLocked, onBack }: { subject: Deck; decks: Deck[]; marked?: MarkedSets | undefined; locked?: Set<string> | undefined; onPick: (p: Pick) => void; onLocked: () => void; onBack: () => void }) {
  const sections = decks.filter((d) => d.depth === 2 && d.subject === subject.path);
  const isLocked = locked?.has(subject.subject);
  const modules = decks.filter((d) => d.depth === 3 && d.subject === subject.path).length;
  return (
    <div>
      <Button variant="ghost" type="button" onClick={onBack} className="-ml-2 mb-2 gap-1 px-2 text-muted-foreground"><ChevronLeft className="h-4 w-4" />All subjects</Button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-3xl text-primary">{subjectLabel(subject.path)}</h2>
        <p className="text-sm text-muted-foreground">{modules} Q-bank modules</p></div>
        <Button variant="study" type="button" onClick={() => isLocked ? onLocked() : onPick({ title: subjectLabel(subject.path), path: subject.path, total: subject.question_count })}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-primary hover:text-primary-foreground">Practise whole subject</Button>
      </div>
      {isLocked && (() => { const free = decks.filter((d) => d.depth === 3 && d.subject === subject.path && d.is_free); return free.length > 0 && (
        <section className="mb-7 rounded-xl border border-success/40 bg-success/10 p-4">
          <h3 className="mb-1 font-display text-xl text-primary">Free Q-banks</h3>
          <p className="mb-3 text-xs text-muted-foreground">Start practising these right away, no subscription needed.</p>
          <div className="space-y-2">{free.map((ch) => { const parts = ch.path.split(" > "); const title = parts.at(-1) ?? ch.path; const sec = parts.at(-2) ?? "";
            return <button key={ch.path} type="button" onClick={() => onPick({ title, subtitle: `${subjectLabel(subject.path)} › ${sec}`, path: ch.path, total: ch.question_count })} className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-secondary/60">
              <span className="min-w-0 flex-1"><span className="block break-words font-medium text-foreground">{title}</span><span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground"><Rating /><span>•</span>{ch.question_count} Ques</span></span>
              <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">Free</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>; })}</div>
        </section>); })()}
      <div className="space-y-7">
        {sections.map((sec) => {
          const name = sec.path.split(" > ").pop() ?? sec.path;
          const chapters = decks.filter((d) => d.depth === 3 && d.path.startsWith(sec.path + " > "));
          return (
            <section key={sec.path}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{name}</h3>
                <button type="button" className="shrink-0 text-xs font-semibold text-accent hover:underline" onClick={() => isLocked ? onLocked() : onPick({ title: name, subtitle: subjectLabel(subject.path), path: sec.path, total: sec.question_count })}>Practise all</button>
              </div>
              <ol className="space-y-3">
                {chapters.map((ch, n) => {
                  const title = ch.path.split(" > ").pop() ?? ch.path;
                  const lock = !!isLocked && !ch.is_free;
                  return (
                    <li key={ch.path} className="relative flex gap-3">
                      <span className="flex w-7 shrink-0 flex-col items-center">
                        <span className="mt-4 flex h-7 w-7 items-center justify-center rounded-full border bg-card text-xs font-semibold text-primary">{n + 1}</span>
                        {n + 1 < chapters.length && <span className="w-0.5 flex-1 bg-border" />}
                      </span>
                      <div className="min-w-0 flex-1 rounded-xl border bg-card shadow-sm">
                        <button type="button" onClick={() => lock ? onLocked() : onPick({ title, subtitle: `${subjectLabel(subject.path)} › ${name}`, path: ch.path, total: ch.question_count })}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/60 rounded-xl">
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-medium leading-snug text-foreground">{title}</span>
                            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Rating /><span>•</span>{ch.question_count} Ques</span>
                          </span>
                          {lock && <LockBadge />}
                          {!!isLocked && !!ch.is_free && <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">Free</span>}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                        <MarkChips path={ch.path} title={title} subtitle={`${subjectLabel(subject.path)} › ${name}`} marked={marked} onPick={onPick} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
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


const IMAGES = "__image-questions";

/** Subject → chapter picker; the chapter's questions are filtered to those with an image in the stem. */
function ImagePanel({ subjects, decks, locked, onPick, onLocked, onBack }: { subjects: Deck[]; decks: Deck[]; locked?: Set<string> | undefined; onPick: (p: Pick) => void; onLocked: () => void; onBack: () => void }) {
  const [subject, setSubject] = useState<Deck | null>(null);
  if (!subject) return <div>
    <Button variant="ghost" type="button" onClick={onBack} className="-ml-2 mb-2 gap-1 px-2 text-muted-foreground"><ChevronLeft className="h-4 w-4" />All subjects</Button>
    <h2 className="font-display text-3xl text-primary">Image-based questions</h2>
    <p className="mb-5 text-sm text-muted-foreground">Choose a subject, then a chapter. Only questions with an image are included.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(s => { const I = subjectIcon(s.path); return <Tile key={s.path} label={subjectLabel(s.path)} icon={<I className="h-5 w-5" strokeWidth={1.5} />} onClick={() => { setSubject(s); window.scrollTo({ top: 0 }); }} />; })}</div>
  </div>;
  const chapters = decks.filter(d => d.depth === 2 && d.subject === subject.path);
  const isLocked = !!locked?.has(subject.subject);
  return <div>
    <Button variant="ghost" type="button" onClick={() => setSubject(null)} className="-ml-2 mb-2 gap-1 px-2 text-muted-foreground"><ChevronLeft className="h-4 w-4" />Image-based subjects</Button>
    <h2 className="font-display text-3xl text-primary">{subjectLabel(subject.path)}</h2>
    <p className="mb-5 text-sm text-muted-foreground">Image-based questions by chapter</p>
    <div className="divide-y rounded-lg border bg-card">{chapters.map(ch => { const name = ch.path.split(" > ").pop() ?? ch.path;
      return <Button variant="ghost" key={ch.path} type="button" onClick={() => isLocked ? onLocked() : onPick({ title: name, subtitle: `${subjectLabel(subject.path)} · Image-based`, path: ch.path, imagesOnly: true })} className="flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-none px-4 py-3 text-left hover:bg-secondary">
        <span className="min-w-0 break-words font-medium text-primary">{name}</span>
        <span className="flex shrink-0 items-center gap-2">{isLocked && <LockBadge />}<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
      </Button>; })}</div>
  </div>;
}
