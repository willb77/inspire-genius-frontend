// Unit tests for the D-22 ESLint ratchet comparison. Run: node --test scripts/lint/node-tests/*_test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compare, countErrors, runEslint, shrink } from '../check_lint_baseline.mjs'

const onDisk = () => true
const linted = (...files) => new Set(files)

test('unchanged counts pass', () => {
  const r = compare({ 'src/a.tsx': 2 }, { 'src/a.tsx': 2 }, linted('src/a.tsx'), onDisk)
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.shrinkable, [])
})

test('a rise in a baselined file fails', () => {
  const r = compare({ 'src/a.tsx': 2 }, { 'src/a.tsx': 3 }, linted('src/a.tsx'), onDisk)
  assert.equal(r.failures.length, 1)
  assert.match(r.failures[0], /src\/a\.tsx: 3 error\(s\), baseline allows 2/)
})

test('errors in a file not in the baseline fail', () => {
  const r = compare({}, { 'src/new.tsx': 1 }, linted('src/new.tsx'), onDisk)
  assert.equal(r.failures.length, 1)
  assert.match(r.failures[0], /not in the baseline/)
})

test('a fall passes and is reported as shrinkable', () => {
  const r = compare({ 'src/a.tsx': 3, 'src/b.tsx': 1 }, { 'src/a.tsx': 1 }, linted('src/a.tsx', 'src/b.tsx'), onDisk)
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.shrinkable.sort(), ['src/a.tsx: 3 -> 1', 'src/b.tsx: 1 -> 0'])
})

test('a deleted baselined file is shrinkable, not a failure', () => {
  const r = compare({ 'src/gone.tsx': 4 }, {}, linted(), () => false)
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.shrinkable, ['src/gone.tsx: 4 -> 0'])
})

test('a baselined file on disk that ESLint skipped fails (ignore pattern or config matching nothing)', () => {
  const r = compare({ 'src/a.tsx': 2 }, {}, linted(), onDisk)
  assert.equal(r.failures.length, 1)
  assert.match(r.failures[0], /did not lint it/)
})

test('shrink lowers and drops, never raises or adds', () => {
  const next = shrink({ 'src/a.tsx': 3, 'src/b.tsx': 2, 'src/c.tsx': 1 }, { 'src/a.tsx': 1, 'src/b.tsx': 5, 'src/new.tsx': 9 })
  assert.deepEqual(next, { 'src/a.tsx': 1, 'src/b.tsx': 2 })
})

test('countErrors makes repo-relative paths and keeps only files with errors', () => {
  const root = join('/repo')
  const { counts, linted: l } = countErrors(
    [
      { filePath: join(root, 'src', 'a.tsx'), errorCount: 2 },
      { filePath: join(root, 'src', 'b.tsx'), errorCount: 0 },
    ],
    root,
  )
  assert.deepEqual(counts, { 'src/a.tsx': 2 })
  assert.deepEqual([...l].sort(), ['src/a.tsx', 'src/b.tsx'])
})

function fakeEslintRoot(script) {
  const root = mkdtempSync(join(tmpdir(), 'lint-ratchet-test-'))
  mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true })
  const bin = join(root, 'node_modules', '.bin', 'eslint')
  writeFileSync(bin, `#!/bin/sh\n${script}\n`)
  chmodSync(bin, 0o755)
  return root
}

test('an ESLint crash (exit 2) throws rather than reading as zero errors', { skip: process.platform === 'win32' }, () => {
  const root = fakeEslintRoot('exit 2')
  try {
    assert.throws(() => runEslint(root), /crashed \(exit 2/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('unparsable ESLint output throws', { skip: process.platform === 'win32' }, () => {
  const root = fakeEslintRoot('echo "not json" > "$5"; exit 1')
  try {
    assert.throws(() => runEslint(root))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
