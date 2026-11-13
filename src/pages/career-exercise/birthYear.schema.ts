import { z } from "zod"

/**
 * CX-AGE — the year someone was born. Only a plausible year: not before 1900
 * and not in the future. The server applies the same bounds (and decides
 * everything else); nothing here knows an age cut-off.
 */
export const EARLIEST_BIRTH_YEAR = 1900

const YEAR_MESSAGE = "Enter the year you were born, for example 2001."

export function birthYearSchema(currentYear: number = new Date().getFullYear()) {
  return z.object({
    birthYear: z
      .string()
      .trim()
      .regex(/^\d{4}$/, YEAR_MESSAGE)
      .transform((v) => Number(v))
      .refine((y) => y >= EARLIEST_BIRTH_YEAR && y <= currentYear, YEAR_MESSAGE),
  })
}

export type BirthYearInput = z.input<ReturnType<typeof birthYearSchema>>
export type BirthYearForm = z.output<ReturnType<typeof birthYearSchema>>
