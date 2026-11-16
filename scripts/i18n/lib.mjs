// Shared helpers for the I18N-3 parity gate and translation pipeline.
// No dependencies. Pure functions are exported so node:test can exercise them.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const LOCALES = join(ROOT, "public", "locales");
// Decision D1: only these languages are gated / translated. Others are ignored.
export const TARGET_LANGS = ["es", "fr", "pt", "it", "pl", "cs"];

export function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

export function listNamespaces(locales = LOCALES) {
  return readdirSync(join(locales, "en"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function loadFlat(lang, ns, locales = LOCALES) {
  const f = join(locales, lang, `${ns}.json`);
  if (!existsSync(f)) return null;
  return flatten(JSON.parse(readFileSync(f, "utf8")));
}

export function readJsonFile(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
}

/** Sorted multiset of {{placeholders}} (whitespace-insensitive, formatter kept). */
export function placeholders(value) {
  const out = [];
  for (const m of String(value).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) out.push(m[1].replace(/\s+/g, " "));
  return out.sort();
}

export function samePlaceholders(a, b) {
  const x = placeholders(a), y = placeholders(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

const PLURAL_RE = /^(.*)_(zero|one|two|few|many|other)$/;

/** Plural categories a language must supply. `many` is excluded for languages
 *  where CLDR uses it only for very large or fractional numbers (es/fr/it/pt/cs),
 *  and zero/two are excluded everywhere (none of the six gated languages use them). */
export function requiredPluralForms(lang) {
  const cats = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
  const skipMany = ["es", "fr", "it", "pt", "cs"].includes(lang);
  return cats.filter((c) => c !== "zero" && c !== "two" && !(c === "many" && skipMany));
}

/** Plural base keys present in an English flat map. */
export function pluralBases(enFlat) {
  const bases = new Set();
  for (const k of Object.keys(enFlat)) {
    const m = PLURAL_RE.exec(k);
    if (m && /_(one|other)$/.test(k)) bases.add(m[1]);
  }
  return bases;
}

export function isAllowedIdentical(value, ctx) {
  if (ctx.doNotTranslate.has(value.trim())) return true;
  if (!/\p{L}/u.test(value.replace(/\{\{[^}]*\}\}/g, ""))) return true; // no letters left: numbers, URLs of symbols, bare placeholders
  if (ctx.allowValues.has(value)) return true;
  return false;
}

/**
 * Compute findings for every gated language.
 * Returns { [lang]: { missing:[id], identical:[id], placeholder:[id], plural:[id] } }, ids are "lang/ns/key".
 */
export function computeFindings({ locales = LOCALES, langs = TARGET_LANGS, glossary, allow } = {}) {
  const ctx = {
    doNotTranslate: new Set((glossary?.do_not_translate ?? []).map((s) => s.trim())),
    allowValues: new Set(allow?.values ?? []),
  };
  const allowKeys = new Set(allow?.keys ?? []);
  const namespaces = listNamespaces(locales);
  const out = {};
  for (const lang of langs) {
    const f = { missing: [], identical: [], placeholder: [], plural: [] };
    for (const ns of namespaces) {
      const en = loadFlat("en", ns, locales) ?? {};
      const t = loadFlat(lang, ns, locales);
      const bases = pluralBases(en);
      for (const [k, v] of Object.entries(en)) {
        const id = `${lang}/${ns}/${k}`;
        const isPluralForm = PLURAL_RE.test(k) && bases.has(PLURAL_RE.exec(k)[1]);
        if (!t || !(k in t)) {
          // A plural form the language does not use (e.g. en _one/_other vs pl _few) is not "missing".
          if (!isPluralForm) f.missing.push(id);
          continue;
        }
        if (!samePlaceholders(v, t[k])) f.placeholder.push(id);
        if (t[k] === v && v.length > 3 && !allowKeys.has(id) && !allowKeys.has(`*/${ns}/${k}`) && !isAllowedIdentical(v, ctx))
          f.identical.push(id);
      }
      if (t) {
        const req = requiredPluralForms(lang);
        for (const base of bases) {
          const need = req.filter((c) => !((base + "_" + c) in t));
          if (need.length) f.plural.push(`${lang}/${ns}/${base} (needs ${need.join(",")})`);
        }
      }
    }
    for (const k of Object.keys(f)) f[k].sort();
    out[lang] = f;
  }
  return out;
}

export const KINDS = ["missing", "identical", "placeholder", "plural"];

/** Findings not already recorded in the baseline. */
export function regressions(findings, baseline) {
  const res = [];
  for (const [lang, f] of Object.entries(findings)) {
    for (const kind of KINDS) {
      const known = new Set(baseline?.languages?.[lang]?.[kind] ?? []);
      for (const id of f[kind]) if (!known.has(id)) res.push({ lang, kind, id });
    }
  }
  return res;
}

/** Baseline entries that no longer occur (candidates for shrinking). */
export function resolved(findings, baseline) {
  const res = [];
  for (const [lang, b] of Object.entries(baseline?.languages ?? {})) {
    for (const kind of KINDS) {
      const now = new Set(findings[lang]?.[kind] ?? []);
      for (const id of b[kind] ?? []) if (!now.has(id)) res.push({ lang, kind, id });
    }
  }
  return res;
}
