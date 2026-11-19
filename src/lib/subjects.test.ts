import { describe, expect, it } from "vitest";
import { compareSubjects, subjectLabel, searchDecks } from "./subjects";

describe("Q-Bank curriculum ordering", () => {
  it("orders all 19 stored subject identifiers in the requested sequence", () => {
    const subjects = ["Radiology", "Surgery", "Medicine", "ENT", "PSM", "FMT", "Obstetrics & Gyenacology", "Anaesthesia", "Psychiatry", "Dermatology", "Orthopaedics", "Paediatrics", "Ophthalmology", "Microbiology", "Pharmacology", "Pathology", "Biochemistry", "Physiology", "Anatomy"];
    expect(subjects.sort(compareSubjects)).toEqual(["Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology", "PSM", "FMT", "Ophthalmology", "ENT", "Medicine", "Surgery", "Obstetrics & Gyenacology", "Paediatrics", "Orthopaedics", "Dermatology", "Psychiatry", "Anaesthesia", "Radiology"]);
  });
  it("normalizes old bank names without changing their identifiers", () => {
    expect(subjectLabel("Obstetrics & Gyenacology")).toBe("Obstetrics & Gynaecology (OBG)");
    expect(compareSubjects("General Medicine", "General Surgery")).toBeLessThan(0);
  });
});

describe("Topic and subtopic search", () => {
  const decks = [
    { path: "Medicine", depth: 1, sort_key: "1", question_count: 100 },
    { path: "Medicine > Cardiology", depth: 2, sort_key: "2", question_count: 30 },
    { path: "Medicine > Cardiology > Acute Myocardial Infarction", depth: 3, sort_key: "3", question_count: 12 },
    { path: "Paediatrics > Cardiology > Congenital heart disease", depth: 3, sort_key: "4", question_count: 8 },
  ];
  it("finds topics using the bank's actual path separator", () => {
    expect(searchDecks(decks, "cardiology").map(d => d.path)).toEqual(decks.slice(1).map(d => d.path));
  });
  it("finds a subtopic and preserves its exact quiz identifier", () => {
    expect(searchDecks(decks, "myocardial infarction").map(d => d.path)).toEqual(["Medicine > Cardiology > Acute Myocardial Infarction"]);
  });
  it("combines a subject alias and topic regardless of word order", () => {
    expect(searchDecks(decks, "infarction general medicine").map(d => d.path)).toEqual([decks[2]?.path]);
  });
  it("does not return unrelated or empty results", () => {
    expect(searchDecks(decks, "renal")).toEqual([]);
    expect(searchDecks(decks, "   ")).toEqual([]);
  });
});