/**
 * Client mirror of the server guards on the three Knowledge Continuity model
 * routes (next-question, extract, blueprint generate).
 *
 * The server refuses a caller without the vertical (403), a body past a length
 * bound (422) and too many calls in ten minutes (429). Without these helpers
 * every one of those read "please try again", and a retry of the same body
 * fails the same way. The limits below match the server's, so a body the form
 * lets through is one the server serves; the status mapping covers the case
 * where the two ever drift. Against a server without the guards nothing here
 * refuses anything the user could send before.
 */

export const KCE_MAX_ROLE_TITLE = 200
export const KCE_MAX_ANSWER = 10_000
export const KCE_MAX_CONTEXT = 20_000
export const KCE_MAX_TRANSCRIPT_TURNS = 60
/** Sum of every question and answer in one area's transcript. */
export const KCE_MAX_TRANSCRIPT_CHARS = 120_000

type Exchange = { question: string; answer: string }

/** Characters in a transcript, counted the way the server's cap counts them. */
export function transcriptChars(transcript: readonly Exchange[]): number {
  return transcript.reduce((n, ex) => n + ex.question.length + ex.answer.length, 0)
}

/** True when the server would accept this transcript's size. */
export function fitsTranscriptBounds(transcript: readonly Exchange[]): boolean {
  return (
    transcript.length <= KCE_MAX_TRANSCRIPT_TURNS &&
    transcriptChars(transcript) <= KCE_MAX_TRANSCRIPT_CHARS
  )
}

export type KceGuardRefusal = "noAccess" | "roleNotAllowed" | "tooMany" | "tooLong"

/** The server's explanation on an HTTP error, when it sent a string. */
function refusalDetail(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
  return typeof detail === "string" ? detail : ""
}

/**
 * A 403 is one of two refusals. The engine's entitlement gate names the
 * vertical ("none of the verticals [...] is enabled for this user"); the role
 * gate says "... is available to practitioners, managers, company admins, and
 * super admins only." Anything else, or no detail, stays the entitlement copy.
 */
function classify403(detail: string): "noAccess" | "roleNotAllowed" {
  if (/verticals/i.test(detail)) return "noAccess"
  if (/\bis available to\b.*\bonly\.?\s*$/i.test(detail)) return "roleNotAllowed"
  return "noAccess"
}

/** Which guard refused the call, from its HTTP status; undefined for anything else. */
export function kceGuardRefusal(error: unknown): KceGuardRefusal | undefined {
  if (!error || typeof error !== "object") return undefined
  const status = (error as { response?: { status?: number } }).response?.status
  if (status === 403) return classify403(refusalDetail(error))
  if (status === 429) return "tooMany"
  if (status === 413 || status === 422) return "tooLong"
  return undefined
}

/** The kcPages key for a refusal's message. */
export function kceGuardMessageKey(refusal: KceGuardRefusal): string {
  return `llmGuards.${refusal}`
}

/**
 * The message to show for a refused call, or undefined when no guard refused it.
 * A role refusal falls back to the server's own sentence if the key is missing.
 */
export function kceGuardText(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string
): string | undefined {
  const refusal = kceGuardRefusal(error)
  if (!refusal) return undefined
  if (refusal === "roleNotAllowed") {
    return t(kceGuardMessageKey(refusal), { defaultValue: refusalDetail(error) })
  }
  return t(kceGuardMessageKey(refusal))
}
