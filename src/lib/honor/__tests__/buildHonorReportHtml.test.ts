import type { HonorEvaluation } from "@/types/honor"
import {
  buildHonorReportHtml,
  confidentialFooter,
  type HonorReportMeta,
} from "../buildHonorReportHtml"
import { reportSlug, formatReportDate } from "../exportHonorReport"

const META: HonorReportMeta = {
  fellowName: "Marcus Reyes",
  fellowTitle: "Program Management",
  fellowEmail: "marcus@honor.org",
  coachName: "S. Carter",
  coachTitle: "Transition Mentor",
  coachEmail: "coach@honor.org",
  dateLabel: "July 19, 2026",
}

function evalFixture(over: Partial<HonorEvaluation> = {}): HonorEvaluation {
  return {
    subject_id: "f1",
    objective_evaluation: [{ statement: "Strong coordinator", source: "PRISM: Coordinating 90" }],
    development_areas: [{ statement: "Grow innovation", source: "PRISM: Innovating 25" }],
    career_fit_ranked: [
      { area: "operations_program_management", label: "Operations Program Management", score: 95.6, top_factors: [{ feature: "x", label: "PRISM: Coordinating", closeness: 1, contribution: 20, source: "PRISM: Coordinating 90" }], top_gaps: [] },
      { area: "security_risk_management", label: "Security Risk Management", score: 78, top_factors: [], top_gaps: [] },
    ],
    goals_fit: [
      { goal: "Ops PM role", area: "operations_program_management", label: "Operations Program Management", score: 95.6, verdict: "supported", factors: [] },
    ],
    comparative: null,
    frameworks: ["PRISM"],
    imputed_features: [],
    notes: "Deterministic; no model call.",
    ...over,
  }
}

describe("buildHonorReportHtml — THF cover spec §4", () => {
  const html = buildHonorReportHtml(evalFixture(), META)

  test("cover carries the exact THF title + powered-by lines", () => {
    expect(html).toContain("The Honor Foundation")
    expect(html).toContain("Powered by InspiresGenius.com")
  })

  test("cover shows Prepared-for (fellow) and By (coach) with titles + emails", () => {
    expect(html).toContain("Prepared for")
    expect(html).toContain("Marcus Reyes")
    expect(html).toContain("Program Management")
    expect(html).toContain("marcus@honor.org")
    expect(html).toContain("S. Carter")
    expect(html).toContain("Transition Mentor")
    expect(html).toContain("coach@honor.org")
    expect(html).toContain("July 19, 2026")
  })

  test("renders the three cited sections with verbatim scores + sources", () => {
    expect(html).toContain("Objective Evaluation")
    expect(html).toContain("PRISM: Coordinating 90")
    expect(html).toContain("Career / Position Fit — Ranked")
    expect(html).toContain("95.6")
    expect(html).toContain("Operations Program Management")
    expect(html).toContain("Goals &amp; Objectives — Fit")
    expect(html).toContain("supported")
  })

  test("no-scores evaluation surfaces the imputed-neutral banner", () => {
    const h = buildHonorReportHtml(evalFixture({ frameworks: [] }), META)
    expect(h).toContain("No scored assessments on file")
  })

  test("comparative + team read render when present", () => {
    const h = buildHonorReportHtml(
      evalFixture({
        comparative: {
          subjects: ["f2"],
          areas: ["operations_program_management", "security_risk_management"],
          per_subject_area_fit: { f2: { operations_program_management: 55, security_risk_management: 80 } },
          pairwise_similarity: { f2: { f2: 100 } },
          team_read: { target_area: "operations_program_management", label: "Operations Program Management", covered: ["prism:behaviorpreferences:coordinating"], gaps: [], redundant: [], complementary: [], best_by_feature: {} },
        },
      }),
      META,
      { f2: "Dana Cole" },
    )
    expect(h).toContain("Comparative &amp; Team Read")
    expect(h).toContain("Dana Cole")
    expect(h).toContain("Team read")
  })

  test("HTML-escapes identity fields (no injection)", () => {
    const h = buildHonorReportHtml(evalFixture(), { ...META, fellowName: "A<b>x</b>" })
    expect(h).toContain("A&lt;b&gt;x&lt;/b&gt;")
    expect(h).not.toContain("A<b>x</b>")
  })
})

describe("confidentialFooter — spec §4 per-page line", () => {
  test("includes fellow name + title", () => {
    expect(confidentialFooter("Marcus Reyes", "Program Management")).toBe(
      "Confidential Data. Distribution to others only by permission of Marcus Reyes, Program Management.",
    )
  })
  test("omits the comma when there is no title", () => {
    expect(confidentialFooter("Marcus Reyes", "")).toBe(
      "Confidential Data. Distribution to others only by permission of Marcus Reyes.",
    )
  })
})

describe("filename slug + date", () => {
  test("reportSlug normalizes to a file-safe honor-evaluation slug", () => {
    expect(reportSlug("Marcus Reyes")).toBe("honor-evaluation-marcus-reyes")
    expect(reportSlug("  O'Neil, Dana  ")).toBe("honor-evaluation-o-neil-dana")
    expect(reportSlug("")).toBe("honor-evaluation-fellow")
  })
  test("formatReportDate renders Month Day, Year", () => {
    expect(formatReportDate(new Date("2026-07-19T12:00:00Z"))).toMatch(/July \d{1,2}, 2026/)
  })
})
