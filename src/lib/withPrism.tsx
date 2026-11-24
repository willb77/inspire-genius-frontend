import { Fragment, type ReactNode } from "react"
import { Prism } from "@/components/shared/Prism"

/** The word on its own: `PRISM`, `Prism`, `prism`, but not `prism_scores` or `prismatic`. */
const PRISM_WORD = /\b(prism)\b/gi

/**
 * House style for the word PRISM: all capitals, italic.
 *
 * Returns the string untouched when it has no PRISM in it (so the DOM of every
 * other string is exactly what it was), and otherwise the same text with each
 * PRISM made into `<Prism />`. For text a string must stay, such as an attribute,
 * an `aria-label` or a `<title>`, use `prismCaps()` for the capitals alone: an
 * attribute cannot carry italics.
 */
export function withPrism(text: string): ReactNode {
  if (!text) return text
  PRISM_WORD.lastIndex = 0
  if (!PRISM_WORD.test(text)) return text
  const parts = text.split(PRISM_WORD)
  // split with one capture group alternates: text, match, text, match, ...
  return parts.map((part, i) =>
    i % 2 === 1 ? <Prism key={i} /> : part === "" ? null : <Fragment key={i}>{part}</Fragment>,
  )
}

/** Capitals only, for strings that cannot carry italics (attributes, tab titles, placeholders). */
export function prismCaps(text: string): string {
  return text.replace(PRISM_WORD, "PRISM")
}
