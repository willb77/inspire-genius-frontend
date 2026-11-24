#!/usr/bin/env node
// Product-name guard: the name is written InspiresGenius, one word.
//
//   node scripts/product-name/check_product_name.mjs --check [--base origin/development]
//   node scripts/product-name/check_product_name.mjs --list              every counted hit
//   node scripts/product-name/check_product_name.mjs --shrink-baseline   lower or drop entries; never adds
//   node scripts/product-name/check_product_name.mjs --write-baseline    initial seeding only
//   --root DIR   scan DIR instead of the repository this script lives in (tests)
//   --base REF   base branch for both comparisons (default: $PRODUCT_NAME_BASE, else origin/development)
//
// The wrong forms are the older spellings of the name: two words, with or without the "s"; one word
// without the "s"; and the upper-case and underscore variants. They are assembled from fragments
// below so this file contains none of them. Lower-case and hyphenated forms are identifiers (the repo
// name, the domain) and are never matched.
//
// --check runs two checks, modelled on the i18n parity ratchet (scripts/i18n/check_parity.mjs):
//   1. ADDED LINES. Every line the change adds, from the merge base with the base branch to the
//      working tree. A wrong form on an added line fails. "No wrong form in new text."
//   2. WHOLE TREE AGAINST A BASELINE. Wrong forms are counted per file (tracked, plus untracked files
//      git does not ignore, so a brand-new local file is seen) and compared with
//      scripts/product-name/baseline.json:
//        - a file above its number, or with hits and no entry      -> FAIL
//        - a file below its number                                 -> pass; the ratchet command is printed
//        - an entry that is new or higher than at the merge base   -> FAIL (the baseline only shrinks)
//      When the baseline is empty the clean-up is finished.
//
// Identifiers are not prose and are allowed by the token rules in ALLOW_TOKENS, each with its reason.
//
// A run that read nothing must not look like a pass: every run prints the files and lines it read,
// exits 2 when the tree scan read no file, and exits 2 when the added lines it parsed from the diff
// do not equal what `git diff --numstat` reports for the same range.
//
// REPORT-ONLY versus REQUIRED: this script always returns its real exit code. Whether CI blocks on it
// is ONE switch in .github/workflows/product-name.yml:
//     PRODUCT_NAME_GUARD_REQUIRED: 'false'    # 'true' makes the job fail the pull request
//
// Exit codes: 0 clean; 1 a wrong form was added, a file is above baseline, or the baseline grew;
// 2 usage or precondition error (no mode, not a git tree, base ref missing, baseline unreadable,
// nothing scanned, diff cross-check failed).
// Dependency-free (plain node). Makes no network call and needs no secret.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const A = "Inspire";
const B = "Genius";
export const ONE_WORD = A + B;
export const WRONG = new RegExp(
  [`${A}s? ${B}`, ONE_WORD, `${A.toUpperCase()}S? ${B.toUpperCase()}`, `${A}s?_${B}`].join("|"),
  "g",
);
export const BASELINE_REL = "scripts/product-name/baseline.json";
const DEFAULT_BASE = "origin/development";

// Whole files that are skipped: [test(path), reason].
export const ALLOW_PATHS = [
  [(p) => p === "scripts/product-name/node-tests/check_product_name_test.mjs", "this guard's own test"],
];

const WORD = /[A-Za-z0-9_]/;
// True when a no-space form is glued to an identifier character on either side (an i18n key, a class
// name, a file name). Two-word forms are prose and never qualify. A letter that is the tail of a
// string escape (backslash-n before the name) is not glue.
function joined(line, start, end, form) {
  if (form.includes(" ")) return false;
  const after = line.slice(end, end + 1);
  let before = start > 0 ? line.slice(start - 1, start) : "";
  if (["n", "t", "r"].includes(before) && line.slice(start - 2, start - 1) === "\\") before = "";
  return WORD.test(after) || WORD.test(before);
}

// [name, reason, test]. test(...) is true when this occurrence is an identifier, not prose.
export const ALLOW_TOKENS = [
  ["namespace-or-name", "metric namespace or resource name: the form followed by / or -",
    (line, s, e, form) => form === ONE_WORD && ["/", "-"].includes(line.slice(e, e + 1))],
  ["code-symbol", "joined to a letter, digit or underscore: i18n key, class name, file name", joined],
  ["third-party-identifier", "the name of a project in another system (SonarQube)",
    (line) => /SONAR_PROJECT_NAME|sonar\.projectName/.test(line)],
];

export class Precondition extends Error {}

