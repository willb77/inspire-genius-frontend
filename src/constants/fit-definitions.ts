// JF-5 — the definitions the fit cards show on hover, focus or tap.
//
// The per-dimension text is NOT restated here: it is read from the one catalogue
// the app already ships (`constants/job-blueprint/dimensions.ts`), so a card and
// the Job Blueprint authoring screens can never describe a dimension two ways.
// The group and status lines below are short plain-language descriptions of how
// the cards are read; they are placeholders until the canonical wording is
// confirmed.

import type { DimensionCategory } from "@/types/job-blueprint"
import { APTITUDES, BEHAVIORS, CORE_TRAITS, type DimensionDef } from "@/constants/job-blueprint/dimensions"

/** The three groups the cards are laid out in, in display order. */
export const FIT_CARD_GROUP_ORDER: readonly DimensionCategory[] = ["behavior", "aptitude", "core-trait"]

export const FIT_CARD_GROUP_LABELS: Record<DimensionCategory, string> = {
  behavior: "Behavior preferences",
  aptitude: "Work aptitudes",
  "core-trait": "Core traits",
}

export const FIT_CARD_GROUP_DEFINITIONS: Record<DimensionCategory, string> = {
  behavior: "How you prefer to approach work and other people.",
  aptitude: "The kinds of work you are drawn to and enjoy.",
  "core-trait": "Personal qualities that shape how you handle work over time.",
}

/** How a priority dimension compares with what the job asks for. */
export type FitCardStatus = "match" | "close" | "growth"

export const FIT_CARD_STATUS_LABELS: Record<FitCardStatus, string> = {
  match: "Match",
  close: "Close",
  growth: "Growth area",
}

export const FIT_CARD_STATUS_DEFINITIONS: Record<FitCardStatus, string> = {
  match: "Your rating is at or above what this job asks for.",
  close: "Your rating is within 10 points below what this job asks for.",
  growth: "Your rating is more than 10 points below what this job asks for — a good area to build on.",
}

const CATALOGUE: Record<DimensionCategory, readonly DimensionDef[]> = {
  behavior: BEHAVIORS,
  aptitude: APTITUDES,
  "core-trait": CORE_TRAITS,
}

/**
 * The definition of one dimension, matched on its name within its category
 * (case-insensitive); the id is used only when no name was sent. A name the
 * catalogue does not know returns null, and the card then shows the name with
 * no definition rather than another dimension's text picked by id.
 */
export function dimensionDefinition(
  category: DimensionCategory,
  dimensionId: number,
  dimensionName: string,
): string | null {
  const list = CATALOGUE[category]
  if (!list) return null
  const byName = list.find((d) => d.name.toLowerCase() === dimensionName.trim().toLowerCase())
  if (byName) return byName.description
  const byId = list.find((d) => d.id === dimensionId)
  return byId && !dimensionName.trim() ? byId.description : null
}
