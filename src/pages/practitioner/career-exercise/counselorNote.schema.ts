import { z } from "zod"

/** The server's limit on one counselor note (`MAX_NOTE_CHARS`). */
export const MAX_NOTE_CHARS = 2000

export const NOTE_REQUIRED_MESSAGE = "Write a note first."
export const NOTE_TOO_LONG_MESSAGE = `A note is at most ${MAX_NOTE_CHARS} characters.`

/**
 * The form renders a schema message through `t`: this maps one of the two messages above to its
 * `careerExerciseUi` key (null for anything else, which is then shown as-is). Validation itself
 * is unchanged: same rules, same messages.
 */
export function noteMessageKey(message: string): { key: string; en: string } | null {
  if (message === NOTE_REQUIRED_MESSAGE) return { key: "note.required", en: NOTE_REQUIRED_MESSAGE }
  if (message === NOTE_TOO_LONG_MESSAGE) return { key: "note.tooLong", en: NOTE_TOO_LONG_MESSAGE }
  return null
}

export const counselorNoteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, NOTE_REQUIRED_MESSAGE)
    .max(MAX_NOTE_CHARS, NOTE_TOO_LONG_MESSAGE),
})