export function git(root, args, { check = true } = {}) {
  const r = spawnSync("git", ["-c", "core.quotePath=false", "-C", root, ...args], { encoding: "utf8", maxBuffer: 1 << 30 });
  if (r.error) throw new Precondition(`git could not be run: ${r.error.message}`);
  if (r.status !== 0) {
    if (check) throw new Precondition(`git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
    return "";
  }
  return r.stdout;
}

function findRoot(explicit) {
  const start = explicit ? resolve(explicit) : dirname(fileURLToPath(import.meta.url));
  if (!existsSync(start) || !lstatSync(start).isDirectory()) throw new Precondition(`--root ${start} is not a directory`);
  const top = git(start, ["rev-parse", "--show-toplevel"]).trim();
  if (!top) throw new Precondition(`${start} is not inside a git work tree`);
  return top;
}

export function pathAllowed(path) {
  for (const [test, reason] of ALLOW_PATHS) if (test(path)) return reason;
  return null;
}

export function scanLine(line) {
  const hits = [];
  const allowed = [];
  for (const m of line.matchAll(WRONG)) {
    const s = m.index;
    const e = s + m[0].length;
    const rule = ALLOW_TOKENS.find(([, , test]) => test(line, s, e, m[0]));
    if (rule) allowed.push(rule[0]);
    else hits.push(m[0]);
  }
  return { hits, allowed };
}

function readText(path) {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  const data = readFileSync(path);
  if (data.subarray(0, 8000).includes(0)) return null; // git's own binary heuristic
  return data.toString("utf8");
}

export function scanTree(root) {
  // Tracked files plus untracked ones git does not ignore. CI has none of the latter; locally a
  // brand-new file is where a new wrong form is most likely, and `git diff` (check 1) cannot see it
  // until it is added.
  const listed = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const files = [...new Set(listed.split("\0").filter(Boolean))].sort();
  const counts = {};
  const details = {};
  const ruleUse = {};
  const stats = { tracked: files.length, read: 0, lines: 0, skippedPath: 0, skippedBinary: 0, allowedTokens: 0 };
  for (const rel of files) {
    if (pathAllowed(rel)) {
      stats.skippedPath++;
      continue;
    }
    const text = readText(join(root, rel));
    if (text === null) {
      stats.skippedBinary++;
      continue;
    }
    stats.read++;
    const lines = text.split("\n");
    stats.lines += lines.length;
    lines.forEach((line, i) => {
      if (!line.includes(B) && !line.includes(B.toUpperCase())) return;
      const { hits, allowed } = scanLine(line);
      for (const name of allowed) ruleUse[name] = (ruleUse[name] ?? 0) + 1;
      stats.allowedTokens += allowed.length;
      if (hits.length) {
        counts[rel] = (counts[rel] ?? 0) + hits.length;
        (details[rel] ??= []).push(...hits.map((h) => [i + 1, h, line.trim().slice(0, 160)]));
      }
    });
  }
  return { counts, details, stats, ruleUse };
}

export function parseBaseline(text, where) {
  try {
    const files = JSON.parse(text).files;
    if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("'files' must be an object");
    for (const v of Object.values(files)) if (!Number.isInteger(v) || v <= 0) throw new Error("'files' must map path -> positive integer");
    return files;
  } catch (err) {
    throw new Precondition(`baseline ${where} is unreadable: ${err.message}`);
  }
}

function dumpBaseline(counts) {
  const files = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  return (
    JSON.stringify(
      {
        _note:
          "Older product-name spellings tolerated per file by scripts/product-name/check_product_name.mjs. Numbers may only go down. " +
          "Do not add or raise an entry to make a PR pass: fix the text. Lower it with: node scripts/product-name/check_product_name.mjs --shrink-baseline",
        // No stored total: it would be the one line every branch edits. It is derived.
        files,
      },
      null,
      1,
    ) + "\n"
  );
}

const sum = (obj) => Object.values(obj).reduce((n, v) => n + v, 0);
const HUNK = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

// Parse `git diff -U0 <base>` (base -> working tree) into { path: [[lineNumber, text], ...] }.
export function addedLines(root, baseSha) {
  const names = git(root, ["diff", "--name-only", "-z", baseSha]).split("\0").filter(Boolean);
  const raw = git(root, ["diff", "-U0", "--no-color", "--no-ext-diff", baseSha]);
  const out = {};
  let path = null;
  let minus = 0;
  let plus = 0;
  let lineno = 0;
  for (const line of raw.split("\n")) {
    if (minus || plus) {
      // inside a hunk body: the counts say what each line is
      if (line.startsWith("\\")) continue;
      if (line.startsWith("-") && minus) {
        minus--;
        continue;
      }
      if (line.startsWith("+") && plus) {
        plus--;
        if (path !== null) (out[path] ??= []).push([lineno, line.slice(1)]);
        lineno++;
        continue;
      }
      throw new Precondition(`diff parser lost its place at: ${JSON.stringify(line.slice(0, 80))}`);
    }
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).replace(/\t+$/, "");
      path = target === "/dev/null" ? null : target.startsWith("b/") ? target.slice(2) : target;
      continue;
    }
    const m = HUNK.exec(line);
    if (m) {
      minus = m[1] !== undefined ? Number(m[1]) : 1;
      lineno = Number(m[2]);
      plus = m[3] !== undefined ? Number(m[3]) : 1;
    }
  }
  // Cross-check against git's own count, so a parser that read nothing cannot pass.
  let expected = 0;
  for (const row of git(root, ["diff", "--numstat", "-z", baseSha]).split("\0")) {
    const parts = row.split("\t");
    if (parts.length >= 2 && /^\d+$/.test(parts[0])) expected += Number(parts[0]);
  }
  const parsed = Object.values(out).reduce((n, v) => n + v.length, 0);
  if (parsed !== expected) throw new Precondition(`diff cross-check failed: parsed ${parsed} added lines, git --numstat reports ${expected}`);
  return { added: out, nFiles: names.length };
}

function resolveBase(root, base) {
  if (!git(root, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`], { check: false }).trim()) {
    throw new Precondition(`base ref '${base}' does not resolve. Fetch it or pass --base. In CI the checkout needs fetch-depth: 0.`);
  }
  const mb = git(root, ["merge-base", base, "HEAD"], { check: false }).trim();
  if (!mb) throw new Precondition(`no merge base between '${base}' and HEAD (shallow clone?)`);
  return mb;
}

