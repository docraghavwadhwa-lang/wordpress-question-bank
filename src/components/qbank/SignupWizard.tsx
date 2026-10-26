import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/profile";
import { DateWheel } from "./WheelPicker";
import { cn } from "@/lib/utils";

const YEARS = ["1st Prof", "2nd Prof", "3rd Prof Part 1", "3rd Prof Part 2", "Intern", "Graduated / PG aspirant"];
const EXAMS = ["NEET PG", "INI-CET", "FMGE", "USMLE", "University exams"];

type Data = { email: string; password: string; full_name: string; phone: string; dob: string; study_year: string; college: string; city: string; target_exam: string };

export function SignupWizard({ onSignIn }: { onSignIn: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState<Data>({ email: "", password: "", full_name: "", phone: "", dob: `${new Date().getFullYear() - 22}-01-01`, study_year: "", college: "", city: "", target_exam: "" });
  const set = (k: keyof Data, v: string) => setD((x) => ({ ...x, [k]: v }));

  const steps = [
    {
      title: "Create your account",
      sub: "Start with your email and a password.",
      ok: /^\S+@\S+\.\S+$/.test(d.email) && d.password.length >= 6,
      body: (
        <>
          <F label="Email"><Input type="email" autoFocus value={d.email} onChange={(e) => set("email", e.target.value)} /></F>
          <F label="Password (min 6 characters)"><Input type="password" value={d.password} onChange={(e) => set("password", e.target.value)} /></F>
        </>
      ),
    },
    { title: "What's your name?", sub: "This is how we'll greet you.", ok: d.full_name.trim().length > 1, body: <F label="Full name"><Input autoFocus value={d.full_name} maxLength={100} onChange={(e) => set("full_name", e.target.value)} /></F> },
    { title: "Your phone number", sub: "We'll only use it for account help.", ok: /^\+?[\d\s-]{8,16}$/.test(d.phone.trim()), body: <F label="Phone"><Input type="tel" autoFocus placeholder="+91 98765 43210" value={d.phone} onChange={(e) => set("phone", e.target.value)} /></F> },
    { title: "When were you born?", sub: "Scroll to pick your date of birth.", ok: true, body: <DateWheel value={d.dob} onChange={(v) => set("dob", v)} /> },
    { title: "Year of study", sub: "Where are you in your journey?", ok: !!d.study_year, body: <Choices list={YEARS} value={d.study_year} onPick={(v) => set("study_year", v)} /> },
    {
      title: "Your college",
      sub: "Helps us tailor your practice.",
      ok: d.college.trim().length > 1,
      body: (
        <>
          <F label="College"><Input autoFocus maxLength={150} value={d.college} onChange={(e) => set("college", e.target.value)} /></F>
          <F label="City (optional)"><Input maxLength={80} value={d.city} onChange={(e) => set("city", e.target.value)} /></F>
        </>
      ),
    },
    { title: "What are you preparing for?", sub: "Pick your main goal.", ok: !!d.target_exam, body: <Choices list={EXAMS} value={d.target_exam} onPick={(v) => set("target_exam", v)} /> },
  ];
  const s = steps[step]!;
  const last = step === steps.length - 1;

  async function finish() {
    setBusy(true);
    try {
      const details = { full_name: d.full_name.trim(), phone: d.phone.trim(), dob: d.dob, study_year: d.study_year, college: d.college.trim(), city: d.city.trim() || null, target_exam: d.target_exam };
      const { data, error } = await supabase.auth.signUp({ email: d.email.trim(), password: d.password, options: { emailRedirectTo: window.location.origin, data: { full_name: details.full_name } } });
      if (error) { toast.error(error.message); return; }
      if (data.user && data.session) await updateProfile(data.user.id, details);
      else toast.success("Check your email to confirm your account.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!s.ok) return; if (last) void finish(); else setStep(step + 1); }}>
      <div className="mt-5 flex gap-1.5">
        {steps.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-secondary")} />)}
      </div>
      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
        <h1 className="mt-6 text-3xl">{s.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{s.sub}</p>
        <div className="mt-6 space-y-4">{s.body}</div>
      </div>
      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="ghost" size="icon" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
        )}
        <Button type="submit" className="flex-1" disabled={!s.ok || busy}>{last ? (busy ? "Creating…" : "Create account") : "Continue"}</Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={onSignIn}>Sign in</button>
      </p>
    </form>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Choices({ list, value, onPick }: { list: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      {list.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)} className={cn("rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors", value === o ? "border-accent bg-accent/10 text-primary" : "border-border hover:border-accent/50")}>
          {o}
        </button>
      ))}
    </div>
  );
}
