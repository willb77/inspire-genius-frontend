/**
 * I18N-5A guard. The `userPages` namespace is extracted from src/pages/user with the
 * English kept as the inline default, so the app reads the same with or without the
 * locale file loaded. That only holds while the file and the code agree.
 *
 * For every leaf in public/locales/en/userPages.json: the key must still be referenced
 * by a page, and the page must still carry the same English as its default. A reworded
 * default, a renamed key or an orphaned entry fails here.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(__dirname, "../../../..")
const pagesDir = path.resolve(__dirname, "..")
const bundle = JSON.parse(
  fs.readFileSync(path.join(root, "public/locales/en/userPages.json"), "utf8"),
) as Record<string, unknown>

function leaves(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? leaves(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
      : ([[prefix ? `${prefix}.${k}` : k, String(v)]] as Array<[string, string]>),
  )
}

const source = fs
  .readdirSync(pagesDir)
  .filter((f) => /\.tsx$/.test(f))
  .map((f) => fs.readFileSync(path.join(pagesDir, f), "utf8"))
  .join("\n")

describe("userPages English bundle matches the page defaults", () => {
  const all = leaves(bundle)

  it("has entries", () => {
    expect(all.length).toBeGreaterThan(300)
  })

  it.each(all)("%s", (key, value) => {
    const base = key.replace(/_(one|other)$/, "")
    expect(source).toContain(JSON.stringify(base))
    // The default is a double-quoted literal, or single-quoted when it holds double quotes.
    expect([JSON.stringify(value), `'${value}'`].some((lit) => source.includes(lit))).toBe(true)
  })
})
