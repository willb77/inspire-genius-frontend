import { z } from "zod"

/**
 * Practitioner code format (PC-1c) — mirrors the server's
 * `app/practitioner_registry/codes.py`: 9 characters from an alphabet with no
 * look-alikes (no 0/O, 1/I/L, U); case, spaces and dashes ignored. The server
 * remains authoritative.
 */
const CODE_ALPHABET = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{9}$/

export const codeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
    .refine((v) => v.length > 0, "Enter the code your practitioner gave you")
    .refine((v) => v.length === 0 || CODE_ALPHABET.test(v), "A practitioner code is 9 letters and numbers, like ABC-DEF-GHJ"),
})
