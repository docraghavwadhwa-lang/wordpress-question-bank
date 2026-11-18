import { forwardRef } from "react";
import {
  Baby, Bone, Brain, Ear, Eye, FlaskConical, Fingerprint, HeartPulse, Microscope, Pill, Radiation, Scale,
  Scissors, ShieldPlus, Skull, Stethoscope, Syringe, TestTubes, Users, BookOpen, type LucideIcon, type LucideProps,
} from "lucide-react";

// Line-art pregnant woman in profile, drawn to match lucide's 24px stroke style.
const PregnantWoman = forwardRef<SVGSVGElement, LucideProps>(({ className, strokeWidth = 2, ...rest }, ref) => (
  <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...(rest as object)}>
    <circle cx="10" cy="3.5" r="2" />
    <path d="M9.5 7.5c-1.5.5-2 2-2 3.5v3.5" />
    <path d="M11 7.5c1 .7 1.3 1.8 1.2 2.8 2.8.6 4.3 2.6 4.3 4.7 0 2-1.7 3.3-4 3.3H10" />
    <path d="M9 14.5 8.5 22" />
    <path d="M11.5 18.5 12 22" />
  </svg>
));
PregnantWoman.displayName = "PregnantWoman";

const MAP: Record<string, LucideIcon> = {
  anaesthesia: Syringe, anatomy: Skull, biochemistry: FlaskConical, dermatology: Fingerprint, ent: Ear,
  fmt: Scale, forensic: Scale, medicine: Stethoscope, microbiology: Microscope, obstetrics: PregnantWoman as LucideIcon, ophthalmology: Eye,
  orthopaedics: Bone, pathology: TestTubes, pediatrics: Baby, paediatrics: Baby, pharmacology: Pill, physiology: HeartPulse,
  psm: Users, psychiatry: Brain, surgery: Scissors, community: ShieldPlus, radiology: Radiation,
};

export function subjectIcon(name: string): LucideIcon {
  const key = name.toLowerCase().split(/[\s&]+/)[0] ?? "";
  return MAP[key] ?? BookOpen;
}
