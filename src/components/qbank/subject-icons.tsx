import {
  Activity, Baby, Bone, Brain, Ear, Eye, FlaskConical, HeartPulse, Microscope, Pill, Scale,
  Scan, Scissors, ShieldPlus, Smile, Sparkles, Stethoscope, Syringe, TestTubes, Users, BookOpen, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  anaesthesia: Syringe, anatomy: Activity, biochemistry: FlaskConical, dermatology: Sparkles, ent: Ear,
  fmt: Scale, medicine: Stethoscope, microbiology: Microscope, obstetrics: Baby, ophthalmology: Eye,
  orthopaedics: Bone, pathology: TestTubes, pediatrics: Smile, pharmacology: Pill, physiology: HeartPulse,
  psm: Users, psychiatry: Brain, surgery: Scissors, community: ShieldPlus, radiology: Scan,
};

export function subjectIcon(name: string): LucideIcon {
  const key = name.toLowerCase().split(/[\s&]+/)[0] ?? "";
  return MAP[key] ?? BookOpen;
}
