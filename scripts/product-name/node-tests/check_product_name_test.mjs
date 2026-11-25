// Mutation tests for the product-name guard. Run: node --test scripts/product-name/node-tests/*_test.mjs
//
// Each test builds a throwaway git repository, breaks exactly one thing and reads the script's real
// exit code from a child process. The tests that matter most are the ones where the guard must FAIL:
// a guard hard-coded to "OK" would pass all the others.
//
// This file is on the guard's path allowlist because its fixtures are wrong forms by design. They
// are still assembled from fragments, so a plain search for a wrong form does not land here.
import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BASELINE_REL, Precondition, addedLines, scanLine } from "../check_product_name.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "check_product_name.mjs");
const A = "Inspire";
const B = "Genius";
const TWO_WORDS = `${A} ${B}`;
const TWO_WORDS_S = `${A}s ${B}`;
const ONE_WORD = A + B;
const UPPER = `${A.toUpperCase()}S ${B.toUpperCase()}`;
const UNDERSCORE = `${A}_${B}`;
const RIGHT = `${A}s${B}`;
const ALL_WRONG = [TWO_WORDS, TWO_WORDS_S, ONE_WORD, UPPER, UNDERSCORE];

const IDENTIFIER_LINES = [
  `"askAbout${ONE_WORD}": "Ask about ${RIGHT}…",`,
  `t("popup.askAbout${ONE_WORD}", { defaultValue: "Ask about ${RIGHT}" })`,
  `output_path = os.path.join(output_dir, "${UNDERSCORE}_Architecture_Plan.docx")`,
  `class ${ONE_WORD}Adapter {}`,
  `const NAMESPACE = "${ONE_WORD}/Frontend";`,
  `const ROLE = "${ONE_WORD}-Deploy";`,
  `    SONAR_PROJECT_NAME: "${ONE_WORD} Frontend"`,
  `the repo inspire-genius-frontend and the domain inspiresgenius.com are identifiers; ${RIGHT} is the name`,
];

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};
delete ENV.PRODUCT_NAME_BASE;

function git(repo, ...args) {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", env: ENV });
  assert.equal(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
}
function run(repo, args, opts = {}) {
  const argv = [SCRIPT, ...args, ...(repo ? ["--root", repo] : [])];
  const r = spawnSync(process.execPath, argv, { encoding: "utf8", env: ENV, ...opts });
  return { rc: r.status, out: r.stdout + r.stderr };
}
function write(repo, rel, text) {
  mkdirSync(dirname(join(repo, rel)), { recursive: true });
  writeFileSync(join(repo, rel), text);
}
const append = (repo, rel, text) => appendFileSync(join(repo, rel), text);
const check = (repo) => run(repo, ["--check", "--base", "base"]);
const baseline = (repo) => JSON.parse(readFileSync(join(repo, BASELINE_REL), "utf8"));

// A repo on branch `work`, cut from `base`, with a seeded baseline of 5.
function makeRepo(t) {
  const dir = mkdtempSync(join(tmpdir(), "product-name-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q");
  git(repo, "checkout", "-q", "-b", "base");
  write(repo, "clean.txt", `${RIGHT} is the product.\nsecond line\n`);
  write(repo, "docs/legacy.md", `# ${TWO_WORDS}\n\n${TWO_WORDS_S} was the old spelling.\nkeep\n${ONE_WORD} too.\n`);
  write(repo, "docs/other.md", `${TWO_WORDS} once.\n${UPPER} twice.\n`);
  write(repo, "src/ids.ts", IDENTIFIER_LINES.join("\n") + "\n");
  write(repo, "scripts/product-name/node-tests/check_product_name_test.mjs", `const W = "${TWO_WORDS}";\n`);
  writeFileSync(join(repo, "logo.bin"), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(TWO_WORDS)]));
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "fixture");
  const seeded = run(repo, ["--write-baseline"]);
  assert.equal(seeded.rc, 0, seeded.out);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "baseline");
  git(repo, "checkout", "-q", "-b", "work");
  return repo;
}

