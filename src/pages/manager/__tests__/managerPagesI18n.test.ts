/**
 * I18N-5C guard. The `managerPages` namespace is extracted from src/pages/manager and
 * src/components/manager with the English kept as the inline default, so the app reads the same
 * with or without the locale file loaded. That only holds while the file, the code and the
 * registration agree.
 *
 * - every leaf in public/locales/en/managerPages.json is referenced by a source file and the
 *   source carries the same English as its default;
 * - every `t("group.key", { defaultValue })` in those directories has a leaf in the file;
 * - the namespace is registered in src/lib/i18n.ts and awaiting translation (pending file).
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(__dirname, "../../../..")
const srcRoot = path.join(root, "src")

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== "__tests__") walk(p, out)
    } else if (/\.tsx$/.test(e.name)) out.push(p)
  }
  return out
}

const source = [...walk(path.join(srcRoot, "pages/manager")), ...walk(path.join(srcRoot, "components/manager"))]
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n")

const bundle = JSON.parse(
  fs.readFileSync(path.join(root, "public/locales/en/managerPages.json"), "utf8"),
) as Record<string, unknown>

function leaves(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? leaves(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
      : ([[prefix ? `${prefix}.${k}` : k, String(v)]] as Array<[string, string]>),
  )
}

describe("managerPages English bundle matches the page defaults", () => {
  const all = leaves(bundle)
  const keySet = new Set(all.map(([k]) => k))

  it("has entries", () => {
    expect(all.length).toBeGreaterThan(500)
  })

  it.each(all)("%s", (key, value) => {
    expect(source).toContain(`${JSON.stringify(key)}, { defaultValue: ${JSON.stringify(value)}`)
  })

  it("every default-carrying call has a key in the English file", () => {
    const used = [...source.matchAll(/\bt[m]?\("([A-Za-z0-9_.]+)", \{ defaultValue:/g)].map((m) => m[1])
    expect(used.length).toBeGreaterThan(500)
    expect(used.filter((k) => !keySet.has(k))).toEqual([])
  })

  it("the namespace is registered with i18n and awaiting translation", () => {
    const init = fs.readFileSync(path.join(srcRoot, "lib/i18n.ts"), "utf8")
    expect(init).toMatch(/ns:\s*\[[^\]]*'managerPages'/)
    const pending = JSON.parse(
      fs.readFileSync(path.join(root, "scripts/i18n/pending/managerPages.json"), "utf8"),
    ) as { namespace: string }
    expect(pending.namespace).toBe("managerPages")
  })
})
