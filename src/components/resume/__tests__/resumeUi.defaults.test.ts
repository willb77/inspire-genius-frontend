/**
 * The global react-i18next mock in jest.setup.ts reads public/locales/en and ignores
 * `defaultValue`, so a drifted default (the fallback shown while the namespace is loading
 * or a key is missing) would pass every render test. This pins each t() call in the Résumé
 * Writer sources to the English bundle: same key present, same text.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import en from "../../../../public/locales/en/resumeUi.json"

const ROOT = join(__dirname, "..", "..", "..", "..")

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== "__tests__") sources(p, out)
    } else if (p.endsWith(".tsx")) out.push(p)
  }
  return out
}

function literal(src: string, at: number): string {
  const q = src[at]
  let out = ""
  let i = at + 1
  while (src[i] !== q) {
    if (src[i] === "\\") {
      out += src[i + 1]
      i += 2
    } else out += src[i++]
  }
  return out
}

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((cur, part) => (cur as Record<string, unknown> | undefined)?.[part], en)
}

const files = [...sources(join(ROOT, "src/components/resume")), join(ROOT, "src/pages/user/MyResumePage.tsx")]

test("every resumeUi t() default equals its English bundle value", () => {
  const mismatches: string[] = []
  let calls = 0
  for (const f of files) {
    const src = readFileSync(f, "utf8")
    for (const m of src.matchAll(/\bt\(\s*"([A-Za-z0-9_.]+)"\s*,\s*/g)) {
      const at = m.index! + m[0].length
      let def: string | null = null
      if (src[at] === '"' || src[at] === "'") def = literal(src, at)
      else if (src[at] === "{") {
        const d = /defaultValue:\s*/.exec(src.slice(at))
        if (d) def = literal(src, at + d.index + d[0].length)
      }
      if (def === null) continue
      calls++
      if (lookup(m[1]) !== def) mismatches.push(`${m[1]}: bundle=${JSON.stringify(lookup(m[1]))} default=${JSON.stringify(def)}`)
    }
  }
  expect(calls).toBeGreaterThan(300)
  expect(mismatches).toEqual([])
})
