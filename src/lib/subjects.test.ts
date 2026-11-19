import { describe, expect, it } from "vitest";
import { compareSubjects, subjectLabel } from "./subjects";

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