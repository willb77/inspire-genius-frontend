/**
 * 3.3a — the words FitEngineMatchPanel says for each state, and the as-of date.
 * Kept out of the component file so the panel exports components only.
 */
import type { FitEngineMatchesState } from "@/types/development"

export type FitEmptyState = Exclude<FitEngineMatchesState, "ok">

export function fitStateMessage(state: FitEmptyState, name: string): string {
  switch (state) {
    case "no_account":
      return `${name} doesn't have an Inspire Genius account yet, so there is no My fit to read.`
    case "not_shared":
      return `${name} hasn't shared their PRISM with you. Career matches come from it, so they stay private until ${name} shares it.`
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

export function formatAsOf(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
