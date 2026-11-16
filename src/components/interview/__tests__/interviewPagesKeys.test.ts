/**
 * The interview surfaces read their words through t("key", <English default>)
 * from the `interviewPages` namespace. The jest react-i18next mock resolves the
 * key from public/locales/en/interviewPages.json and ignores the default, so a
 * default that drifted from the JSON would pass every render test and only
 * show in a browser that fails to load the locale file.
 *
 * Source-level on purpose: it pins the two copies of each English string
 * together, and fails on a key the code uses that the file does not hold.
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const en = require("../../../../public/locales/en/interviewPages.json") as Record<string, unknown>

const SRC = join(__dirname, "..", "..", "..")
const ROOTS = [join(SRC, "components", "interview"), join(SRC, "pages", "interview-practice")]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== "__tests__") walk(p, out)
    } else if (/\.tsx?$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

function lookup(key: string): unknown {
  let cur: unknown = en
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in cur) cur = (cur as Record<string, unknown>)[part]
    else return undefined
  }
  return cur
}

// t("key", "English")  and  t("key", { defaultValue: "English", ... })
const CALL = /\bt\("([A-Za-z0-9_.]+)",\s*(?:"((?:[^"\\]|\\.)*)"|\{\s*(?:defaultValue: "((?:[^"\\]|\\.)*)")?)/g

const calls = ROOTS.flatMap((root) =>
  walk(root).flatMap((file) => {
    const text = readFileSync(file, "utf8")
    return [...text.matchAll(CALL)].map((m) => ({
      file: file.slice(SRC.length + 1),
      key: m[1],
      def: m[2] ?? m[3],
    }))
  }),
)

describe("interviewPages namespace", () => {
  it("is used by the interview surfaces (the scan is not vacuous)", () => {
    expect(calls.length).toBeGreaterThan(300)
  })

  it("holds every key the code asks for", () => {
    const missing = calls.filter((c) => typeof lookup(c.key) !== "string").map((c) => `${c.file}: ${c.key}`)
    expect(missing).toEqual([])
  })

  it("has an English default byte-identical to the JSON value", () => {
    const drift = calls
      .filter((c) => c.def !== undefined)
      .filter((c) => JSON.parse(`"${c.def}"`) !== lookup(c.key))
      .map((c) => `${c.file}: ${c.key}`)
    expect(drift).toEqual([])
  })
})
