/**
 * Guard for the `prismUi` namespace (I18N-5A).
 *
 * Every `t("key", { defaultValue: "..." })` in src/components/prism must have
 * the same key in public/locales/en/prismUi.json, holding the SAME English as
 * the in-code defaultValue. The jest `react-i18next` mock resolves from that
 * file, so a missing key renders as the key itself in tests — but only for the
 * strings a given test happens to assert. This walks all of them.
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")
const EN = JSON.parse(
  readFileSync(join(__dirname, "../../../../public/locales/en/prismUi.json"), "utf8"),
) as Record<string, unknown>

function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out)
    else out[key] = String(v)
  }
  return out
}

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== "__tests__") sources(p, out)
    } else if (name.endsWith(".tsx")) out.push(p)
  }
  return out
}

function literalAt(src: string, start: number): string {
  const quote = src[start]
  let i = start + 1
  let buf = ""
  while (src[i] !== quote) {
    if (src[i] === "\\") {
      const next = src[i + 1]
      if (next === "u") {
        buf += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16))
        i += 6
        continue
      }
      buf += next
      i += 2
      continue
    }
    buf += src[i]
    i += 1
  }
  return buf
}

const CALL = /\bt\(\s*(['"])([\w.]+)\1\s*,\s*\{\s*defaultValue:\s*(?=['"])/g

describe("prismUi namespace", () => {
  const flat = flatten(EN)
  const found: Record<string, string> = {}
  for (const file of sources(ROOT)) {
    const src = readFileSync(file, "utf8")
    for (const m of src.matchAll(CALL)) {
      found[m[2]] = literalAt(src, (m.index ?? 0) + m[0].length)
    }
  }

  it("finds the extracted strings", () => {
    expect(Object.keys(found).length).toBeGreaterThan(200)
  })

  it("every key used in code exists in en/prismUi.json with identical English", () => {
    const mismatches = Object.entries(found)
      .filter(([k, v]) => flat[k] !== v)
      .map(([k, v]) => `${k}: code=${JSON.stringify(v)} json=${JSON.stringify(flat[k])}`)
    expect(mismatches).toEqual([])
  })

  it("en/prismUi.json has no keys that code does not use", () => {
    const dynamic = new Set([
      "workEnvironment.enhanced",
      "workEnvironment.neutral",
      "workEnvironment.inhibited",
    ])
    const unused = Object.keys(flat).filter((k) => !(k in found) && !dynamic.has(k))
    expect(unused).toEqual([])
  })
})
