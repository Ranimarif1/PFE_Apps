import { describe, it, expect } from "vitest";

// Inline the functions from RapportDetail (same logic)
function parseReport(text: string) {
  const lower = text.toLowerCase();
  const iIdx = lower.indexOf("indication:");
  const rIdx = lower.indexOf("resultat:");
  const cIdx = lower.indexOf("conclusion:");

  const extract = (start: number, end: number) => {
    if (start === -1) return "";
    const colonPos = text.indexOf(":", start) + 1;
    const endPos = end === -1 ? text.length : end;
    return text.slice(colonPos, endPos).trim();
  };

  return {
    indication: extract(iIdx, rIdx !== -1 ? rIdx : cIdx),
    resultat: extract(rIdx, cIdx),
    conclusion: extract(cIdx, -1),
  };
}

function buildContent(indication: string, resultat: string, conclusion: string) {
  return `Indication: ${indication}\n\nResultat: ${resultat}\n\nConclusion: ${conclusion}`;
}

const SAMPLE = `indication: patient presents with persistent and progressively worsening headaches over the past three weeks associated with intermittent dizziness episodes and occasional blurred vision the patient denies any history of recent trauma or falls but reports increased stress levels and irregular sleep patterns there is also a complaint of mild nausea particularly in the early morning hours with no vomiting the patient has a past medical history of hypertension which is currently under treatment and there is no known history of neurological disorders or previous similar episodes

resultat: there is no evidence of acute intracranial hemorrhage or extra axial fluid collection the ventricular system appears normal in size shape and configuration with no signs of hydrocephalus there is no midline shift or mass effect identified the cortical sulci are preserved a small hypodense area is noted in the right parietal region which may represent a chronic ischemic change or old infarct the posterior fossa structures including the cerebellum and brainstem appear unremarkable no abnormal enhancement is seen after contrast administration the skull bones are intact and the visualized sinuses are clear

conclusion: no acute intracranial abnormality is identified the findings are most consistent with a chronic ischemic lesion in the right parietal lobe which may correlate with the patient clinical history continued clinical monitoring is recommended and further evaluation with MRI could be considered if symptoms persist or worsen`;

describe("parseReport", () => {
  it("extracts indication correctly", () => {
    const { indication } = parseReport(SAMPLE);
    expect(indication).toContain("patient presents with persistent");
    expect(indication).not.toContain("resultat");
    expect(indication).not.toContain("conclusion");
  });

  it("extracts resultat correctly", () => {
    const { resultat } = parseReport(SAMPLE);
    expect(resultat).toContain("no evidence of acute intracranial hemorrhage");
    expect(resultat).not.toContain("indication");
    expect(resultat).not.toContain("conclusion");
  });

  it("extracts conclusion correctly", () => {
    const { conclusion } = parseReport(SAMPLE);
    expect(conclusion).toContain("no acute intracranial abnormality is identified");
    expect(conclusion).not.toContain("indication");
    expect(conclusion).not.toContain("resultat");
  });

  it("is case-insensitive for section keywords", () => {
    const upper = SAMPLE
      .replace("indication:", "INDICATION:")
      .replace("resultat:", "RESULTAT:")
      .replace("conclusion:", "CONCLUSION:");
    const { indication, resultat, conclusion } = parseReport(upper);
    expect(indication).toContain("patient presents");
    expect(resultat).toContain("no evidence");
    expect(conclusion).toContain("no acute");
  });

  it("returns empty strings when sections are missing", () => {
    const { indication, resultat, conclusion } = parseReport("some random text");
    expect(indication).toBe("");
    expect(resultat).toBe("");
    expect(conclusion).toBe("");
  });

  it("handles missing resultat section gracefully", () => {
    const text = "indication: patient has headaches conclusion: no issues found";
    const { indication, conclusion } = parseReport(text);
    expect(indication).toContain("patient has headaches");
    expect(conclusion).toContain("no issues found");
  });
});

describe("buildContent", () => {
  it("reassembles sections into a single string", () => {
    const result = buildContent("ind text", "res text", "con text");
    expect(result).toBe("Indication: ind text\n\nResultat: res text\n\nConclusion: con text");
  });

  it("round-trips: parse → build → parse gives same sections", () => {
    const original = parseReport(SAMPLE);
    const rebuilt = buildContent(original.indication, original.resultat, original.conclusion);
    const reparsed = parseReport(rebuilt);
    expect(reparsed.indication).toBe(original.indication);
    expect(reparsed.resultat).toBe(original.resultat);
    expect(reparsed.conclusion).toBe(original.conclusion);
  });
});