function cmdCheck(root, base, log) {
  const failures = [];
  const mb = resolveBase(root, base);
  log(`root: ${root}`);
  log(`base: ${base} (merge base ${mb.slice(0, 12)})`);

  // 1. added lines
  const { added, nFiles } = addedLines(root, mb);
  let scannedFiles = 0;
  let scannedLines = 0;
  let skippedFiles = 0;
  let totalAdded = 0;
  const newHits = [];
  for (const path of Object.keys(added).sort()) {
    totalAdded += added[path].length;
    if (pathAllowed(path)) {
      skippedFiles++;
      continue;
    }
    scannedFiles++;
    for (const [no, text] of added[path]) {
      scannedLines++;
      for (const h of scanLine(text).hits) newHits.push(`  ${path}:${no}: '${h}' in: ${text.trim().slice(0, 140)}`);
    }
  }
  log(
    `\n[1] added lines: ${nFiles} file(s) in the diff, ${totalAdded} added line(s) parsed (matches git --numstat); ` +
      `${scannedFiles} file(s) / ${scannedLines} line(s) checked, ${skippedFiles} file(s) skipped by path`,
  );
  if (nFiles === 0) log("    no diff against the base: nothing to check here");
  if (newHits.length) {
    log(`    FAIL: ${newHits.length} wrong product-name form(s) in added lines:`);
    log(newHits.slice(0, 200).join("\n"));
    if (newHits.length > 200) log(`    ... and ${newHits.length - 200} more`);
    failures.push(`${newHits.length} wrong form(s) in added lines`);
  } else log("    ok: no wrong form in added lines");

  // 2. whole tree against the baseline
  const { counts, details, stats, ruleUse } = scanTree(root);
  if (stats.read === 0) throw new Precondition("tree scan read 0 files; refusing to report a pass");
  const baselinePath = join(root, BASELINE_REL);
  if (!existsSync(baselinePath)) throw new Precondition(`${BASELINE_REL} is missing. Seed it once with --write-baseline.`);
  const baseline = parseBaseline(readFileSync(baselinePath, "utf8"), BASELINE_REL);
  const rules = Object.keys(ruleUse).sort().map((k) => `${k} ${ruleUse[k]}`).join(", ") || "none";
  log(
    `\n[2] whole tree: ${stats.tracked} file(s) listed (tracked, plus untracked and not ignored); ${stats.read} read, ${stats.lines} line(s); ` +
      `${stats.skippedPath} skipped by path, ${stats.skippedBinary} binary or not a regular file`,
  );
  log(
    `    hits: ${sum(counts)} in ${Object.keys(counts).length} file(s); baseline total: ${sum(baseline)} in ${Object.keys(baseline).length} file(s); ` +
      `identifiers allowed by token rule: ${stats.allowedTokens} (${rules})`,
  );
  const over = Object.keys(counts).sort().filter((p) => counts[p] > (baseline[p] ?? 0));
  const under = Object.keys(baseline).sort().filter((p) => (counts[p] ?? 0) < baseline[p]);
  if (over.length) {
    log(`    FAIL: ${over.length} file(s) above baseline:`);
    for (const p of over.slice(0, 200)) {
      log(`      ${p}: ${counts[p]} now, baseline ${baseline[p] ?? 0}`);
      for (const [no, form, text] of details[p].slice(0, 5)) log(`        ${no}: '${form}' in: ${text}`);
    }
    failures.push(`${over.length} file(s) above baseline`);
  } else log("    ok: no file above its baseline");
  if (under.length) {
    const drop = under.reduce((n, p) => n + baseline[p] - (counts[p] ?? 0), 0);
    log(
      `    ${under.length} file(s) are below baseline (${drop} fewer hit(s)). That passes. To ratchet down:\n` +
        "      node scripts/product-name/check_product_name.mjs --shrink-baseline",
    );
  }

  // 2b. the baseline itself may only shrink
  const baseText = git(root, ["show", `${mb}:${BASELINE_REL}`], { check: false });
  if (!baseText) log("    baseline is not present at the merge base (first landing): shrink-only comparison skipped");
  else {
    const was = parseBaseline(baseText, `at ${mb.slice(0, 12)}`);
    const grown = Object.keys(baseline).sort().filter((p) => baseline[p] > (was[p] ?? 0));
    if (grown.length) {
      log(`    FAIL: ${grown.length} baseline entr(ies) added or raised against the base:`);
      for (const p of grown.slice(0, 200)) log(`      ${p}: ${was[p] ?? 0} -> ${baseline[p]}`);
      failures.push(`${grown.length} baseline entr(ies) grew`);
    } else log(`    ok: baseline did not grow (base total ${sum(was)})`);
  }

  if (failures.length) {
    log(`\nFAIL: ${failures.join("; ")}`);
    log("Write the product name as InspiresGenius. Identifiers (keys, file names, the repo name) are not renamed.");
    return 1;
  }
  log("\nOK: product-name check passed");
  return 0;
}

