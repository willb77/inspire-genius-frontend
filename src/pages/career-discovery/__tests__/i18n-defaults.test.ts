/**
 * I18N-5A guard: every inline English default in career-discovery and lumen must
 * equal the value in its en namespace file.
 *
 * Why static: the jest react-i18next mock resolves from the en JSON and ignores
 * `defaultValue`, so a drifted default (the string a user sees if a locale file
 * fails to load) would never fail a render test.
 */
import fs from "fs"
import path from "path"

const STR = `("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`
const plain = new RegExp(`\\bt\\(\\s*"(\\w+)"\\s*,\\s*${STR}\\s*[,)]`, "g")
const withOpts = new RegExp(`\\bt\\(\\s*"(\\w+)"\\s*,\\s*\\{\\s*defaultValue:\\s*${STR}`, "g")
const anyKey = /\bt\(\s*"(\w+)"/g

const ROOT = path.resolve(__dirname, "../../../..")
const AREAS: Array<{ ns: string; dir: string }> = [
  { ns: "careerDiscoveryPages", dir: path.join(ROOT, "src/pages/career-discovery") },
  { ns: "lumenPages", dir: path.join(ROOT, "src/pages/lumen") },
]

function sources(dir: string): string[] {
  const out: string[] = []
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      if (name !== "__tests__") out.push(...sources(p))
    } else if (/\.tsx?$/.test(name)) out.push(p)
  }
  return out
}

function literal(s: string): string {
  return s[0] === '"' ? (JSON.parse(s) as string) : s.slice(1, -1).replace(/\\'/g, "'")
}

describe.each(AREAS)("$ns inline defaults", ({ ns, dir }) => {
  const bundle = JSON.parse(
    fs.readFileSync(path.join(ROOT, "public/locales/en", `${ns}.json`), "utf8")
  ) as Record<string, string>
  const files = sources(dir)

  it("finds the area's sources", () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it("has an en value, identical to the inline default, for every t() key", () => {
    const problems: string[] = []
    const seen = new Set<string>()
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8")
      const defaults = new Map<string, string>()
      for (const re of [plain, withOpts]) {
        re.lastIndex = 0
        for (const m of src.matchAll(re)) defaults.set(m[1], literal(m[2]))
      }
      anyKey.lastIndex = 0
      for (const m of src.matchAll(anyKey)) {
        const key = m[1]
        seen.add(key)
        const inline = defaults.get(key)
        if (inline === undefined) problems.push(`${path.basename(f)}: ${key} has no inline default`)
        else if (bundle[key] !== inline) problems.push(`${path.basename(f)}: ${key} default differs from en value`)
      }
    }
    expect(problems).toEqual([])
    expect(seen.size).toBeGreaterThan(50)
  })

  it("has no en key that nothing uses", () => {
    const used = new Set<string>()
    for (const f of files) {
      for (const m of fs.readFileSync(f, "utf8").matchAll(anyKey)) used.add(m[1])
    }
    expect(Object.keys(bundle).filter((k) => !used.has(k))).toEqual([])
  })
})