// ---- controls ----------------------------------------------------------------------------------
test("populated control: the fixture has hits, and a clean change passes and says what it read", (t) => {
  const repo = makeRepo(t);
  const b = baseline(repo);
  assert.deepEqual(b.files, { "docs/legacy.md": 3, "docs/other.md": 2 });
  assert.ok(!("total" in b)); // derived, never stored: no line every branch edits
  append(repo, "clean.txt", `a new line about ${RIGHT}\n`);
  const { rc, out } = check(repo);
  assert.equal(rc, 0, out);
  assert.match(out, /1 file\(s\) in the diff, 1 added line\(s\) parsed/);
  assert.match(out, /1 file\(s\) \/ 1 line\(s\) checked/);
  assert.match(out, /5 read,/);
  assert.match(out, /hits: 5 in 2 file\(s\); baseline total: 5/);
  assert.match(out, /1 skipped by path, 1 binary/);
});

test("every allowlisted identifier passes", (t) => {
  const repo = makeRepo(t);
  write(repo, "src/more_ids.ts", IDENTIFIER_LINES.join("\n") + "\n");
  git(repo, "add", "-A");
  const { rc, out } = check(repo);
  assert.equal(rc, 0, out);
  assert.ok(out.includes(`${IDENTIFIER_LINES.length} line(s) checked`), out);
  for (const line of IDENTIFIER_LINES) assert.deepEqual(scanLine(line).hits, [], line);
});

// ---- the guard must fail -----------------------------------------------------------------------
for (const form of ALL_WRONG) {
  test(`wrong form added to a clean file fails (${form.replace(B, "…").replace(B.toUpperCase(), "…")})`, (t) => {
    const repo = makeRepo(t);
    append(repo, "clean.txt", `Welcome to ${form}.\n`);
    const { rc, out } = check(repo);
    assert.equal(rc, 1, out);
    assert.match(out, /1 wrong product-name form\(s\) in added lines/);
    assert.match(out, /clean\.txt:3/);
    assert.match(out, /1 file\(s\) above baseline/);
  });
}

test("wrong form in a new committed file fails (path with a space)", (t) => {
  const repo = makeRepo(t);
  write(repo, "src/new page.tsx", `<h1>${TWO_WORDS}</h1>\n`);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "add page");
  const { rc, out } = check(repo);
  assert.equal(rc, 1, out);
  assert.match(out, /src\/new page\.tsx:1/);
});

test("wrong form in an untracked new file fails on the tree scan", (t) => {
  const repo = makeRepo(t);
  write(repo, "docs/brand new.md", `About ${TWO_WORDS_S}.\n`);
  const { rc, out } = check(repo);
  assert.equal(rc, 1, out);
  assert.match(out, /docs\/brand new\.md: 1 now, baseline 0/);
  assert.match(out, /ok: no wrong form in added lines/); // check 1 alone would have passed
});

test("an added wrong form fails even when the file's count does not rise", (t) => {
  const repo = makeRepo(t);
  const text = readFileSync(join(repo, "docs/legacy.md"), "utf8").replace(`${ONE_WORD} too.\n`, `A brand new sentence about ${TWO_WORDS}.\n`);
  write(repo, "docs/legacy.md", text);
  const { rc, out } = check(repo);
  assert.equal(rc, 1, out);
  assert.match(out, /wrong product-name form\(s\) in added lines/);
  assert.match(out, /ok: no file above its baseline/);
});

test("prose glued to punctuation or a string escape is not an identifier", () => {
  for (const line of [
    `_${TWO_WORDS} engineering plan_`,
    `run = title.add_run("\\n${TWO_WORDS} plan")`,
    `subject = "\\n${ONE_WORD} news"`,
    `title = "${ONE_WORD} config"`,
    `"noAccount": "{{name}} does not have an ${TWO_WORDS} account yet"`,
  ]) {
    assert.equal(scanLine(line).hits.length, 1, line);
  }
});

test("raising a baseline number fails", (t) => {
  const repo = makeRepo(t);
  const b = baseline(repo);
  b.files["docs/other.md"] = 3;
  write(repo, BASELINE_REL, JSON.stringify(b, null, 1) + "\n");
  append(repo, "docs/other.md", "an innocent line\n");
  const { rc, out } = check(repo);
  assert.equal(rc, 1, out);
  assert.match(out, /1 baseline entr\(ies\) added or raised/);
  assert.match(out, /docs\/other\.md: 2 -> 3/);
});

test("adding a baseline entry to cover a new hit fails", (t) => {
  const repo = makeRepo(t);
  append(repo, "clean.txt", `${TWO_WORDS}\n`);
  assert.equal(run(repo, ["--write-baseline"]).rc, 0); // the tempting shortcut
  const { rc, out } = check(repo);
  assert.equal(rc, 1, out);
  assert.match(out, /clean\.txt: 0 -> 1/);
  assert.match(out, /wrong product-name form\(s\) in added lines/);
});

