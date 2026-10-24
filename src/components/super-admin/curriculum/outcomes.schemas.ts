import { z } from "zod"
import type { AdminOutcome, OutcomeInput } from "@/types/curriculum"

/**
 * Form schema for a program's outcomes (CUR-3).
 *
 * Mirrors the agent-engine's `app/tools/curriculum/outcomes.py` so the obvious
 * mistakes are caught before a round trip: a role family is required, a
 * program has at most 20 outcomes, an exact repeat is refused, and a SOC /
 * O*NET code must look like `NN-NNNN` or `NN-NNNN.NN`. The SERVER stays
 * authoritative — whether a pasted role id may be linked (active; shared
 * library or the school's own organisation's) is decided there and nowhere
 * else, and its refusal is rendered as it comes back.
 *
 * A SOC code is checked for its shape only. Nothing here or on the server
 * looks it up, which is why every screen labels it "not validated".
 */

export const MAX_OUTCOMES_PER_PROGRAM = 20

/** `15-1252` or `15-1252.00` — format only. */
export const SOC_FORMAT = /^\d{2}-\d{4}(\.\d{2})?$/

export function isSocCode(raw: string): boolean {
  return SOC_FORMAT.test(raw.trim())
}

const outcomeRow = z.object({
  roleFamily: z.string().trim().min(1, "Pick a role family"),
  blueprintId: z.string().max(64, "A role id is at most 64 characters"),
  socCode: z
    .string()
    .max(20, "At most 20 characters")
    .refine((v) => v.trim() === "" || isSocCode(v), "Use NN-NNNN or NN-NNNN.NN (format only — not validated)"),
})

export type OutcomeRowValues = z.input<typeof outcomeRow>

/** The key two outcomes are "the same" under — case and surrounding space ignored, as the server normalises. */
export function outcomeKey(v: OutcomeRowValues): string {
  const family = v.roleFamily.split(/\s+/).filter(Boolean).join(" ").toLowerCase()
  return [family, v.blueprintId.trim().toLowerCase(), v.socCode.trim()].join("|")
}

export function makeOutcomesSchema(max: number = MAX_OUTCOMES_PER_PROGRAM) {
  return z.object({
    outcomes: z
      .array(outcomeRow)
      .max(max, `A program can have at most ${max} outcomes`)
      .superRefine((rows, ctx) => {
        const seen = new Set<string>()
        rows.forEach((row, i) => {
          const key = outcomeKey(row)
          if (seen.has(key)) {
            ctx.addIssue({
              code: "custom",
              path: [i, "roleFamily"],
              message: `Outcome ${i + 1} repeats an earlier outcome`,
            })
          }
          seen.add(key)
        })
      }),
  })
}

export type OutcomesValues = z.input<ReturnType<typeof makeOutcomesSchema>>

export const EMPTY_OUTCOME: OutcomeRowValues = { roleFamily: "", blueprintId: "", socCode: "" }

export function toOutcomesValues(outcomes: AdminOutcome[]): OutcomesValues {
  return {
    outcomes: outcomes.map((o) => ({
      roleFamily: o.roleFamily,
      blueprintId: o.blueprintId ?? "",
      socCode: o.socCode ?? "",
    })),
  }
}

export function toOutcomeInputs(v: OutcomesValues): OutcomeInput[] {
  return v.outcomes.map((o) => ({
    roleFamily: o.roleFamily.trim(),
    blueprintId: o.blueprintId.trim() === "" ? null : o.blueprintId.trim(),
    socCode: o.socCode.trim() === "" ? null : o.socCode.trim(),
  }))
}
