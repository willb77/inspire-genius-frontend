/**
 * Field limits for a Character Lab request — the server's, restated.
 *
 * These MUST equal `CharacterRequest` in agent-engine
 * `app/routes/character_lab.py` (name 1–120, source ≤200, notes ≤4000). The
 * server rejects anything longer with a 422 before the model is called, and
 * until 2026-10-22 the page neither limited the boxes nor showed why: a long
 * paste read only "Request failed with status code 422".
 */
export const CHARACTER_LIMITS = { name: 120, source: 200, notes: 4000 } as const

/** What the server will measure: the page sends `notes.trim()`. */
export function notesLength(notes: string): number {
  return notes.trim().length
}

export function notesOverLimit(notes: string): boolean {
  return notesLength(notes) > CHARACTER_LIMITS.notes
}
