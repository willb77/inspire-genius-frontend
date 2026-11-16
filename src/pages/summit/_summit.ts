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
import type { TFunction } from "i18next"
import type { SummitGoal, SummitPrismAlignment } from "@/types/summit"

/** Backend category key → the label a person reads, or undefined for an unknown key. */
function categoryText(raw: string, t: TFunction): string | undefined {
  switch (raw) {
    case "history": return t("labels.category.history", { defaultValue: "Career History" })
    case "job": return t("labels.category.job", { defaultValue: "Current Job" })
    case "workplace": return t("labels.category.workplace", { defaultValue: "Workplace" })
    case "ambitions": return t("labels.category.ambitions", { defaultValue: "Career Ambitions" })
    case "personal": return t("labels.category.personal", { defaultValue: "Personal" })
    default: return undefined
  }
}

/** The three ways a goal can sit against how someone is wired. */
export type AlignKind = "lever" | "stretch" | "counter"

const ALIGN_KIND: Record<string, AlignKind> = {
  leverages_strength: "lever",
  requires_stretch: "stretch",
  counterbalance: "counter",
}

export function alignLabel(kind: AlignKind, t: TFunction): string {
  switch (kind) {
    case "lever": return t("labels.align.lever", { defaultValue: "Leverages strength" })
    case "stretch": return t("labels.align.stretch", { defaultValue: "Requires stretch" })
    case "counter": return t("labels.align.counter", { defaultValue: "Counterbalance" })
  }
}

export const ALIGN_STYLES: Record<AlignKind, string> = {
  lever: "bg-[#5B8A72]/14 text-[#5B8A72]",
  stretch: "bg-[#C2614F]/13 text-[#C2614F]",
  counter: "bg-[#F1ECE2] text-[#13294B]",
}

/** How the goal is paced, given the person's dominant quadrant. */
function styleText(raw: string, t: TFunction): string | undefined {
  switch (raw) {
    case "gold_stepwise": return t("labels.style.gold_stepwise", { defaultValue: "Stepwise" })
    case "blue_metrics": return t("labels.style.blue_metrics", { defaultValue: "Metric-led" })
    case "red_action": return t("labels.style.red_action", { defaultValue: "Action-first" })
    case "green_momentum": return t("labels.style.green_momentum", { defaultValue: "Momentum-based" })
    default: return undefined
  }
}

/** Which coach owns the goal. */
function coachText(raw: string, t: TFunction): string | undefined {
  switch (raw) {
    case "job_mentor": return t("labels.coach.job_mentor", { defaultValue: "Job Mentor" })
    case "career_coach": return t("labels.coach.career_coach", { defaultValue: "Career Coach" })
    case "prism_coach": return t("labels.coach.prism_coach", { defaultValue: "PRISM Coach" })
    default: return undefined
  }
}

/** `some_enum_value` → `Some enum value`. The fallback for every map above. */
function humanise(raw: string): string {
  const spaced = raw.replace(/[_-]+/g, " ").trim()
  if (!spaced) return ""
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function categoryLabel(raw: string | undefined, t: TFunction): string {
  if (!raw) return ""
  return categoryText(raw, t) ?? humanise(raw)
}

export function styleLabel(raw: string | undefined, t: TFunction): string {
  if (!raw) return ""
  return styleText(raw, t) ?? humanise(raw)
}

export function coachLabel(raw: string | undefined, t: TFunction): string {
  if (!raw) return ""
  return coachText(raw, t) ?? humanise(raw)
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
export function goalStatusLabel(status: SummitGoal["status"], t: TFunction): string {
  if (status === "proposed") return t("labels.status.proposed", { defaultValue: "Proposed" })
  if (status === "confirmed") return t("labels.status.confirmed", { defaultValue: "Confirmed" })
  return humanise(String(status ?? ""))
}
