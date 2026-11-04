// RWO-8 — what the résumé assistant is shown, and what changed between drafts.
//
// The summary rides the chat job's `context` as `resume_draft` (CSA §2.B.1): the
// server fences and caps it again, and the chat job does not store it. It is the
// draft's own text plus the lines the checks left out and why, the requirements
// not shown yet, the format and the target — so "why did you leave out Globex?" is
// answered from what actually happened, not guessed.

import type { GeneratedResume, RemovedLine } from "@/types/resumeWriter"

/** The server's cap (`app/resume_writer/guided.py` DRAFT_SUMMARY_MAX). */
export const DRAFT_SUMMARY_MAX = 8000

const REASON: Record<string, string> = {
  employer: "employer not in the résumé",
  title: "job title not in the résumé",
  dates: "dates not in the résumé",
  education: "education not in the résumé",
  certification: "certification not in the résumé",
  number: "a number not in the résumé",
  activity: "a claim the résumé doesn't show",
  training: "training not in the résumé",
  assessment: "assessment wording, kept off résumés",
}

export function buildDraftSummary(
  draft: GeneratedResume,
  formatName: string,
  aimedAt: string,
): string {
  const out: string[] = [`Format: ${formatName || "—"}. Aimed at: ${aimedAt || "no specific job"}.`]
  if (draft.headline) out.push(`Headline: ${draft.headline}`)
  if (draft.summary) out.push(`Summary: ${draft.summary}`)
  if (draft.competencies.length) out.push(`Skills: ${draft.competencies.join("; ")}`)
  for (const e of draft.experience) {
    out.push(`Job: ${[e.title, e.organization, e.dates].filter(Boolean).join(", ")}`)
    for (const b of e.bullets) out.push(`- ${b}`)
  }
  if (draft.education.length) out.push(`Education: ${draft.education.join("; ")}`)
  if (draft.certifications.length) out.push(`Certifications: ${draft.certifications.join("; ")}`)
  const removed: RemovedLine[] = draft.removed ?? []
  out.push(removed.length ? "Left out by the checks:" : "Left out by the checks: nothing.")
  for (const r of removed) out.push(`- ${r.text} (${REASON[r.reason] ?? "not in the résumé"})`)
  const notShown = [
    ...(draft.notEvidenced ?? []),
    ...(draft.qualifications_crosswalk ?? []).filter((r) => !r.evidence).map((r) => r.requirement),
  ]
  if (notShown.length) {
    out.push("The job asks for these, and the résumé doesn't show them yet:")
    for (const n of notShown) out.push(`- ${n}`)
  }
  return out.join("\n").slice(0, DRAFT_SUMMARY_MAX)
}

/** Every line of a draft the page can highlight: the summary and each bullet. */
function lines(d: GeneratedResume): string[] {
  return [d.summary, ...d.experience.flatMap((e) => e.bullets), ...(d.selected_achievements ?? [])].filter(Boolean)
}

/** Lines in `next` that `prev` did not have, word for word. Approximate by design
 * (CSA residual): a line it misses is still in the new draft on screen. */
export function changedLines(prev: GeneratedResume | null, next: GeneratedResume): Set<string> {
  if (!prev) return new Set()
  const before = new Set(lines(prev))
  return new Set(lines(next).filter((l) => !before.has(l)))
}

/** Bullets with no number in them — what the follow-up questions are about. */
export function weakBullets(draft: GeneratedResume): string[] {
  return draft.experience.flatMap((e) => e.bullets).filter((b) => !/\d/.test(b)).slice(0, 10)
}
