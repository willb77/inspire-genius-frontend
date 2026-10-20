import type { DimensionBenchmark } from "@/types/job-blueprint"
import type { NoteDimension } from "./ValidationForms"

/** A Job DNA's 22 dimensions, keyed the way the validation routes accept them ("behavior:3"). */
export function noteDimensions(dna: {
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
}): NoteDimension[] {
  return [...dna.behaviors, ...dna.aptitudes, ...dna.coreTraits].map((d) => ({
    key: `${d.category}:${d.dimensionId}`,
    label: d.dimensionName,
  }))
}
