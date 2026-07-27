import type { PortraitSourceKey } from "@/types/lumen"

/**
 * The source-scope language a Lumen coaching session opens with.
 *
 * Lives apart from `CoachingPage` so it can be tested directly — the exact
 * wording is the whole mechanism, and it is the kind of thing that gets
 * "tidied" into uselessness. (It also keeps the page a components-only module,
 * which is what the react-refresh rule wants.)
 */

export const SOURCE_LABELS: Record<PortraitSourceKey, { label: string; hint: string }> = {
  prism: {
    label: "My PRISM scores",
    hint: "How you're wired — the anchor everything else reconciles against.",
  },
  assessments: {
    label: "My other assessments",
    hint: "Anything else you've taken — DISC, Big Five, MBTI, CliftonStrengths.",
  },
  resume: {
    label: "My résumé",
    hint: "The record of what you've actually done.",
  },
  bio: {
    label: "My bio",
    hint: "How you describe yourself, in your own words.",
  },
}

/** PRISM first: it leads the portrait, so it leads the scope line too. */
export const SOURCE_ORDER: PortraitSourceKey[] = ["prism", "assessments", "resume", "bio"]

/**
 * The scope line prepended to the question.
 *
 * Naming what to leave out matters as much as naming what to use: a user who
 * unticks their résumé usually means "don't argue from my job history", and an
 * instruction that only lists inclusions doesn't say that.
 *
 * This is a *stated* scope, not a server-side filter — the platform loads a
 * user's profile ambiently and the client cannot unload it. Worth being precise
 * about rather than implying a guarantee the chat transport can't make.
 */
export function buildScopeLine(
  selected: PortraitSourceKey[],
  available: PortraitSourceKey[],
  extra: string
): string {
  const parts: string[] = []
  const name = (k: PortraitSourceKey) => SOURCE_LABELS[k].label.replace(/^My /, "my ")

  if (selected.length > 0) {
    parts.push(`Draw on ${selected.map(name).join(", ")}.`)
  }
  const excluded = available.filter((k) => !selected.includes(k))
  if (excluded.length > 0) {
    parts.push(`Leave ${excluded.map(name).join(" and ")} out of this one.`)
  }
  if (selected.length === 0 && excluded.length > 0) {
    parts.push("Answer from what I tell you here rather than from my profile.")
  }
  const trimmed = extra.trim()
  if (trimmed) parts.push(`Also relevant: ${trimmed}`)
  return parts.join(" ")
}
