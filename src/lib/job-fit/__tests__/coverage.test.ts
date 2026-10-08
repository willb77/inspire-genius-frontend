/**
 * BP-F5 — the coverage helpers every fit surface reads, plus the two places a
 * withheld verdict or an unmeasured dimension leaves the browser: the report
 * export and the explain-fit request.
 */
import {
  NOT_MEASURED,
  isMeasured,
  partialCoverage,
  partialProfileDetail,
  partialProfileLabel,
} from "../coverage"
import { buildFitReportHtml, buildFitReportMarkdown, buildFitReportText } from "../fitReport"
import { toExplainBody } from "@/services/job-fit/explain.service"
import type { FitDetail } from "@/types/job-fit"

const PARTIAL: FitDetail = {
  jobId: "j",
  roleTitle: "Field Service Engineer",
  tier: null,
  baseTier: null,
  totalVariation: 64,
  fitScore: 92,
  dimensionsEvaluated: 8,
  dimensionsTotal: 22,
  coverage: "partial",
  verdictWithheld: true,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 70, benchmarkScore: 60, gap: 10, coaching: "", measured: true },
    { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", candidateScore: null, benchmarkScore: 65, gap: null, coaching: "", measured: false },
  ],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: [],
  methodologyNote: "",
}

const FULL: FitDetail = {
  ...PARTIAL,
  tier: "potential-fit",
  baseTier: "potential-fit",
  dimensionsEvaluated: 22,
  dimensionsTotal: 22,
  coverage: "full",
  verdictWithheld: false,
  perDimension: [PARTIAL.perDimension[0]],
}

describe("partialCoverage", () => {
  test("partial with both counts", () => {
    expect(partialCoverage(PARTIAL)).toEqual({ evaluated: 8, total: 22 })
  })
  test("full, absent, or incomplete is not partial", () => {
    expect(partialCoverage(FULL)).toBeNull()
    expect(partialCoverage({})).toBeNull()
    expect(partialCoverage(undefined)).toBeNull()
    expect(partialCoverage({ coverage: "partial", dimensionsEvaluated: 8 })).toBeNull()
    expect(partialCoverage({ coverage: "partial", dimensionsEvaluated: 8, dimensionsTotal: 0 })).toBeNull()
  })
  test("copy names the counts and the withheld rating", () => {
    const p = { evaluated: 8, total: 22 }
    expect(partialProfileLabel(p)).toBe("Partial profile · 8 of 22 measured")
    expect(partialProfileDetail(p)).toMatch(/8 of 22 dimensions/)
    expect(partialProfileDetail(p)).toMatch(/other 14 aren't in your profile/)
    expect(partialProfileDetail(p)).toMatch(/rating is held back/)
  })
})

describe("isMeasured", () => {
  test("flagged false, or no score, is not measured", () => {
    expect(isMeasured({ candidateScore: 0, gap: -65, measured: false })).toBe(false)
    expect(isMeasured({ candidateScore: null, gap: null, measured: false })).toBe(false)
    expect(isMeasured({ candidateScore: null, gap: null })).toBe(false)
  })
  test("a scored row is measured, including a pre-#1671 row with no flag", () => {
    expect(isMeasured({ candidateScore: 70, gap: 10, measured: true })).toBe(true)
    expect(isMeasured({ candidateScore: 70, gap: 10 })).toBe(true)
  })
})

describe("fit report export", () => {
  test("text: partial line, and the unmeasured row is 'not measured', never 'you 0'", () => {
    const t = buildFitReportText({ data: PARTIAL, pct: 92 })
    expect(t).toMatch(/Partial profile · 8 of 22 measured/)
    expect(t).toMatch(/Investigative: not measured \(role 65\)/)
    expect(t).not.toMatch(/you 0/)
    expect(t).toMatch(/Innovating: you 70 vs role 60 \(\+10\)/)
  })
  test("markdown and html carry the same", () => {
    const md = buildFitReportMarkdown({ data: PARTIAL, pct: 92 })
    expect(md).toMatch(new RegExp(`\\| Investigative \\| ${NOT_MEASURED} \\| 65 \\| — \\|`))
    expect(md).toMatch(/Partial profile/)
    const html = buildFitReportHtml({ data: PARTIAL, pct: 92 })
    expect(html).toMatch(/<td>Investigative<\/td><td>Not measured<\/td>/)
    expect(html).toMatch(/Partial profile · 8 of 22 measured/)
  })
  test("a full read has no partial line", () => {
    expect(buildFitReportText({ data: FULL, pct: 80 })).not.toMatch(/Partial profile/)
    expect(buildFitReportHtml({ data: FULL, pct: 80 })).not.toMatch(/Partial profile/)
  })
})

describe("explain-fit request", () => {
  test("a withheld tier is sent as '' (the endpoint's str field would 422 on null)", () => {
    expect(toExplainBody(PARTIAL, 92).tier).toBe("")
    expect(toExplainBody(FULL, 80).tier).toBe("potential-fit")
  })
  test("only measured dimensions are narrated", () => {
    const body = toExplainBody(PARTIAL, 92)
    expect(body.perDimension.map((d) => d.dimensionName)).toEqual(["Innovating"])
  })
})
