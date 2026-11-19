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

/** Bank identifiers use ` > `; tolerate old Anki separators for presentation only. */
export function deckParts(path: string): string[] {
  return path.split(/\s*>\s*|::/).map(part => part.trim()).filter(Boolean);
}

export function searchDecks<T extends { path: string; depth: number; sort_key: string; question_count: number }>(decks: T[], query: string): T[] {
  const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  return decks.filter(deck => {
    const parts = deckParts(deck.path);
    const text = normalize([...parts, subjectLabel(parts[0] ?? deck.path)].join(" "));
    return deck.question_count > 0 && words.every(word => text.includes(word));
  }).sort((a, b) => compareSubjects(deckParts(a.path)[0] ?? a.path, deckParts(b.path)[0] ?? b.path) || a.sort_key.localeCompare(b.sort_key));
}