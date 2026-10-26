import { useEffect, useRef, useState } from "react";

const ITEM = 40;
const VISIBLE = 5;

/** One iOS-style scroll wheel column with a 3D drum effect. */
function Wheel({ items, value, onChange, label }: { items: { label: string; value: number }[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.value === value));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== idx) {
      el.scrollTop = idx * ITEM;
      setTop(idx * ITEM);
    }
  }, [idx, items.length]);

  function onScroll() {
    const el = ref.current!;
    setTop(el.scrollTop);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      if (items[i] && items[i].value !== value) onChange(items[i].value);
    }, 80);
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      className="no-scrollbar relative flex-1 snap-y snap-mandatory overflow-y-scroll"
      style={{ height: ITEM * VISIBLE, perspective: 600 }}
    >
      <div style={{ height: ITEM * 2 }} />
      {items.map((it, i) => {
        const off = i - top / ITEM;
        const a = Math.max(-80, Math.min(80, off * 22));
        return (
          <button
            type="button"
            key={it.value}
            role="option"
            aria-selected={it.value === value}
            onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" })}
            className="block w-full snap-center text-center font-display text-xl text-primary"
            style={{ height: ITEM, lineHeight: `${ITEM}px`, transform: `rotateX(${-a}deg)`, opacity: Math.max(0.15, 1 - Math.abs(off) * 0.32) }}
          >
            {it.label}
          </button>
        );
      })}
      <div style={{ height: ITEM * 2 }} />
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date of birth picker: day / month / year wheels. Value is YYYY-MM-DD. */
export function DateWheel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => thisYear - 15 - i).map((v) => ({ label: String(v), value: v }));
  const days = new Date(y, m, 0).getDate();
  const set = (yy: number, mm: number, dd: number) => {
    const max = new Date(yy, mm, 0).getDate();
    onChange(`${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(dd, max)).padStart(2, "0")}`);
  };
  return (
    <div className="relative flex gap-2 rounded-2xl bg-secondary/60 px-3">
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 rounded-xl border border-accent/40 bg-card/70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-background to-transparent" />
      <Wheel label="Day" items={Array.from({ length: days }, (_, i) => ({ label: String(i + 1), value: i + 1 }))} value={d} onChange={(v) => set(y, m, v)} />
      <Wheel label="Month" items={MONTHS.map((l, i) => ({ label: l, value: i + 1 }))} value={m} onChange={(v) => set(y, v, d)} />
      <Wheel label="Year" items={years} value={y} onChange={(v) => set(v, m, d)} />
    </div>
  );
}
