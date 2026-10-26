import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, UserAvatar } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfile, photoToDataUrl, updateProfile, type Profile } from "@/lib/profile";
import { TARGET_DAYS, TIERS } from "@/lib/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile | MedQuiz by Nirmaya Care" },
      { name: "description", content: "Edit your photo, personal details and daily streak goal." },
      { property: "og:title", content: "Your profile | MedQuiz by Nirmaya Care" },
      { property: "og:description", content: "Edit your photo, personal details and daily streak goal." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: () => fetchProfile(user!.id), enabled: !!user });
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const googlePhoto = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined;
  const set = (k: keyof Profile, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    set("avatar_url", await photoToDataUrl(f));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const patch = {
        full_name: form.full_name?.trim().slice(0, 100) || null,
        phone: form.phone?.trim().slice(0, 20) || null,
        college: form.college?.trim().slice(0, 150) || null,
        study_year: form.study_year?.trim().slice(0, 50) || null,
        avatar_url: form.avatar_url ?? null,
        streak_goal: form.streak_goal ?? 20,
        streak_target_days: form.streak_target_days ?? 30,
      };
      await updateProfile(user.id, patch);
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Account</p>
        <h1 className="text-5xl text-primary">Your <em>profile</em></h1>

        <section className="mt-8 rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <UserAvatar src={form.avatar_url} name={form.full_name || user?.email} size={88} />
              <button type="button" onClick={() => file.current?.click()} aria-label="Change photo" className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground shadow">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={file} type="file" accept="image/*" hidden onChange={pickPhoto} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => file.current?.click()}>Upload photo</Button>
              {googlePhoto && form.avatar_url !== googlePhoto && (
                <Button variant="outline" size="sm" onClick={() => set("avatar_url", googlePhoto)}>Use Google photo</Button>
              )}
              {form.avatar_url && <Button variant="ghost" size="sm" onClick={() => set("avatar_url", null)}>Remove</Button>}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} />
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} type="tel" />
            <Field label="Year of study" value={form.study_year} onChange={(v) => set("study_year", v)} placeholder="e.g. 3rd Prof / Intern / PG aspirant" />
            <div className="sm:col-span-2">
              <Field label="College" value={form.college} onChange={(v) => set("college", v)} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-display text-2xl text-primary">Your streak</h2>
          <p className="text-sm text-muted-foreground">Choose how many questions you'll do each day.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set("streak_goal", t.goal)}
                className={cn("rounded-xl border-2 p-4 text-left transition-colors", form.streak_goal === t.goal ? "border-accent bg-accent/10" : "border-border hover:border-accent/50")}
              >
                <div className="font-display text-2xl text-primary">{t.name}</div>
                <div className="text-sm font-semibold text-accent">{t.goal} questions / day</div>
                <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm font-medium text-primary">How long do you want to build this streak?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TARGET_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("streak_target_days", d)}
                className={cn("rounded-full border px-4 py-1.5 text-sm", form.streak_target_days === d ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}
              >
                {d} days
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={save} disabled={saving || !profile.data}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value?: string | null; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
