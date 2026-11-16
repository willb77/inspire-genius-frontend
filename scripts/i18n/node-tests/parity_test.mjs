// Run: node --test scripts/i18n/node-tests/
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { placeholders, samePlaceholders, requiredPluralForms, computeFindings, regressions, resolved } from "../lib.mjs";

const SCRIPTS = join(fileURLToPath(import.meta.url), "..", "..");

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "i18n-parity-"));
  for (const [lang, nss] of Object.entries(files)) {
    mkdirSync(join(dir, lang), { recursive: true });
    for (const [ns, obj] of Object.entries(nss)) writeFileSync(join(dir, lang, `${ns}.json`), JSON.stringify(obj));
  }
  return dir;
}
const opts = (locales) => ({ locales, langs: ["es"], glossary: { do_not_translate: ["Meridian"] }, allow: { values: ["Chat mode"], keys: [] } });

test("placeholders: multiset compare, whitespace-insensitive", () => {
  assert.deepEqual(placeholders("a {{ x }} b {{y}} {{x}}"), ["x", "x", "y"]);
  assert.ok(samePlaceholders("Hi {{name}}", "Hola {{ name }}"));
  assert.ok(!samePlaceholders("Hi {{name}}", "Hola {{nombre}}"));
  assert.ok(!samePlaceholders("{{a}} {{a}}", "{{a}}"));
});

test("(a) missing key is reported", () => {
  const d = fixture({ en: { common: { a: "Alpha text", b: "Beta text" } }, es: { common: { a: "Texto alfa" } } });
  const f = computeFindings(opts(d)).es;
  assert.deepEqual(f.missing, ["es/common/b"]);
});

test("(b) identical value reported; allow list, do_not_translate, short and letterless values are not", () => {
  const d = fixture({
    en: { common: { same: "Save changes", brand: "Meridian", short: "OK!", allowed: "Chat mode", num: "12345", ph: "{{count}}" } },
    es: { common: { same: "Save changes", brand: "Meridian", short: "OK!", allowed: "Chat mode", num: "12345", ph: "{{count}}" } },
  });
  assert.deepEqual(computeFindings(opts(d)).es.identical, ["es/common/same"]);
});

test("(c) placeholder mismatch is reported", () => {
  const d = fixture({ en: { common: { a: "Hi {{name}}" } }, es: { common: { a: "Hola {{nombre}}" } } });
  assert.deepEqual(computeFindings(opts(d)).es.placeholder, ["es/common/a"]);
});

test("(c) plural: a required form that is absent is reported; unused English forms are not 'missing'", () => {
  assert.deepEqual(requiredPluralForms("es").sort(), ["one", "other"]);
  assert.ok(requiredPluralForms("pl").includes("few"));
  const d = fixture({ en: { common: { n_one: "one item", n_other: "many items" } }, es: { common: { n_one: "un elemento" } } });
  const f = computeFindings(opts(d)).es;
  assert.equal(f.plural.length, 1);
  assert.match(f.plural[0], /needs other/);
});

test("ratchet: findings in the baseline pass, new findings regress, fixed ones show as resolved", () => {
  const d = fixture({ en: { common: { a: "Alpha text", b: "Beta text" } }, es: { common: { a: "Alpha text", b: "Beta text" } } });
  const f = computeFindings(opts(d));
  const full = { languages: { es: { identical: ["es/common/a", "es/common/b"] } } };
  assert.equal(regressions(f, full).length, 0);
  const partial = { languages: { es: { identical: ["es/common/a"] } } };
  assert.deepEqual(regressions(f, partial), [{ lang: "es", kind: "identical", id: "es/common/b" }]);
  const stale = { languages: { es: { identical: ["es/common/a", "es/common/b", "es/common/gone"] } } };
  assert.deepEqual(resolved(f, stale), [{ lang: "es", kind: "identical", id: "es/common/gone" }]);
});

test("CLI: gate passes on the committed locales", () => {
  const r = spawnSync("node", [join(SCRIPTS, "check_parity.mjs")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Remaining English-placeholder values/);
});

test("translate.mjs: dry run is the default, exits 0, prints an estimate, needs no key", () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const r = spawnSync("node", [join(SCRIPTS, "translate.mjs")], { encoding: "utf8", env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ESTIMATE/);
  assert.match(r.stdout, /DRY RUN: nothing sent/);
});

test("translate.mjs: --yes without a key in the environment refuses before any network call", () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const r = spawnSync("node", [join(SCRIPTS, "translate.mjs"), "--yes", "--lang", "es"], { encoding: "utf8", env });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ANTHROPIC_API_KEY is not set/);
});

test("translate.mjs: refuses a language outside the gated set (decision D1)", () => {
  const r = spawnSync("node", [join(SCRIPTS, "translate.mjs"), "--lang", "de"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("pending namespace: missing and identical are tolerated, placeholder mismatch is not, other namespaces still fail", () => {
  const d = fixture({
    en: { areaX: { a: "Alpha text {{n}}", b: "Beta text", d: "Delta text" }, common: { c: "Gamma text" } },
    es: { areaX: { b: "Beta text", a: "Texto {{m}}" }, common: {} },
  });
  const f = computeFindings({ ...opts(d), pendingNamespaces: ["areaX"] }).es;
  assert.deepEqual(f.missing, ["es/common/c"], "only the non-pending namespace is missing");
  assert.deepEqual(f.identical, [], "English copy in a pending namespace is tolerated");
  assert.deepEqual(f.placeholder, ["es/areaX/a"], "a placeholder mismatch is never tolerated");
  const strict = computeFindings(opts(d)).es;
  assert.ok(strict.missing.length === 2 && strict.identical.length === 1, "without the registration the same files are findings");
});

test("loadPendingNamespaces reads namespace from each pending/*.json", async () => {
  const { loadPendingNamespaces } = await import("../lib.mjs");
  const dir = mkdtempSync(join(tmpdir(), "i18n-pending-"));
  writeFileSync(join(dir, "a.json"), JSON.stringify({ namespace: "areaA" }));
  writeFileSync(join(dir, "b.json"), JSON.stringify({ namespace: "areaB", wave: "5A" }));
  writeFileSync(join(dir, "ignore.txt"), "x");
  assert.deepEqual(loadPendingNamespaces(dir).sort(), ["areaA", "areaB"]);
  assert.deepEqual(loadPendingNamespaces(join(dir, "nope")), []);
});
