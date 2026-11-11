/**
 * JF-6 fixtures shared by the job page and fit-report suites. Synthetic roles
 * and scores only; no person.
 */
import type { FitDetail, PerDimensionFit } from "@/types/job-fit"
import type { FitReportInput } from "@/lib/job-fit/fitReport"

type Row = PerDimensionFit & { priority?: boolean }

export function jf6Row(
  category: PerDimensionFit["category"],
  dimensionId: number,
  dimensionName: string,
  candidateScore: number | null,
  benchmarkScore: number,
  priority?: boolean,
  coaching = "",
): Row {
  const measured = candidateScore !== null
  return {
    category,
    dimensionId,
    dimensionName,
    candidateScore,
    benchmarkScore,
    gap: measured ? (candidateScore as number) - benchmarkScore : null,
    coaching,
    measured,
    ...(priority === undefined ? {} : { priority }),
  }
}

/** Today's (22-dimension, gap-method) read: no `scoring`, no priority rows. */
export const JF6_TODAY: FitDetail = {
  jobId: "j1",
  roleTitle: "Operations Program Manager",
  tier: "strong-fit",
  baseTier: "strong-fit",
  totalVariation: 140,
  fitScore: 72,
  perDimension: [
    jf6Row("behavior", 4, "Coordinating", 55, 78, undefined, "Plan the week's hand-offs."),
    jf6Row("behavior", 6, "Delivering", 80, 74),
    jf6Row("aptitude", 2, "Analyzing", null, 60),
  ],
  criticalGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  coachingGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -23 }],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["Strong delivery follow-through."],
  methodologyNote: "",
}

/**
 * A priority-scored read (`scoring: "priority-9"`, the marker blueprint-service
 * sets only when job_fit_v2 applies): growth areas of −25, −20, −12 and −4,
 * one match and one never-measured priority dimension, plus a non-priority row.
 */
export const JF6_PRIORITY: FitDetail = {
  ...JF6_TODAY,
  perDimension: [
    jf6Row("behavior", 4, "Coordinating", 55, 75, true, "Plan the week's hand-offs."),
    jf6Row("behavior", 6, "Delivering", 80, 74, true),
    jf6Row("behavior", 9, "Relating", 50, 70, true, "Open one-to-ones with a question."),
    jf6Row("aptitude", 2, "Analyzing", 48, 60, true, "Take one data question a week."),
    jf6Row("aptitude", 3, "Innovating", null, 65, true),
    jf6Row("core-trait", 1, "Resilience", 66, 70, true),
    jf6Row("core-trait", 5, "Adaptability", 40, 65, true, "Volunteer for one changed process."),
    jf6Row("behavior", 11, "Persuading", 30, 70, false),
  ],
  ...({ scoring: "priority-9" } as object),
}

/** The order the v2 page's sections must render in (the JF-6 spec). */
export const JF6_SECTION_ORDER = [
  "fit",
  "headline",
  "cards",
  "reference",
  "skills",
  "profile",
  "local",
  "favorites",
  "goals",
  "pathway",
] as const

/** Report inputs whose v1 HTML was recorded on the base sha (off = byte-identical). */
export const JF6_FIXTURES: Record<string, FitReportInput> = {
  today: { data: JF6_TODAY, pct: 72 },
  "today-overview": { data: JF6_TODAY, pct: 72, overview: "About 72% aligned <with> & notes." },
  "priority-without-v2": { data: JF6_PRIORITY, pct: 64 },
  "partial-no-growth": {
    data: {
      ...JF6_TODAY,
      coachingGaps: [],
      interviewSelfAdvocacy: [],
      dimensionsEvaluated: 10,
      dimensionsTotal: 22,
      coverage: "partial",
    } as FitDetail,
    pct: 80,
  },
}
