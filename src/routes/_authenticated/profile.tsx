import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Shield, Sparkles, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, UserAvatar } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfile, photoToDataUrl, updateProfile, type Profile } from "@/lib/profile";
import { SubscriptionStatus } from "@/components/qbank/SubscriptionStatus";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleDeleteAccount() {
    if (deleteConfirmationText.trim() !== "DELETE") {
      toast.error('Please type DELETE to confirm account deletion.');
      return;
    }
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) {
        throw new Error(error.message || "Failed to delete account");
      }

      toast.success("Your account has been deleted permanently.");
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { /* ignore */ }

      await supabase.auth.signOut({ scope: "local" });
      void navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Could not delete account. Please try again.");
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  }
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
      const patch: Partial<Profile> = {
        full_name: form.full_name?.trim().slice(0, 100) || null,
        phone: form.phone?.trim().slice(0, 20) || null,
        avatar_url: form.avatar_url ?? null,
        handle: form.handle ? form.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) : null,
        dream_specialisation: form.dream_specialisation?.trim().slice(0, 80) || null,
        todays_mood: form.todays_mood?.trim().slice(0, 50) || null,
        daily_focus_goal_minutes: form.daily_focus_goal_minutes ? Number(form.daily_focus_goal_minutes) : 240,
        study_hours_visibility: form.study_hours_visibility || "all_buddies",
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
    <div className="min-h-screen pb-20">
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

        {/* Study Sanctuary Profile & Privacy Section */}
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-xl font-display font-semibold text-foreground">Study Sanctuary & Privacy</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Study Handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">@</span>
                <Input
                  className="pl-7 font-mono text-xs"
                  placeholder="e.g. raghav_mbbs"
                  value={form.handle ?? ""}
                  onChange={(e) => set("handle", e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Used for study buddy searches and group chambers.</p>
            </div>

            <Field
              label="Dream Specialisation"
              placeholder="e.g. General Surgery, Radiology, Pediatrics"
              value={form.dream_specialisation}
              onChange={(v) => set("dream_specialisation", v)}
            />

            <Field
              label="Today's Study Mood"
              placeholder="e.g. Locked in 🔥, Revising Anatomy"
              value={form.todays_mood}
              onChange={(v) => set("todays_mood", v)}
            />

            <div className="space-y-1.5">
              <Label>Daily Focus Goal (Hours)</Label>
              <Input
                type="number"
                min={1}
                max={16}
                value={form.daily_focus_goal_minutes ? Math.round(form.daily_focus_goal_minutes / 60) : 4}
                onChange={(e) => set("daily_focus_goal_minutes", Number(e.target.value) * 60)}
              />
            </div>

            <div className="sm:col-span-2 space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Study-Hours Visibility
              </Label>
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                {[
                  { id: "everyone", label: "Everyone (Public boards)" },
                  { id: "all_buddies", label: "All Buddies" },
                  { id: "hidden", label: "Hidden (Private)" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:bg-muted/40 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="study_hours_visibility"
                      value={opt.id}
                      checked={(form.study_hours_visibility || "all_buddies") === opt.id}
                      onChange={() => set("study_hours_visibility", opt.id)}
                    />
                    <span className="font-medium text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={save} disabled={saving || !profile.data}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>

        {/* Danger Zone: Delete Account */}
        <section className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-display font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Permanently delete your account, clinical progress, mistake vault, daily study streaks, focus sessions, and active subscriptions. This cannot be undone.
          </p>

          <div className="mt-4">
            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setDeleteConfirmationText("");
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border text-foreground max-w-md p-6">
                <AlertDialogHeader className="text-left">
                  <AlertDialogTitle className="text-destructive font-display text-xl flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Permanently Delete Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
                    All your Q-Bank attempts, mistake reviews, study streak history, saved bookmarks, Apothecary vials, and active subscription access will be completely wiped from Elixir servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="my-4 space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
                  </Label>
                  <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono text-sm tracking-widest text-destructive border-destructive/40 bg-background"
                    autoCapitalize="characters"
                  />
                </div>

                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel disabled={deletingAccount} className="text-xs">
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmationText.trim() !== "DELETE" || deletingAccount}
                    onClick={handleDeleteAccount}
                    className="text-xs font-semibold"
                  >
                    {deletingAccount ? "Deleting..." : "Permanently Delete My Account"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

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