function cmdList(root, log) {
  const { counts, details, stats } = scanTree(root);
  for (const p of Object.keys(details).sort()) for (const [no, form, text] of details[p]) log(`${p}:${no}: '${form}': ${text}`);
  log(`\n${sum(counts)} hit(s) in ${Object.keys(counts).length} file(s); ${stats.read} file(s) read`);
  return 0;
}

function cmdWrite(root, shrink, log) {
  const { counts, stats } = scanTree(root);
  if (stats.read === 0) throw new Precondition("tree scan read 0 files; refusing to write a baseline");
  const path = join(root, BASELINE_REL);
  let next = counts;
  if (shrink) {
    if (!existsSync(path)) throw new Precondition(`${BASELINE_REL} is missing; nothing to shrink`);
    const old = parseBaseline(readFileSync(path, "utf8"), BASELINE_REL);
    next = {};
    // Never adds a path and never raises a number.
    for (const [p, b] of Object.entries(old)) if ((counts[p] ?? 0) > 0) next[p] = Math.min(b, counts[p]);
    log(`baseline shrunk: ${sum(old)} -> ${sum(next)}`);
  } else log(`baseline written: ${sum(counts)} hit(s) in ${Object.keys(counts).length} file(s)`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, dumpBaseline(next));
  return 0;
}

const MODES = ["--check", "--list", "--shrink-baseline", "--write-baseline"];

export function main(argv, log = console.log, logErr = console.error) {
  const modes = [];
  let base = process.env.PRODUCT_NAME_BASE || DEFAULT_BASE;
  let root = null;
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (MODES.includes(a)) modes.push(a);
      else if (a === "--base" || a === "--root") {
        const v = argv[++i];
        if (v === undefined) throw new Precondition(`${a} needs a value`);
        if (a === "--base") base = v;
        else root = v;
      } else throw new Precondition(`unknown argument: ${a}`);
    }
    if (modes.length !== 1) throw new Precondition(`exactly one of ${MODES.join(", ")} is required`);
    const top = findRoot(root);
    if (modes[0] === "--check") return cmdCheck(top, base, log);
    if (modes[0] === "--list") return cmdList(top, log);
    return cmdWrite(top, modes[0] === "--shrink-baseline", log);
  } catch (err) {
    if (err instanceof Precondition) {
      logErr(`ERROR (exit 2): ${err.message}`);
      return 2;
    }
    throw err;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
