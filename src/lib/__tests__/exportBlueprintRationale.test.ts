/**
 * @jest-environment jsdom
 *
 * N-4 — the Rationale Report's layout says only what the server assembled.
 */
import type { RationaleReport } from "@/types/job-blueprint"

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (...a: unknown[]) => downloadBlob(...a),
}))

import {
  buildRationaleOutline,
  exportRationaleWord,
  rationaleFileStem,
  type OutlineBlock,
} from "../exportBlueprintRationale"

const METHOD = "Ranked 1 of 8 in its block and rated 7 of 8; the licensed rank table and the rate give 90% (Methodology Manual §2, calculate_benchmark)."

function report(over: Partial<RationaleReport> = {}): RationaleReport {
  return {
    generatedAt: "2026-10-20T18:00:00+00:00",
    role: {
      id: "r1", roleTitle: "Ops Lead", department: "Operations", tier: "professional", version: 3,
      status: "active", supersedesVersion: 2, createdAt: "2026-10-01T00:00:00+00:00",
      publishedAt: "2026-10-02T00:00:00+00:00",
    },
    validation: {
      state: "none", statement: "Not validated by an employer or subject-matter expert.",
      validatedBy: null, current: null, history: [], retentionDays: 90,
    },
    provenance: {
      benchmarkSource: "manual", benchmarkSourceLabel: "built by hand", sourceRef: null,
      internalReviewer: "internal reviewer not recorded", reviewedAt: null,
    },
    dimensions: [
      {
        category: "behavior", categoryLabel: "Behavior Preferences", dimensionId: 1,
        dimensionName: "Innovating", rankPosition: 1, rateValue: 7, maxRate: 8, targetPercent: 90,
        importanceTier: "critical", interpretation: "very-high", method: METHOD,
        competencies: ["Strategic Vision"], smeNote: null, recordedEvidence: "No recorded evidence.",
      },
      {
        category: "aptitude", categoryLabel: "Work Aptitude Preferences", dimensionId: 2,
        dimensionName: "Investigative & Analytical", rankPosition: null, rateValue: null, maxRate: 8,
        targetPercent: 50, importanceTier: "unimportant", interpretation: "moderate",
        method: "Target 50% as stored; the rank and rate behind it were not recorded.",
        competencies: [], smeNote: "Root-cause work on the line.", recordedEvidence: "No recorded evidence.",
      },
    ],
    evidence: {
      criticalActivities: ["Run the morning stand-up"], kpis: [], keyInteractions: [],
      workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [],
      perDimension: "No recorded evidence per dimension.",
    },
    ugesp: {
      section: "UGESP content validity — 29 CFR §1607.14(C)", jobAnalysis: "built by hand",
      version: 3, publishedBy: "internal reviewer not recorded", publishedAt: null,
      validatedBy: "Not validated by an employer or subject-matter expert.",
      workBehaviours: "The 22 dimensions below.",
    },
    limits: ["Decision support only — not a validated selection instrument.", "The fit-tier cut scores are not SME-validated."],
    ...over,
  }
}

const texts = (blocks: OutlineBlock[]): string[] =>
  blocks.flatMap((b) =>
    b.kind === "bullets" ? b.items : b.kind === "table" ? [...b.header, ...b.rows.flat()] : [b.text],
  )

describe("buildRationaleOutline", () => {
  it("says plainly when the role is not validated", () => {
    const blocks = buildRationaleOutline(report())
    const at = blocks.findIndex((b) => b.kind === "heading" && b.text === "2. Validation")
    // the validation section itself says it, in bold — not only the UGESP table
    expect(blocks[at + 1]).toEqual({
      kind: "para", text: "Not validated by an employer or subject-matter expert.", bold: true,
    })
    expect(texts(blocks).some((t) => t.startsWith("Validated:"))).toBe(false)
  })

  it("prints the method sentence, the competencies and the evidence exactly as served", () => {
    const all = texts(buildRationaleOutline(report()))
    expect(all).toContain(`Why it is in: ${METHOD}`)
    expect(all).toContain("Competencies it evidences: Strategic Vision")
    expect(all).toContain("Evidence: No recorded evidence.")
    expect(all).toContain("Validator's note: Root-cause work on the line.")
    expect(all).toContain("Competencies it evidences: None recorded.")
    expect(all).toContain("Innovating — target 90% · critical · rank 1 · rate 7/8")
    expect(all).toContain("Investigative & Analytical — target 50% · unimportant")
  })

  it("carries every limit verbatim and the UGESP section", () => {
    const blocks = buildRationaleOutline(report())
    const all = texts(blocks)
    for (const limit of report().limits) expect(all).toContain(limit)
    expect(all).toContain("6. UGESP content validity — 29 CFR §1607.14(C)")
    expect(all).toContain("Run the morning stand-up")
    expect(all).toContain("version 2")
  })

  it("labels a recorded attestation as recorded", () => {
    const current = {
      id: "e1", event: "validated" as const, method: "recorded" as const, at: "2026-10-03T00:00:00",
      actorName: "Edda Editor", reviewerName: null, validatorName: "Sam Expert", validatorOrg: "Acme",
      validatorTitle: null, validatedOn: "2026-10-01", comments: null, dimensionNotes: {}, retentionApplied: false,
    }
    const all = texts(buildRationaleOutline(report({
      validation: {
        state: "validated", statement: null, current, history: [current], retentionDays: 90,
        validatedBy: "Sam Expert, Acme — recorded by Edda Editor; the SME did not sign in IG",
      },
    })))
    expect(all).toContain("Validated: Sam Expert, Acme — recorded by Edda Editor; the SME did not sign in IG")
    expect(all).toContain("Recorded attestation")
    expect(all).toContain("2026-10-01")
  })

  it("names the file after the role and version", () => {
    expect(rationaleFileStem(report())).toBe("Blueprint_Rationale_Ops_Lead_v3")
  })
})

describe("exportRationaleWord", () => {
  beforeEach(() => downloadBlob.mockClear())

  it("builds a .docx and hands it to the browser", async () => {
    await exportRationaleWord(report())
    expect(downloadBlob).toHaveBeenCalledWith("Blueprint_Rationale_Ops_Lead_v3.docx", expect.any(Blob))
  })
})