// ---- the ratchet -------------------------------------------------------------------------------
test("fixing text passes without editing the baseline; --shrink-baseline lowers and never adds", (t) => {
  const repo = makeRepo(t);
  const before = readFileSync(join(repo, BASELINE_REL), "utf8");
  write(repo, "docs/legacy.md", readFileSync(join(repo, "docs/legacy.md"), "utf8").replace(TWO_WORDS_S, RIGHT));
  rmSync(join(repo, "docs/other.md"));
  let r = check(repo);
  assert.equal(r.rc, 0, r.out);
  assert.match(r.out, /2 file\(s\) are below baseline \(3 fewer hit\(s\)\)\. That passes\./);
  assert.match(r.out, /--shrink-baseline/);
  assert.equal(readFileSync(join(repo, BASELINE_REL), "utf8"), before); // the check never writes
  append(repo, "clean.txt", `${TWO_WORDS}\n`);
  r = run(repo, ["--shrink-baseline"]);
  assert.equal(r.rc, 0, r.out);
  assert.match(r.out, /5 -> 2/);
  assert.deepEqual(baseline(repo).files, { "docs/legacy.md": 2 });
  r = check(repo);
  assert.equal(r.rc, 1, r.out);
  assert.match(r.out, /clean\.txt: 1 now, baseline 0/);
});

test("two branches fix different files and neither edits the baseline", (t) => {
  const repo = makeRepo(t);
  git(repo, "checkout", "-q", "-b", "lane-a", "base");
  write(repo, "docs/legacy.md", "# fixed\n");
  git(repo, "commit", "-q", "-am", "lane a");
  assert.equal(run(repo, ["--check", "--base", "base"]).rc, 0);
  git(repo, "checkout", "-q", "-b", "lane-b", "base"); // cut from the OLD base
  write(repo, "docs/other.md", "fixed\n");
  git(repo, "commit", "-q", "-am", "lane b");
  git(repo, "checkout", "-q", "base");
  git(repo, "merge", "-q", "--no-ff", "-m", "land a", "lane-a");
  assert.equal(run(repo, ["--shrink-baseline"]).rc, 0); // someone ratchets the base after lane B branched
  git(repo, "commit", "-q", "-am", "ratchet");
  git(repo, "checkout", "-q", "lane-b");
  let r = run(repo, ["--check", "--base", "base"]); // its older, higher baseline is not "growth"
  assert.equal(r.rc, 0, r.out);
  git(repo, "checkout", "-q", "-b", "merge-b", "base"); // as CI sees it: the merge result
  git(repo, "merge", "-q", "--no-ff", "-m", "land b", "lane-b");
  r = run(repo, ["--check", "--base", "base"]);
  assert.equal(r.rc, 0, r.out);
  assert.match(r.out, /hits: 0 in 0 file\(s\); baseline total: 2/);
});

// ---- a run that could not check anything is exit 2, never 0 ------------------------------------
test("usage and precondition errors exit 2", (t) => {
  const repo = makeRepo(t);
  assert.equal(run(repo, []).rc, 2); // no mode
  assert.equal(run(repo, ["--check", "--list"]).rc, 2); // two modes
  assert.equal(run(repo, ["--frobnicate"]).rc, 2);
  assert.equal(run(null, ["--check", "--base"]).rc, 2); // flag with no value
  let r = run(repo, ["--check", "--base", "no-such-ref"]);
  assert.equal(r.rc, 2, r.out);
  assert.match(r.out, /does not resolve/);
  writeFileSync(join(repo, BASELINE_REL), "{not json");
  r = check(repo);
  assert.equal(r.rc, 2, r.out);
  assert.match(r.out, /unreadable/);
  rmSync(join(repo, BASELINE_REL));
  r = check(repo);
  assert.equal(r.rc, 2, r.out);
  assert.match(r.out, /is missing/);
  assert.equal(run(null, ["--check", "--root", join(repo, "nowhere")]).rc, 2);
  const notGit = mkdtempSync(join(tmpdir(), "product-name-nogit-"));
  t.after(() => rmSync(notGit, { recursive: true, force: true }));
  assert.equal(run(null, ["--list", "--root", notGit]).rc, 2);
});

