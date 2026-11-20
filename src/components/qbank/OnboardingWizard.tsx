import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COURSES, ONBOARDING_STEPS, collegeSchema, onboardingSchema, type OnboardingDetails } from "@/lib/onboarding";
import { COLLEGE_LOCATIONS, collegesForState, isListedCollege } from "@/lib/colleges";
import { cn } from "@/lib/utils";

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [course, setCourse] = useState<OnboardingDetails["course"]>();
  const [state, setState] = useState("");
  const [college, setCollege] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [collegeSearch, setCollegeSearch] = useState("");
  const suggestions = collegesForState(state, collegeSearch);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const collegeValid = isListedCollege(state, college) && collegeSchema.safeParse({ college, state, admissionYear: Number(admissionYear) }).success;
  const details = onboardingSchema.safeParse({ course, college, state, admissionYear: Number(admissionYear), phone: countryCode + phone });
  const valid = step === 0 ? !!course : step === 1 ? collegeValid : details.success;
  async function submit() {
    setError("");
    if (!valid) return;
    if (step < ONBOARDING_STEPS.length - 1) { setStep(step + 1); return; }
    if (!details.success || !isListedCollege(state, college)) return;
    setBusy(true);
    try {
      const d = details.data;
      const result = await supabase.rpc("complete_onboarding", { _study_year: d.course, _college: d.college, _state: d.state, _admission_year: d.admissionYear, _phone: d.phone });
      if (result.error) throw result.error;
      onComplete();
    } catch { setError("Couldn't save your details. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <main data-onboarding className="min-h-dvh bg-background px-5 py-8 sm:py-12">
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between border-b pb-5">
        <img src="/icon-512.png" alt="Elixir" width={44} height={44} className="h-11 w-11 rounded-[14px]" />
        <span className="text-xs font-semibold text-muted-foreground">Your study profile</span>
      </div>
      <ol aria-label="Profile setup progress" className="mt-8 grid grid-cols-3 gap-3">
        {["Course", "College", "Phone"].map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} className="flex flex-col gap-2">
          <span className={cn("h-1 rounded-full", i <= step ? "bg-accent" : "bg-border")} />
          <span className={cn("text-xs font-medium", i === step ? "text-primary" : "text-muted-foreground")}>{i + 1}. {label}</span>
        </li>)}
      </ol>
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="mt-10">
        <div className="mb-7">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-secondary text-accent"><GraduationCap className="h-6 w-6" /></span>
          <h1 className="text-4xl leading-tight text-primary">{["Where are you in MBBS?", "Your college details", "Your phone number"][step]}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{["Choose your current year of study.", "Choose your state and college.", "Add your number to complete your study profile."][step]}</p>
        </div>
        {step === 0 && <div role="radiogroup" aria-label="Choose course" className="grid gap-3">
          {COURSES.map((value, i) => <Button key={value} type="button" role="radio" aria-checked={course === value} variant="outline" onClick={() => setCourse(value)} className={cn("h-16 justify-between rounded-lg px-5 text-left", course === value && "border-accent bg-secondary")}>
            <span><span className="block text-sm font-semibold">{value}</span></span>
            <span className={cn("grid h-5 w-5 place-items-center rounded-full border", course === value ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{course === value ? <Check className="h-3 w-3" /> : <span className="sr-only">Year {i + 1}</span>}</span>
          </Button>)}
        </div>}
        {step === 1 && <div className="space-y-5">
          <div className="space-y-2"><Label htmlFor="college-state">State / location</Label><Select value={state} onValueChange={value => { setState(value); setCollege(""); setCollegeSearch(""); }}><SelectTrigger id="college-state" className="w-full"><SelectValue placeholder="Choose location" /></SelectTrigger><SelectContent>{COLLEGE_LOCATIONS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="college-name">College / institute</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="college-name" className="pl-9" value={collegeSearch} disabled={!state} maxLength={150} autoComplete="off" placeholder="Search colleges" onChange={e => setCollegeSearch(e.target.value)} /></div>
            {state && <div role="radiogroup" aria-label="Matching colleges" className="max-h-52 overflow-y-auto rounded-lg border bg-card">{suggestions.map(row => <Button key={row.id} type="button" role="radio" aria-checked={college === row.name} variant="ghost" className={cn("h-auto w-full justify-between whitespace-normal rounded-none px-3 py-3 text-left", college === row.name && "bg-secondary")} onClick={() => setCollege(row.name)}><span>{row.name}</span>{college === row.name && <Check className="h-4 w-4 shrink-0 text-accent" />}</Button>)}{suggestions.length === 0 && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">No matching colleges.</p>}</div>}
            {college && <p className="text-xs text-accent">Selected: {college}</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="admission-year">Year of admission</Label><Select value={admissionYear} onValueChange={setAdmissionYear}><SelectTrigger id="admission-year" className="w-full"><SelectValue placeholder="Choose year" /></SelectTrigger><SelectContent>{Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => String(new Date().getFullYear() - i)).map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div>
        </div>}
        {step === 2 && <div className="space-y-3"><Label htmlFor="onboarding-phone">Phone number</Label><div className="flex gap-2"><Input aria-label="Country code" value={countryCode} maxLength={4} onChange={e => setCountryCode(e.target.value)} className="w-20 shrink-0" /><Input id="onboarding-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} maxLength={18} placeholder="Phone number" onChange={e => setPhone(e.target.value)} /></div>{phone && !details.success && <p className="text-xs text-destructive">Enter a valid number with its country code.</p>}</div>}
        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        <div className="mt-10 flex gap-3">{step > 0 && <Button type="button" variant="outline" size="icon" aria-label="Previous step" disabled={busy} onClick={() => { setStep(step - 1); setError(""); }}><ArrowLeft className="h-4 w-4" /></Button>}<Button type="submit" disabled={!valid || busy} className="h-11 flex-1 rounded-lg">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{step === 2 ? "Start studying" : "Continue"}{!busy && <ArrowRight className="h-4 w-4" />}</Button></div>
      </form>
    </div>
  </main>;
}