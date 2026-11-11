import { z } from "zod"

/** The server's limit on one counselor note (`MAX_NOTE_CHARS`). */
export const MAX_NOTE_CHARS = 2000

export const counselorNoteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a note first.")
    .max(MAX_NOTE_CHARS, `A note is at most ${MAX_NOTE_CHARS} characters.`),
})