test("a scan that reads no file is an error, not a pass", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "product-name-empty-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-q");
  git(dir, "checkout", "-q", "-b", "base");
  writeFileSync(join(dir, "logo.bin"), Buffer.from([0, 1, 2]));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "x");
  let r = run(dir, ["--check", "--base", "base"]);
  assert.equal(r.rc, 2, r.out);
  assert.match(r.out, /read 0 files/);
  r = run(dir, ["--write-baseline"]);
  assert.equal(r.rc, 2, r.out);
});

test("diff parser reads awkward diffs and agrees with numstat", (t) => {
  const repo = makeRepo(t);
  write(repo, "tricky.txt", "+++ b/not-a-header\n@@ -1 +1 @@ not a hunk\n--- a/x\nlast line, no newline");
  write(repo, "dir with space/f.txt", "one\ntwo\n");
  rmSync(join(repo, "docs/other.md")); // deletion only
  writeFileSync(join(repo, "logo.bin"), Buffer.from([0, 9, 9])); // binary change
  append(repo, "clean.txt", "tail\n");
  git(repo, "add", "-A");
  const { added, nFiles } = addedLines(repo, git(repo, "rev-parse", "base").trim());
  assert.equal(nFiles, 5);
  assert.deepEqual(added["tricky.txt"], [[1, "+++ b/not-a-header"], [2, "@@ -1 +1 @@ not a hunk"], [3, "--- a/x"], [4, "last line, no newline"]]);
  assert.deepEqual(added["dir with space/f.txt"], [[1, "one"], [2, "two"]]);
  assert.deepEqual(added["clean.txt"], [[3, "tail"]]);
  assert.ok(!("docs/other.md" in added) && !("logo.bin" in added));
});

test("the numstat cross-check refuses a diff the parser cannot account for", (t) => {
  // A shim `git` that returns an empty patch for `diff -U0` and the real answer for everything else:
  // the parser then reads nothing while numstat still reports one added line.
  const repo = makeRepo(t);
  append(repo, "clean.txt", `${TWO_WORDS}\n`);
  const bin = mkdtempSync(join(tmpdir(), "product-name-shim-"));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  const realGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  writeFileSync(join(bin, "git"), `#!/bin/sh\nfor a in "$@"; do [ "$a" = "-U0" ] && exit 0; done\nexec "${realGit}" "$@"\n`, { mode: 0o755 });
  const r = run(repo, ["--check", "--base", "base"], { env: { ...ENV, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(r.rc, 2, r.out);
  assert.match(r.out, /cross-check failed: parsed 0 added lines, git --numstat reports 1/);
  assert.ok(new Precondition("x") instanceof Error);
});

// ---- the real repository -----------------------------------------------------------------------
const REAL_ROOT = spawnSync("git", ["-C", dirname(SCRIPT), "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim();

test("run from the wrong directory, it still finds this repository", () => {
  const r = run(null, ["--check", "--base", "HEAD"], { cwd: tmpdir() });
  assert.ok([0, 1].includes(r.rc), r.out); // never 2: it ran, on the right tree
  assert.ok(r.out.includes(`root: ${REAL_ROOT}`), r.out);
});

test("mutation on a copy of the real tree fails and names the line", (t) => {
  // Copy HEAD into its own throwaway repository; nothing is written to this one.
  const dir = mkdtempSync(join(tmpdir(), "product-name-real-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const copy = join(dir, "copy");
  mkdirSync(copy);
  const tar = join(dir, "head.tar");
  assert.equal(spawnSync("git", ["-C", REAL_ROOT, "archive", "--format=tar", "-o", tar, "HEAD"]).status, 0);
  assert.equal(spawnSync("tar", ["-xf", tar, "-C", copy]).status, 0);
  git(copy, "init", "-q");
  git(copy, "add", "-A");
  git(copy, "commit", "-q", "-m", "copy of HEAD");
  let r = run(copy, ["--check", "--base", "HEAD"]);
  assert.ok([0, 1].includes(r.rc), r.out); // the control ran; it reflects this repo's own state
  assert.match(r.out, /0 file\(s\) in the diff/);
  const target = "src/main.tsx";
  const linesBefore = readFileSync(join(copy, target), "utf8").split("\n").length - 1;
  append(copy, target, `// mutation: ${TWO_WORDS}\n`);
  r = run(copy, ["--check", "--base", "HEAD"]);
  assert.equal(r.rc, 1, r.out);
  assert.ok(r.out.includes(`${target}:${linesBefore + 1}`), r.out);
  assert.match(r.out, /1 wrong product-name form\(s\) in added lines/);
  assert.ok(r.out.includes(`${target}: 1 now, baseline 0`), r.out);
});
