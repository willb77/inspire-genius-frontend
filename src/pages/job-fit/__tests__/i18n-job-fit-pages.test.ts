/**
 * @jest-environment node
 *
 * I18N-5A — the `jobFitPages` namespace and the Job Fit sources must agree.
 *
 * Every page here calls `t("key", "English")` (or `t("key", { defaultValue })`),
 * and the same English lives in `public/locales/en/jobFitPages.json`. The jest
 * mock for react-i18next reads the JSON and ignores the default, so a render test
 * cannot see the two drift apart; this static guard does. It fails when
 *   - a key used in `src/pages/job-fit` is missing from the JSON,
 *   - the English default in the source differs from the JSON value, or
 *   - the JSON holds a key nothing uses (an orphan a translator would still pay for).
 */
import fs from "fs"
import path from "path"

const PAGES = path.resolve(__dirname, "..")
const JSON_FILE = path.resolve(__dirname, "../../../../public/locales/en/jobFitPages.json")

const STRING = String.raw`"((?:[^"\\]|\\.)*)"`
const KEY = String.raw`\bt\(\s*"([A-Za-z0-9_.]+)"\s*,\s*`
const PLAIN = new RegExp(`${KEY}${STRING}\\s*[,)]`, "g")
const OBJECT = new RegExp(`${KEY}\\{\\s*defaultValue:\\s*${STRING}`, "g")
const OBJECT_NEXT_LINE = new RegExp(`${KEY}\\{\\s*defaultValue:\\s*\\n\\s*${STRING}`, "g")
const ANY_KEY = new RegExp(String.raw`\bt\(\s*"([A-Za-z0-9_.]+)"`, "g")

function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out)
    else out[key] = String(v)
  }
  return out
}

function sourceFiles(): string[] {
  return fs
    .readdirSync(PAGES)
    .filter((n) => /\.tsx?$/.test(n))
    .map((n) => path.join(PAGES, n))
}

function usedKeys(): { defaults: Map<string, Set<string>>; all: Set<string> } {
  const defaults = new Map<string, Set<string>>()
  const all = new Set<string>()
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, "utf8")
    for (const re of [PLAIN, OBJECT, OBJECT_NEXT_LINE]) {
      for (const m of src.matchAll(re)) {
        const value = JSON.parse(`"${m[2]}"`) as string
        const set = defaults.get(m[1]) ?? new Set<string>()
        set.add(value)
        defaults.set(m[1], set)
      }
    }
    for (const m of src.matchAll(ANY_KEY)) all.add(m[1])
  }
  return { defaults, all }
}

describe("jobFitPages namespace", () => {
  const json = flatten(JSON.parse(fs.readFileSync(JSON_FILE, "utf8")))
  const { defaults, all } = usedKeys()

  it("finds the extracted keys (guards against the scan going vacuous)", () => {
    expect(all.size).toBeGreaterThan(300)
  })

  it("every key used has an English default in the source", () => {
    expect([...all].filter((k) => !defaults.has(k))).toEqual([])
  })

  it("every key used exists in en/jobFitPages.json", () => {
    expect([...all].filter((k) => !(k in json))).toEqual([])
  })

  it("the source default equals the JSON value, byte for byte", () => {
    const drift: string[] = []
    for (const [key, values] of defaults) {
      if (values.size > 1) drift.push(`${key}: source has ${values.size} different defaults`)
      else if (json[key] !== [...values][0]) drift.push(`${key}: source and JSON differ`)
    }
    expect(drift).toEqual([])
  })

  it("the JSON holds no key that nothing uses", () => {
    expect(Object.keys(json).filter((k) => !all.has(k))).toEqual([])
  })
})
