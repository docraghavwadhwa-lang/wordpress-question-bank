/** Presentation only: never rewrite the question bank's stored identifiers. */
export const SUBJECT_ORDER = [
  "Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology",
  "Community Medicine", "Forensic Medicine & Toxicology", "Ophthalmology",
  "Otorhinolaryngology (ENT)", "General Medicine", "General Surgery",
  "Obstetrics & Gynaecology (OBG)", "Paediatrics", "Orthopaedics", "Dermatology",
  "Psychiatry", "Anaesthesiology", "Radiology",
] as const;

export function subjectLabel(name: string): string {
  const key = name.toLowerCase().trim();
  if (/^(psm|community)/.test(key)) return "Community Medicine";
  if (/^(fmt|forensic)/.test(key)) return "Forensic Medicine & Toxicology";
  if (/^(ent|otorhino)/.test(key)) return "Otorhinolaryngology (ENT)";
  if (/^(medicine|general medicine)/.test(key)) return "General Medicine";
  if (/^(surgery|general surgery)/.test(key)) return "General Surgery";
  if (/^(obg|obstetrics)/.test(key)) return "Obstetrics & Gynaecology (OBG)";
  if (/^(pediatrics|paediatrics)/.test(key)) return "Paediatrics";
  if (/^(anaesth|anesth)/.test(key)) return "Anaesthesiology";
  return SUBJECT_ORDER.find(s => s.toLowerCase() === key) ?? name;
}

export function compareSubjects(a: string, b: string): number {
  const rank = (s: string) => {
    const i = SUBJECT_ORDER.findIndex(label => label === subjectLabel(s));
    return i < 0 ? SUBJECT_ORDER.length : i;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}