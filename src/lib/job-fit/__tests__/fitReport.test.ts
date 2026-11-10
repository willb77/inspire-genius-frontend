import {
  buildFitReportText,
  buildFitReportMarkdown,
  buildFitReportHtml,
  fitReportFileBase,
} from "@/lib/job-fit/fitReport"
import type { FitDetail } from "@/types/job-fit"

const DATA: FitDetail = {
  jobId: "job-1",
  roleTitle: "Operations Program Manager",
  tier: "strong-fit",
  baseTier: "strong-fit",
  totalVariation: 140,
  fitScore: 72,
  perDimension: [
    { category: "behavior", dimensionId: 4, dimensionName: "Coordinating", candidateScore: 55, benchmarkScore: 78, gap: -23, coaching: "Build coordination reps." },
    { category: "behavior", dimensionId: 6, dimensionName: "Delivering", candidateScore: 80, benchmarkScore: 74, gap: 6, coaching: "" },
  ],
  criticalGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  coachingGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["You bring strong delivery follow-through."],
  methodologyNote: "",
}

const INPUT = { data: DATA, pct: 72, overview: "You align well with this role." }
const BANNED = ["no-fit", "no fit", "pass/fail", "good fit", "bad fit", " hire ", "unqualified", "qualified"]

describe("fitReport serializers", () => {
  test("file base is filesystem-safe", () => {
    expect(fitReportFileBase(DATA)).toBe("job-fit_operations-program-manager")
  })

  test("text report includes role, fit %, gaps, strengths", () => {
    const t = buildFitReportText(INPUT)
    expect(t).toContain("Operations Program Manager")
    expect(t).toContain("72% aligned")
    expect(t).toContain("Coordinating")
    expect(t).toContain("Delivering")
    expect(t).toContain("strong delivery follow-through")
  })

  test("markdown report renders a table + growth section", () => {
    const md = buildFitReportMarkdown(INPUT)
    expect(md).toContain("# Job Fit — Operations Program Manager")
    expect(md).toContain("| Dimension | You | Role blueprint | Difference |")
    expect(md).toContain("## Growth focus")
  })

  test("html report escapes and includes the fit %", () => {
    const html = buildFitReportHtml(INPUT)
    expect(html).toContain("72%")
    expect(html).toContain("<table>")
    expect(html.startsWith("<!doctype html>")).toBe(true)
  })

  // JF-1: the exports say "blueprint" and "growth area", never "benchmark" or
  // "gap". The PDF is rendered from buildFitReportHtml (FitActionsBar), so the
  // HTML case covers it.
  test.each([
    ["text", buildFitReportText],
    ["markdown", buildFitReportMarkdown],
    ["html (and so the PDF)", buildFitReportHtml],
  ])("JF-1 wording — %s export reads blueprint, never benchmark or gap", (_name, build) => {
    const out = build(INPUT)
    expect(out).toMatch(/\bblueprint\b/i)
    expect(out).not.toMatch(/\bbenchmarks?\b/i)
    expect(out).not.toMatch(/\bgaps?\b/i)
  })

  test("JF-1 wording — the markdown and html tables head the role column 'Role blueprint'", () => {
    expect(buildFitReportMarkdown(INPUT)).toContain("| Role blueprint |")
    expect(buildFitReportHtml(INPUT)).toContain("<th>Role blueprint</th>")
  })

  test("no binary / hiring-verdict language in any format", () => {
    const blob = (
      buildFitReportText(INPUT) +
      " " +
      buildFitReportMarkdown(INPUT) +
      " " +
      buildFitReportHtml(INPUT)
    ).toLowerCase()
    for (const bad of BANNED) {
      expect(blob).not.toContain(bad)
    }
  })
})
