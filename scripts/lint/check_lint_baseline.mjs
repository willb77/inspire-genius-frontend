// D-22: ESLint ratchet. Shrink-only baseline of per-file ERROR counts.
//
// No workflow ran ESLint until this gate, so errors accumulated (702 in 148 files at seeding).
// Fixing them all at once is out of proportion, so this gate only stops the count going UP:
//   - a file whose error count rises above its baseline entry fails;
//   - a file with errors that is not in the baseline (new or renamed) fails;
//   - ESLint crashing (exit code other than 0/1, or unparsable output) fails, because a crash
//     that read as "zero errors" would make the gate one that cannot fail;
//   - a baselined file that still exists on disk but was not linted fails, because that is what
//     an ignore pattern or a config that matches nothing looks like.
// Counts that fall pass, with a notice to shrink the baseline.
// Warnings (react-hooks/exhaustive-deps among them) are deliberately NOT gated here.
//
// Usage:
//   node scripts/lint/check_lint_baseline.mjs                    check (CI)
//   node scripts/lint/check_lint_baseline.mjs --shrink-baseline  lower counts / drop fixed files; never raises or adds
//   node scripts/lint/check_lint_baseline.mjs --write-baseline   overwrite with current counts (initial seeding only)
//
// Do not add or raise entries to make a PR pass: fix the error. A RENAMED file is the one case to
// move its row by hand (same count, new path) in the same PR.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const BASELINE = join(HERE, 'lint_baseline.json')
const NOTE =
  'D-22 ESLint ratchet: per-file ERROR counts tolerated. Counts may only go down (--shrink-baseline). Do not add or raise entries to make a PR pass.'

/** Turn ESLint JSON results into { repoRelativePath: errorCount } for files with errors, plus the set of linted paths. */
export function countErrors(results, root) {
  const counts = {}
  const linted = new Set()
  for (const r of results) {
    const rel = relative(root, r.filePath).split(sep).join('/')
    linted.add(rel)
    if (r.errorCount > 0) counts[rel] = r.errorCount
  }
  return { counts, linted }
}

/**
 * Compare current counts with the baseline.
 * @returns {{failures: string[], shrinkable: string[]}}
 */
export function compare(baseline, current, linted, fileExists) {
  const failures = []
  const shrinkable = []
  for (const [file, n] of Object.entries(current)) {
    const allowed = baseline[file]
    if (allowed === undefined) {
      failures.push(`${file}: ${n} error(s) in a file not in the baseline (new or renamed file; fix them)`)
    } else if (n > allowed) {
      failures.push(`${file}: ${n} error(s), baseline allows ${allowed} (+${n - allowed})`)
    } else if (n < allowed) {
      shrinkable.push(`${file}: ${allowed} -> ${n}`)
    }
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if (file in current) continue
    if (!linted.has(file) && fileExists(file)) {
      failures.push(`${file}: in the baseline and on disk but ESLint did not lint it (ignore pattern or config change?)`)
    } else {
      shrinkable.push(`${file}: ${allowed} -> 0`)
    }
  }
  return { failures, shrinkable }
}

/** Shrink-only merge: lower counts, drop fixed or deleted files, never raise or add. */
export function shrink(baseline, current) {
  const out = {}
  for (const [file, allowed] of Object.entries(baseline)) {
    const n = current[file] ?? 0
    if (n > 0) out[file] = Math.min(allowed, n)
  }
  return out
}

/** Run ESLint over the repo. Throws on a crash or unparsable output. */
export function runEslint(root) {
  const dir = mkdtempSync(join(tmpdir(), 'lint-ratchet-'))
  const out = join(dir, 'eslint.json')
  try {
    const bin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint')
    const res = spawnSync(bin, ['.', '-f', 'json', '-o', out], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] })
    if (res.error) throw new Error(`ESLint did not start: ${res.error.message}`)
    if (res.status !== 0 && res.status !== 1) throw new Error(`ESLint crashed (exit ${res.status}, signal ${res.signal})`)
    const results = JSON.parse(readFileSync(out, 'utf8'))
    if (!Array.isArray(results)) throw new Error('ESLint output is not a result array')
    return results
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function sorted(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

function writeBaseline(files) {
  writeFileSync(BASELINE, JSON.stringify({ _note: NOTE, files: sorted(files) }, null, 1) + '\n')
}

function main() {
  const args = new Set(process.argv.slice(2))
  let results
  try {
    results = runEslint(ROOT)
  } catch (e) {
    console.error(`lint-ratchet: FAIL: ${e.message}`)
    return 1
  }
  const { counts, linted } = countErrors(results, ROOT)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (args.has('--write-baseline')) {
    writeBaseline(counts)
    console.log(`baseline written: ${Object.keys(counts).length} files, ${total} errors`)
    return 0
  }
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).files
  if (args.has('--shrink-baseline')) {
    const next = shrink(baseline, counts)
    writeBaseline(next)
    console.log(`baseline shrunk: ${Object.keys(next).length} files`)
    return 0
  }

  const { failures, shrinkable } = compare(baseline, counts, linted, (f) => existsSync(join(ROOT, f)))
  const allowed = Object.values(baseline).reduce((a, b) => a + b, 0)
  console.log(`lint-ratchet: ${results.length} files linted, ${total} errors (baseline allows ${allowed})`)
  if (shrinkable.length) {
    console.log(`\nbaseline can shrink (${shrinkable.length}); run: node scripts/lint/check_lint_baseline.mjs --shrink-baseline`)
    for (const s of shrinkable) console.log(`  ${s}`)
  }
  if (failures.length) {
    console.error(`\nlint-ratchet: FAIL (${failures.length}). Run \`npx eslint <file>\` to see the errors.`)
    for (const f of failures) console.error(`  ${f}`)
    return 1
  }
  console.log('\nlint-ratchet: OK')
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main()
}
