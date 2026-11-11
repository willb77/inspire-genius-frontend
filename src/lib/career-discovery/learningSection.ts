import type { DiscoveryEducation, DiscoveryStage } from "@/types/career-discovery"

/**
 * JF-10 — Learning and Education.
 *
 * The browser does not read the `job_fit_v2` switch itself: the server marks
 * the education stage (`learning`) and the /education answer (`learning`) only
 * when the switch applies to this person AND Education paths is available. No
 * mark — loading, an error, switch off — and every page renders exactly as before.
 */
export const LEARNING_TITLE = "Learning and Education"

export type LearningButton = { stageId: string; label: string; available: boolean }

export type LearningMark = { title: string; buttons: LearningButton[] }

/** The /education answer's JF-10 block. `homeState` is null: Discovery stores no location. */
export type LearningBlock = {
  title: string
  homeState: string | null
  homeStateReason: string
  homeStateNote: string
  localKinds: LocalKind[]
  localSource: string
  localSourceUrl: string
}

export type LocalKind = "training" | "licenses" | "apprenticeships"

export const LOCAL_KIND_TITLES: Record<LocalKind, string> = {
  training: "Training providers",
  licenses: "Licences",
  apprenticeships: "Apprenticeships",
}

export type LocalItem = {
  id: string | null
  title: string
  organisation?: string | null
  location?: string | null
  credential?: string | null
  format?: string | null
  /** Only when the source publishes one; never computed here. */
  cost?: string | number | null
  url?: string | null
}

/** One OD-5 answer, as /education/local returns it. `note` says why whenever it is not ready. */
export type LocalListing = {
  state: "ready" | "empty" | "off" | "unavailable"
  reason: string | null
  kind: LocalKind
  code: string
  area: { zip: string | null; state: string | null }
  source: string
  sourceUrl: string
  total: number | null
  data: LocalItem[]
  note: string | null
}

export type LocalQuery = { soc: string; kind: LocalKind; state: string }

type StageWithLearning = DiscoveryStage & { learning?: LearningMark }

/** The Learning and Education mark on the education stage, or null (today's pages). */
export function learningOf(stages: readonly DiscoveryStage[] | undefined | null): LearningMark | null {
  const edu = (stages ?? []).find((s) => s.id === "education") as StageWithLearning | undefined
  const mark = edu?.learning
  if (!mark || !Array.isArray(mark.buttons) || mark.buttons.length === 0) return null
  return mark
}

/** The /education answer's JF-10 block, or null (today's page). */
export function learningBlockOf(data: DiscoveryEducation | undefined | null): LearningBlock | null {
  const block = (data as (DiscoveryEducation & { learning?: LearningBlock }) | undefined | null)?.learning
  return block ?? null
}

/** A published cost, as the source wrote it. Nothing is invented when it is absent. */
export function publishedCost(item: LocalItem): string | null {
  const c = item.cost
  if (c === null || c === undefined || c === "") return null
  if (typeof c === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c)
  }
  return String(c)
}
