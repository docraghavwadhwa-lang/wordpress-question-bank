import { forwardRef } from "react";
import {
  Baby, Bone, Brain, Ear, Eye, FlaskConical, Sparkles, HeartPulse, Microscope, Pill, TestTubes, Radiation, Scale,
  Scissors, ShieldPlus, Skull, Stethoscope, Syringe, Users, BookOpen, type LucideIcon, type LucideProps,
} from "lucide-react";

// Line-art pregnant woman in profile, drawn to match lucide's 24px stroke style.
const PregnantWoman = forwardRef<SVGSVGElement, LucideProps>(({ className, strokeWidth = 2, ...rest }, ref) => (
  <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...(rest as object)}>
    <circle cx="11" cy="3.5" r="2.2" />
    <path d="M9 7.5c-1.4 1-2 2.6-2 4.5v2.5h2" />
    <path d="M12.5 7.5c.8.8 1.2 1.8 1.1 3 2.6.7 4.1 2.6 4.1 4.6 0 2.3-2 3.4-4.4 3.4H9.5" />
    <path d="M9.5 18.5V22" /><path d="M13 18.5V22" />
    <path d="M9 12h3" />
  </svg>
));
PregnantWoman.displayName = "PregnantWoman";

const MAP: Record<string, LucideIcon> = {
  anaesthesia: Syringe, anatomy: Skull, biochemistry: FlaskConical, dermatology: Sparkles, ent: Ear,
  fmt: Scale, forensic: Scale, medicine: Stethoscope, microbiology: Microscope, obstetrics: PregnantWoman as LucideIcon, ophthalmology: Eye,
  orthopaedics: Bone, pathology: TestTubes, pediatrics: Baby, paediatrics: Baby, pharmacology: Pill, physiology: HeartPulse,
  psm: Users, psychiatry: Brain, surgery: Scissors, community: ShieldPlus, radiology: Radiation,
};

export function subjectIcon(name: string): LucideIcon {
  const key = name.toLowerCase().split(/[\s&]+/)[0] ?? "";
  return MAP[key] ?? BookOpen;
}
