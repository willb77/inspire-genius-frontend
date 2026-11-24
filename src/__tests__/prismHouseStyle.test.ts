/**
 * House style: the word PRISM is always all capitals and italic.
 *
 * Italics need an element, so a string cannot carry them. Two ways to get it right:
 *   - JSX text:           `Your <Prism /> report`          (`@/components/shared/Prism`)
 *   - a string/translation `{withPrism(t("key"))}`        (`@/lib/withPrism`)
 * Where only a string will do (an attribute, a placeholder, a tab title) write PRISM in
 * capitals; it cannot be italic there.
 *
 * Static, because the failure is invisible at runtime: an unwrapped PRISM renders fine and
 * just is not italic. This fails on:
 *   1. a locale value that spells the word anything but PRISM;
 *   2. JSX text with the bare word in it;
 *   3. a `{t("key")}` JSX child whose English text has the word and is not wrapped in withPrism().
 * Mutation-checked: undo one `withPrism(` or `<Prism />` and this names the file and line.
 */
import fs from "fs"
import path from "path"
import ts from "typescript"

const ROOT = path.resolve(__dirname, "../..")
const WORD = /\bprism\b/i
/** Elements whose children must stay plain text (a `<title>` or `<option>` cannot hold an `<em>`). */
const PLAIN_TEXT_TAGS = new Set(["option", "title", "textarea", "code", "pre", "script", "style", "SelectValue"])
const SELF = ["components/shared/Prism.tsx", "lib/withPrism.tsx"]

function walkFiles(dir: string, keep: (f: string) => boolean, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") walkFiles(p, keep, out)
    } else if (keep(p)) out.push(p)
  }
  return out
}

function flatten(o: unknown, prefix: string, out: Record<string, string>) {
  if (typeof o === "string") out[prefix] = o
  else if (o && typeof o === "object")
    for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
}

describe("PRISM house style", () => {
  it("is spelled PRISM in every locale value", () => {
    const bad: string[] = []
    const dir = path.join(ROOT, "public/locales")
    for (const lang of fs.readdirSync(dir)) {
      for (const f of fs.readdirSync(path.join(dir, lang)).filter((n) => n.endsWith(".json"))) {
        const flat: Record<string, string> = {}
        flatten(JSON.parse(fs.readFileSync(path.join(dir, lang, f), "utf8")), "", flat)
        for (const [k, v] of Object.entries(flat)) {
          for (const m of v.matchAll(/\b(prism)\b/gi)) if (m[1] !== "PRISM") bad.push(`${lang}/${f} ${k}: "${m[1]}"`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it("is made italic wherever user-visible JSX names it", () => {
    const en: Record<string, Record<string, string>> = {}
    const enDir = path.join(ROOT, "public/locales/en")
    for (const f of fs.readdirSync(enDir).filter((n) => n.endsWith(".json"))) {
      const flat: Record<string, string> = {}
      flatten(JSON.parse(fs.readFileSync(path.join(enDir, f), "utf8")), "", flat)
      en[f.replace(/\.json$/, "")] = flat
    }

    const bad: string[] = []
    const files = walkFiles(path.join(ROOT, "src"), (f) => f.endsWith(".tsx") && !/\.test\./.test(f))
    for (const file of files) {
      const rel = path.relative(path.join(ROOT, "src"), file)
      if (SELF.includes(rel)) continue
      const text = fs.readFileSync(file, "utf8")
      if (!/prism/i.test(text)) continue
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const at = (n: ts.Node) => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`

      const namespaces: string[] = []
      const scan = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "useTranslation") {
          const a = n.arguments[0]
          if (a && ts.isStringLiteralLike(a)) namespaces.push(a.text)
          else if (a && ts.isArrayLiteralExpression(a)) a.elements.forEach((e) => ts.isStringLiteralLike(e) && namespaces.push(e.text))
        }
        ts.forEachChild(n, scan)
      }
      scan(sf)

      const visit = (n: ts.Node) => {
        if (ts.isJsxElement(n) && !PLAIN_TEXT_TAGS.has(n.openingElement.tagName.getText(sf))) {
          for (const c of n.children) {
            if (ts.isJsxText(c) && WORD.test(c.getText(sf))) bad.push(`${at(c)} JSX text names PRISM: use <Prism />`)
            if (ts.isJsxExpression(c) && c.expression) {
              const e = c.expression
              if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "t" && e.arguments[0] && ts.isStringLiteralLike(e.arguments[0])) {
                const key = e.arguments[0].text
                let has = namespaces.some((ns) => en[ns]?.[key] && WORD.test(en[ns][key]))
                for (const a of e.arguments.slice(1)) {
                  if (ts.isStringLiteralLike(a) && WORD.test(a.text)) has = true
                  if (ts.isObjectLiteralExpression(a))
                    for (const p of a.properties)
                      if (ts.isPropertyAssignment(p) && p.name.getText(sf) === "defaultValue" && ts.isStringLiteralLike(p.initializer) && WORD.test(p.initializer.text)) has = true
                }
                if (has) bad.push(`${at(c)} t("${key}") names PRISM: wrap it in withPrism()`)
              }
            }
          }
        }
        ts.forEachChild(n, visit)
      }
      visit(sf)
    }
    expect(bad).toEqual([])
  })
})
