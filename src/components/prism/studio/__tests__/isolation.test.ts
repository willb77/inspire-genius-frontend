import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * The shared studio panels must not be able to reach a backend on their own.
 *
 * The point of inverting the dependency was that a manager surface reading a
 * REAL direct report cannot be talked into calling the super-admin Character
 * Lab endpoints. A panel that keeps its own hook, service or axios instance
 * defeats that no matter what props the caller passes — and the mistake would
 * be one import line, invisible in a green test run.
 *
 * Static, not behavioural: a behavioural test only catches the import on a
 * path that happens to be exercised, and a panel added later would be missed
 * entirely. This reads every file in the directory.
 */
const DIR = join(__dirname, "..")

const FORBIDDEN = [
  { pattern: /@\/hooks\//, why: "a hook binds the panel to one backend" },
  { pattern: /@\/services\//, why: "a service binds the panel to one backend" },
  { pattern: /@\/lib\/agentApi/, why: "an axios instance is a backend" },
  { pattern: /@\/lib\/axios/, why: "an axios instance is a backend" },
  { pattern: /character-lab['"]/, why: "the super-admin surface must stay out of here" },
]

function sources(): string[] {
  return readdirSync(DIR).filter((f) => /\.tsx?$/.test(f))
}

it("has files to check — an empty sweep would pass vacuously", () => {
  expect(sources().length).toBeGreaterThanOrEqual(5)
})

it.each(sources())("%s imports no hook, service or axios instance", (file) => {
  const src = readFileSync(join(DIR, file), "utf8")
  const imports = src
    .split("\n")
    .filter((l) => /^\s*import\b/.test(l) || /\bfrom\s+["']/.test(l))
    .join("\n")

  for (const { pattern, why } of FORBIDDEN) {
    // `@/types/character-lab` is types only and erases at compile time, so it
    // cannot reach anything — the rule targets the runtime modules.
    const offending = imports
      .split("\n")
      .filter((l) => pattern.test(l) && !l.includes("@/types/character-lab"))
    expect(offending.join(" | ") || `no match (${why})`).not.toMatch(pattern)
  }
})
