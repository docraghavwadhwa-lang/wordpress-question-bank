import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TARGET_DAYS, TIERS } from "@/lib/streak";
import { updateProfile, type Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function StreakSettings({ userId, profile }: { userId: string | undefined; profile: Profile | null | undefined }) {
  const qc = useQueryClient();
  const [goal, setGoal] = useState(20);
  const [days, setDays] = useState("30");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) { setGoal(profile.streak_goal); setDays(String(profile.streak_target_days)); }
  }, [profile]);
  const target = Number(days);
  async function save() {
    if (!userId || !Number.isInteger(target) || target < 1 || target > 1000) return;
    setSaving(true);
    try {
      await updateProfile(userId, { streak_goal: goal, streak_target_days: target });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Streak settings saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save streak settings"); }
    finally { setSaving(false); }
  }
  return <section className="mt-6 border-y py-6" aria-label="Streak settings">
    <h2 className="font-display text-2xl text-primary">Your streak goals</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {TIERS.map(t => <Button key={t.id} variant="study" aria-pressed={goal === t.goal} onClick={() => setGoal(t.goal)} className={cn("h-auto flex-col items-start whitespace-normal p-4 text-left", goal === t.goal && "border-accent bg-secondary")}><span className="font-display text-xl text-primary">{t.name}</span><span className="text-sm text-accent">{t.goal} questions / day</span></Button>)}
    </div>
    <p className="mt-5 text-sm font-medium text-primary">Streak target</p>
    <div className="mt-2 flex flex-wrap gap-2">{TARGET_DAYS.map(d => <Button key={d} size="sm" variant={target === d ? "default" : "outline"} aria-pressed={target === d} onClick={() => setDays(String(d))}>{d} days</Button>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground">Custom target<Input aria-label="Custom streak days" inputMode="numeric" className="w-24" value={days} onChange={e => setDays(e.target.value.replace(/\D/g, "").slice(0, 4))} />days</label><Button disabled={saving || !profile || !Number.isInteger(target) || target < 1 || target > 1000} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</Button></div>
  </section>;
}