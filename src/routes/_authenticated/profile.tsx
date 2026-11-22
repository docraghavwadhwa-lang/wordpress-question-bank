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
import { SubscriptionStatus } from "@/components/qbank/SubscriptionStatus";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile | Elixir" },
      { name: "description", content: "Manage your photo, personal details and Elixir subscription." },
      { property: "og:title", content: "Your profile | Elixir by Nirmaya Care" },
      { property: "og:description", content: "Manage your photo, personal details and Elixir subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: () => user ? fetchProfile(user.id) : Promise.resolve(null), enabled: !!user });
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const googlePhoto = (user?.user_metadata?.["avatar_url"] || user?.user_metadata?.["picture"]) as string | undefined;
  const set = (k: keyof Profile, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    set("avatar_url", await photoToDataUrl(f));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const patch = {
        full_name: form.full_name?.trim().slice(0, 100) || null,
        phone: form.phone?.trim().slice(0, 20) || null,
        avatar_url: form.avatar_url ?? null,
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
        <SubscriptionStatus />

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
            <div className="space-y-1.5"><Label>Year of study</Label><Input value={form.study_year ?? ""} disabled /></div>
            <div className="sm:col-span-2">
              <div className="space-y-1.5"><Label>College</Label><Input value={form.college ?? ""} disabled /><p className="text-xs text-muted-foreground">Year of study and college are locked after setup and can't be changed.</p></div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={save} disabled={saving || !profile.data}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value?: string | null | undefined; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
