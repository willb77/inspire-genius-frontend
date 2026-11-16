/**
 * English fallback translator for the pure (non-React) interview helpers.
 *
 * Helpers such as `candidateLabel` take an optional `t` from
 * `useTranslation("interviewPages")`. Called without one (tests, non-React
 * callers) they render the English default value, so their output is unchanged.
 */
import type { TFunction } from "i18next"

export type TFn = TFunction<"interviewPages", undefined>

type EnglishOptions = { defaultValue: string } & Record<string, unknown>

const renderEnglish = (_key: string, options: string | EnglishOptions): string => {
  if (typeof options === "string") return options
  return options.defaultValue.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(options[name] ?? ""))
}

export const englishT = renderEnglish as unknown as TFn

/**
 * Sentences that wrap an element ("Suggested score: <b>4</b> / 5") are one
 * translatable string with a `{{slot}}` placeholder, split around the slot at
 * render time so a translator can reorder the sentence without the code
 * concatenating fragments.
 */
export const SLOT = "\u0000"

export function slotParts(text: string): [string, string] {
  const i = text.indexOf(SLOT)
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + 1)]
}

/** Same as {@link slotParts} for a sentence with several slots. */
export function slotSplit(text: string): string[] {
  return text.split(SLOT)
}
