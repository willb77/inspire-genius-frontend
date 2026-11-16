import type { i18n as I18nInstance } from "i18next"

/**
 * en-XA pseudo-locale (I18N-3). DEV ONLY: src/lib/i18n.ts imports this module behind
 * `import.meta.env.DEV`, so Vite drops it from production builds. It is deliberately
 * NOT in `supportedLngs` in source and NOT in the LanguageSwitcher; it is reached by
 * `i18n.changeLanguage("en-XA")` from the dev console.
 *
 * Every English string becomes "[!! Ŝťŕíńģ ... !!]", padded about 40 percent so layout
 * overflow shows up before a translator is involved. A string that reaches the screen
 * unbracketed was never routed through t().
 */
export const PSEUDO_LNG = "en-XA"

const MAP: Record<string, string> = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ģ", h: "ĥ", i: "í", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ",
  n: "ñ", o: "ó", p: "þ", q: "ɋ", r: "ŕ", s: "š", t: "ť", u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ", L: "Ĺ", M: "Ṁ",
  N: "Ñ", O: "Ó", P: "Þ", Q: "Ɋ", R: "Ŕ", S: "Ŝ", T: "Ť", U: "Ú", V: "Ṽ", W: "Ŵ", X: "Ẋ", Y: "Ý", Z: "Ž",
}

// Spans that must survive untouched: i18next placeholders and HTML tags.
const PROTECTED = /(\{\{[^}]*\}\}|<\/?[a-zA-Z][^>]*>)/g

export function pseudolocalize(input: string): string {
  const parts = input.split(PROTECTED)
  let letters = 0
  const body = parts
    .map((part, i) => {
      if (i % 2 === 1) return part // protected span (split with a capture group alternates)
      return part.replace(/[A-Za-z]/g, (c) => {
        letters++
        return MAP[c] ?? c
      })
    })
    .join("")
  const pad = "~".repeat(Math.ceil(letters * 0.4))
  return `[!! ${body}${pad ? " " + pad : ""} !!]`
}

export function installPseudoLocale(i18n: I18nInstance, namespaces: readonly string[]): void {
  i18n.use({
    type: "postProcessor",
    name: "pseudo",
    process(value: string): string {
      return i18n.language === PSEUDO_LNG && typeof value === "string" ? pseudolocalize(value) : value
    },
  })
  // Resolve the language and stop the HTTP backend requesting /locales/en-XA/*.json (they do not exist).
  const opts = i18n.options as { supportedLngs?: string[] | false; postProcess?: string[] | string | false }
  if (Array.isArray(opts.supportedLngs)) opts.supportedLngs = [...opts.supportedLngs, PSEUDO_LNG]
  // languageUtils keeps its own copy of the list, read by changeLanguage(); extend it too.
  const lu = (i18n.services as { languageUtils?: { supportedLngs?: string[] | false } }).languageUtils
  if (lu && Array.isArray(lu.supportedLngs)) lu.supportedLngs = [...lu.supportedLngs, PSEUDO_LNG]
  opts.postProcess = ["pseudo"]
  for (const ns of namespaces) i18n.addResourceBundle(PSEUDO_LNG, ns, {}, true, false)
  // Missing keys in en-XA fall back to en, then get pseudolocalised by the post-processor.
  i18n.options.fallbackLng = ["en"]
}
