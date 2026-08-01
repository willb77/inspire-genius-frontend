/**
 * Summit — presentation mapping for the live goal contract.
 *
 * The backend's vocabulary is deliberately not the UI's: `leverages_strength`
 * is precise and unreadable, "Leverages strength" is readable and imprecise.
 * Mapping happens here, at the edge, for one reason — a backend rename then
 * shows up as a missing key in one small file rather than as a blank pill on a
 * page nobody re-reads.
 *
 * Every lookup has a neutral fallback. An unrecognised value renders as itself,
 * tidied, rather than vanishing: a label we haven't seen before is still better
 * information than an empty box.
 */
import type { SummitGoal, SummitPrismAlignment } from "@/types/summit"

/** Backend category key → the label a person reads. */
export const CATEGORY_LABEL: Record<string, string> = {
  history: "Career History",
  job: "Current Job",
  workplace: "Workplace",
  ambitions: "Career Ambitions",
  personal: "Personal",
}

/** The three ways a goal can sit against how someone is wired. */
export type AlignKind = "lever" | "stretch" | "counter"

const ALIGN_KIND: Record<string, AlignKind> = {
  leverages_strength: "lever",
  requires_stretch: "stretch",
  counterbalance: "counter",
}

export const ALIGN_LABEL: Record<AlignKind, string> = {
  lever: "Leverages strength",
  stretch: "Requires stretch",
  counter: "Counterbalance",
}

export const ALIGN_STYLES: Record<AlignKind, string> = {
  lever: "bg-[#5B8A72]/14 text-[#5B8A72]",
  stretch: "bg-[#C2614F]/13 text-[#C2614F]",
  counter: "bg-[#F1ECE2] text-[#13294B]",
}

/** How the goal is paced, given the person's dominant quadrant. */
const STYLE_LABEL: Record<string, string> = {
  gold_stepwise: "Stepwise",
  blue_metrics: "Metric-led",
  red_action: "Action-first",
  green_momentum: "Momentum-based",
}

/** Which coach owns the goal. */
const COACH_LABEL: Record<string, string> = {
  job_mentor: "Job Mentor",
  career_coach: "Career Coach",
  prism_coach: "PRISM Coach",
}

/** `some_enum_value` → `Some enum value`. The fallback for every map above. */
function humanise(raw: string): string {
  const spaced = raw.replace(/[_-]+/g, " ").trim()
  if (!spaced) return ""
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function lookup(map: Record<string, string>, raw: string | undefined): string {
  if (!raw) return ""
  return map[raw] ?? humanise(raw)
}

export function categoryLabel(raw: string | undefined): string {
  return lookup(CATEGORY_LABEL, raw)
}

export function styleLabel(raw: string | undefined): string {
  return lookup(STYLE_LABEL, raw)
}

export function coachLabel(raw: string | undefined): string {
  return lookup(COACH_LABEL, raw)
}

/**
 * The alignment kind, or `null` when the goal carries no PRISM alignment.
 *
 * `null` is meaningful and must stay distinguishable from "counterbalance":
 * a goal synthesised without a behavioural profile behind it has no alignment,
 * and showing a neutral-looking pill would claim a reading we never took.
 */
export function alignKind(
  alignment: SummitPrismAlignment | undefined
): AlignKind | null {
  const raw = alignment?.relationship
  if (!raw) return null
  return ALIGN_KIND[raw] ?? null
}

/**
 * The dimensions behind the alignment, as one short line.
 *
 * Returns "" when there is nothing to show, so the caller can drop the whole
 * pill rather than render a heading with no content after it.
 */
export function prismSummary(
  alignment: SummitPrismAlignment | undefined
): string {
  if (!alignment) return ""
  const dims = (alignment.dimensions ?? []).filter(Boolean)
  if (dims.length) {
    const shown = dims.slice(0, 3).join(" · ")
    return alignment.quadrant ? `${alignment.quadrant} · ${shown}` : shown
  }
  return alignment.quadrant ?? ""
}

/** Status → the pill's wording. Anything unrecognised renders as itself. */
export function goalStatusLabel(status: SummitGoal["status"]): string {
  if (status === "proposed") return "Proposed"
  if (status === "confirmed") return "Confirmed"
  return humanise(String(status ?? ""))
}
