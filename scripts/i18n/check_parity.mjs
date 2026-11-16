#!/usr/bin/env node
// I18N-3 parity gate. Run from anywhere: node scripts/i18n/check_parity.mjs
//
// For en + es, fr, pt, it, pl, cs (decision D1; all other languages ignored) and every namespace:
//   (a) keys missing from the language,
//   (b) values identical to English with length > 3 that are not allowed,
//   (c) {{placeholders}} that differ from English, and required plural forms that are absent.
//
// RATCHET: the repo carries scripts/i18n/parity_baseline.json, the findings that existed when the
// gate was introduced (English placeholders copied into other languages). The gate fails only on
// findings NOT in the baseline. Phase P4 shrinks the baseline to empty, at which point the gate is
// strict. Missing keys and placeholder/plural mismatches fail unless already in the baseline.
//
//   --write-baseline   overwrite the baseline with the current findings (initial seeding only)
//   --shrink-baseline  drop baseline entries that are now fixed (never adds entries)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE, loadPendingNamespaces, computeFindings, readJsonFile, regressions, resolved, KINDS, TARGET_LANGS } from "./lib.mjs";

const BASELINE = join(HERE, "parity_baseline.json");
const args = new Set(process.argv.slice(2));
const glossary = readJsonFile(join(HERE, "glossary.json"), {});
const allow = readJsonFile(join(HERE, "allow_identical.json"), {});
const pendingNamespaces = loadPendingNamespaces();
const findings = computeFindings({ glossary, allow, pendingNamespaces });

function toBaseline(src) {
  const languages = {};
  for (const lang of TARGET_LANGS) languages[lang] = Object.fromEntries(KINDS.map((k) => [k, src[lang][k]]));
  return {
    _note: "Findings tolerated by the I18N-3 ratchet. Entries may only be removed (phase P4 empties this file). Do not add entries to make a PR pass.",
    languages,
  };
}

if (args.has("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify(toBaseline(findings), null, 1) + "\n");
  console.log("baseline written");
  process.exit(0);
}

const baseline = readJsonFile(BASELINE, null);
if (!baseline) {
  console.error("scripts/i18n/parity_baseline.json is missing");
  process.exit(2);
}

if (args.has("--shrink-baseline")) {
  const keep = {};
  for (const lang of TARGET_LANGS) {
    keep[lang] = {};
    for (const k of KINDS) {
      const now = new Set(findings[lang][k]);
      keep[lang][k] = (baseline.languages?.[lang]?.[k] ?? []).filter((id) => now.has(id));
    }
  }
  writeFileSync(BASELINE, JSON.stringify(toBaseline(keep), null, 1) + "\n");
  console.log("baseline shrunk");
  process.exit(0);
}

if (pendingNamespaces.length) console.log(`Namespaces awaiting first translation (scripts/i18n/pending): ${pendingNamespaces.join(", ")}\n`);
console.log("lang  missing  identical  placeholder-mismatch  plural   (current / baselined)");
for (const lang of TARGET_LANGS) {
  const cells = KINDS.map((k) => `${findings[lang][k].length}/${(baseline.languages?.[lang]?.[k] ?? []).length}`);
  console.log(`${lang.padEnd(4)}  ${cells.map((c) => c.padStart(9)).join("  ")}`);
}
const remaining = TARGET_LANGS.reduce((n, l) => n + findings[l].identical.length, 0);
console.log(`\nRemaining English-placeholder values (identical to en): ${remaining}`);

const stale = resolved(findings, baseline);
if (stale.length) console.log(`${stale.length} baseline entries are now fixed - run with --shrink-baseline to ratchet down.`);

const bad = regressions(findings, baseline);
if (bad.length) {
  console.error(`\nFAIL: ${bad.length} i18n parity regression(s):`);
  for (const b of bad.slice(0, 200)) console.error(`  [${b.kind}] ${b.id}`);
  if (bad.length > 200) console.error(`  ... and ${bad.length - 200} more`);
  console.error(
    "\nFix: add the missing key / restore the {{placeholder}} / translate the copied English value.\n" +
      "A value that is legitimately identical (a product name, a loanword) goes in scripts/i18n/allow_identical.json."
  );
  process.exit(1);
}
console.log("\nOK: no regressions against the baseline.");
