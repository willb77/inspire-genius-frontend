#!/usr/bin/env node
// I18N-0 inventory. Run from the repo root: node scripts/i18n/inventory.mjs
// No dependencies. Read-only. All hardcoded-text figures are APPROXIMATE
// (regex, not a parser): they size the work, they do not prove a gap.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const LOCALES = join(ROOT, "public", "locales");
const SRC = join(ROOT, "src");
const TARGETS = ["es", "fr", "pt", "it", "pl", "cs"];
const NAMESPACES = ["admin", "auth", "chat", "coaching", "common", "dashboard"];

if (!existsSync(join(LOCALES, "en")) || !existsSync(SRC)) {
  console.error("Run from the repository root (needs public/locales/en and src/).");
  process.exit(2);
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

function load(lang, ns) {
  const f = join(LOCALES, lang, `${ns}.json`);
  if (!existsSync(f)) return null;
  return flatten(JSON.parse(readFileSync(f, "utf8")));
}

console.log("== Locale keys (6 namespaces: " + NAMESPACES.join(", ") + ") ==");
const en = {};
let enTotal = 0;
for (const ns of NAMESPACES) {
  en[ns] = load("en", ns) ?? {};
  enTotal += Object.keys(en[ns]).length;
}
console.log(`keys in en: ${enTotal}`);
console.log("lang  keys  missing  identical-to-en(len>3)");
for (const lang of TARGETS) {
  let keys = 0, missing = 0, same = 0;
  for (const ns of NAMESPACES) {
    const t = load(lang, ns);
    for (const [k, v] of Object.entries(en[ns])) {
      if (!t || !(k in t)) { missing++; continue; }
      keys++;
      if (t[k] === v && v.length > 3) same++;
    }
  }
  console.log(`${lang.padEnd(4)}  ${String(keys).padStart(4)}  ${String(missing).padStart(7)}  ${String(same).padStart(6)}`);
}
console.log("(identical-to-en is a proxy: brand names and loanwords also match.)");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.(test|spec)\./.test(name) && !name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

// JSX text node: >Some words< on one line, at least one letter and 2+ chars,
// not an expression ({...}) and not an entity-only/arrow fragment.
const JSX_TEXT = />\s*([A-Z][A-Za-z][^<>{}=;]{2,}?)\s*</g;
const TOAST = /\btoast(?:\.(?:success|error|info|warning|message|loading))?\(\s*(["'`])/g;
const LABEL = /\b(?:label|title|description|placeholder|name)\s*:\s*(["'])[A-Za-z][^"']{2,}\1/g;

const areas = {};
const files = walk(SRC);
let filesWithText = 0, totalText = 0, totalToast = 0, totalLabel = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const parts = relative(SRC, f).split(sep);
  const area = parts.length > 1 ? parts.slice(0, parts[0] === "pages" && parts.length > 2 ? 2 : 1).join("/") : "(root)";
  const a = (areas[area] ??= { files: 0, text: 0, toast: 0, label: 0 });
  a.files++;
  const text = (f.endsWith(".tsx") ? (src.match(JSX_TEXT) || []).length : 0);
  const toast = (src.match(TOAST) || []).length;
  const label = (src.match(LABEL) || []).length;
  a.text += text; a.toast += toast; a.label += label;
  if (text > 0) filesWithText++;
  totalText += text; totalToast += toast; totalLabel += label;
}

console.log("\n== Hardcoded English in src (APPROXIMATE: regex counts, tests excluded) ==");
const tsxCount = files.filter((f) => f.endsWith(".tsx")).length;
console.log(`src .ts/.tsx files scanned: ${files.length} (${tsxCount} .tsx); .tsx files with JSX text nodes: ${filesWithText}`);
console.log(`JSX text nodes: ${totalText}; toast calls with a literal: ${totalToast}; label-style constants: ${totalLabel}`);
console.log("area                                   files  text  toast  label");
for (const [area, a] of Object.entries(areas).sort((x, y) => y[1].text - x[1].text)) {
  if (a.text + a.toast + a.label === 0) continue;
  console.log(`${area.padEnd(38)} ${String(a.files).padStart(5)} ${String(a.text).padStart(5)} ${String(a.toast).padStart(6)} ${String(a.label).padStart(6)}`);
}
process.exit(0);
