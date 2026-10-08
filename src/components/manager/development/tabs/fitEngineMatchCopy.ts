/**
 * 3.3a — the words FitEngineMatchPanel says for each state, and the as-of date.
 * Kept out of the component file so the panel exports components only.
 */
import type { FitEngineMatch, FitEngineMatchesState, FitMissingCategory } from "@/types/development"
import type { PartialCoverage } from "@/lib/job-fit/coverage"

export type FitEmptyState = Exclude<FitEngineMatchesState, "ok">

/**
 * Item 2 / A2: matches need the member's "PRISM profile" AND "Development"
 * switches (the labels on their Sharing page). `not_shared` names which are
 * off. An empty list is a backend that predates A2, which gated on PRISM alone,
 * so it keeps that sentence.
 */
function notSharedMessage(name: string, missing: readonly FitMissingCategory[]): string {
  const prism = missing.includes("prism")
  const development = missing.includes("development")
  if (prism && development) {
    return `${name} hasn't shared their PRISM profile or Development with you. Career matches need both, so they stay private until ${name} shares them.`
  }
  if (development) {
    return `${name} hasn't shared Development with you. Career matches sit under Development, so they stay private until ${name} shares it — sharing their PRISM profile alone doesn't include them.`
  }
  return `${name} hasn't shared their PRISM with you. Career matches come from it, so they stay private until ${name} shares it.`
}

export function fitStateMessage(
  state: FitEmptyState,
  name: string,
  missing: readonly FitMissingCategory[] = [],
): string {
  switch (state) {
    case "no_account":
      return `${name} doesn't have an Inspire Genius account yet, so there is no My fit to read.`
    case "not_shared":
      return notSharedMessage(name, missing)
    case "no_prism":
      return `${name} has no PRISM on file yet. Career matches are measured from it.`
    case "not_entitled":
      return `Job Fit isn't switched on for ${name}, so there is no My fit to read.`
    case "no_snapshot":
      return `${name} hasn't run My fit yet. Their matches appear here after they open it.`
    case "unavailable":
      return "Career matches couldn't be loaded just now. That isn't the same as having none — try again shortly."
  }
}

/**
 * BP-F5: the coverage of a match that rests on fewer than all of the role's
 * dimensions, else null. Older matches carry no counts and are not guessed at.
 */
export function fitMatchCoverage(m: FitEngineMatch): PartialCoverage | null {
  const evaluated = m.dimensionsEvaluated
  const total = m.dimensionsTotal
  if (typeof evaluated !== "number" || typeof total !== "number") return null
  if (total <= 0 || evaluated >= total) return null
  return { evaluated, total }
}

/** BP-F5: the manager-facing sentence for a partial profile. */
export function partialMatchesMessage(name: string, p: PartialCoverage): string {
  return (
    `Partial profile: these scores are based on the ${p.evaluated} of ${p.total} dimensions ` +
    `${name}'s PRISM on file measures. The other ${p.total - p.evaluated} are left out rather ` +
    `than counted against ${name}, and no overall fit rating is given until every dimension ` +
    `is measured.`
  )
}

export function formatAsOf(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
