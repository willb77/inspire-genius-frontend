/**
 * @jest-environment node
 *
 * JF-1 — the Careers and Jobs surfaces say "growth area" and "blueprint".
 *
 * A static guard over the source: it parses every file on the JF-1 surfaces
 * (Job Fit pages, the shared fit components, the fit report export, the
 * Career Discovery pages and the vertical sub-nav labels) and walks the text a
 * person can see — string literals, template text and JSX text. Any whole-word
 * "gap(s)" or "benchmark(s)" in that text fails, case-insensitive.
 *
 * What is NOT user-visible, and so is skipped:
 * - imports / exports, object keys, and the className / to / href / id / key /
 *   data-testid attributes;
 * - Tailwind spacing classes (`gap-1.5`, `gap-x-4`) inside any string;
 * - the API method value `"gap"` exactly (the `?method=` read and its query
 *   key, which the server owns — the label beside it changed, the value did not).
 *
 * Identifiers, routes (ROUTES.JOB_FIT.GAPS), API fields and comments are not
 * text and are not walked. Copy the server sends (e.g. `methodologyNote`) is
 * out of this guard's reach by construction.
 */
import fs from "fs"
import path from "path"
import ts from "typescript"

const SRC = path.resolve(__dirname, "../../..")

const SURFACES = [
  "pages/job-fit",
  "components/fit",
  "lib/job-fit/fitReport.ts",
  "pages/career-discovery",
  "constants/vertical-subnav.ts",
]

const SKIP_ATTRS = new Set(["className", "to", "href", "id", "key", "data-testid"])
const API_METHOD_VALUE = "gap"
const TAILWIND_GAP = /\bgap(?:-[xy])?-[\w.[\]/]+/g
const BANNED = /\b(?:gaps?|benchmarks?)\b/gi

function sourceFiles(rel: string): string[] {
  const abs = path.join(SRC, rel)
  if (fs.statSync(abs).isFile()) return [abs]
  const out: string[] = []
  for (const name of fs.readdirSync(abs)) {
    if (name === "__tests__") continue
    const child = path.join(rel, name)
    if (fs.statSync(path.join(SRC, child)).isDirectory()) out.push(...sourceFiles(child))
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path.join(SRC, child))
  }
  return out
}

/** Every (file:line, text) a person could read, from one source text. */
function visibleText(fileName: string, source: string): { at: string; text: string }[] {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)
  const found: { at: string; text: string }[] = []
  const visit = (node: ts.Node) => {
    let text: string | null = null
    if (ts.isJsxText(node)) {
      text = node.text
    } else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const parent = node.parent
      const skipped =
        ts.isImportDeclaration(parent) ||
        ts.isExportDeclaration(parent) ||
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isJsxAttribute(parent) && SKIP_ATTRS.has(parent.name.getText(sf))) ||
        node.text === API_METHOD_VALUE
      if (!skipped) text = node.text
    }
    if (text && text.trim()) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
      found.push({ at: `${path.relative(SRC, fileName)}:${line}`, text: text.replace(TAILWIND_GAP, "") })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

function offenders(fileName: string, source: string): string[] {
  return visibleText(fileName, source)
    .filter(({ text }) => (text.match(BANNED) ?? []).length > 0)
    .map(({ at, text }) => `${at}  ${JSON.stringify(text.trim().slice(0, 100))}`)
}

describe("JF-1 — no user-visible 'gap' or 'benchmark' on the Careers and Jobs surfaces", () => {
  const files = SURFACES.flatMap(sourceFiles)

  it("walks a real, non-trivial set of files (a guard over nothing cannot fail)", () => {
    expect(files.length).toBeGreaterThanOrEqual(40)
    const strings = files.reduce((n, f) => n + visibleText(f, fs.readFileSync(f, "utf8")).length, 0)
    expect(strings).toBeGreaterThanOrEqual(500)
  })

  it.each(SURFACES)("%s says growth area / blueprint, never gap / benchmark", (surface) => {
    const hits = sourceFiles(surface).flatMap((f) => offenders(f, fs.readFileSync(f, "utf8")))
    expect(hits).toEqual([])
  })

  // The guard's own edges, pinned so a loosened skip rule shows up here.
  describe("the guard itself", () => {
    const check = (src: string) => offenders("probe.tsx", src)

    it("fails on JSX text, a string literal, a template and a plural, any case", () => {
      expect(check(`const a = <p>Your Gaps at a Glance</p>`)).toHaveLength(1)
      expect(check(`const b = { label: "Role benchmark" }`)).toHaveLength(1)
      expect(check("const c = `points below the ${r} benchmarks`")).toHaveLength(1)
      expect(check(`const d = <X hint="Larger gaps worth prioritizing" />`)).toHaveLength(1)
    })

    it("skips Tailwind gap classes, the API value, keys and identifiers", () => {
      expect(check(`const a = <div className="flex gap-1.5 gap-x-4" />`)).toEqual([])
      expect(check(`const b = "inline-flex items-center gap-4 rounded"`)).toEqual([])
      expect(check(`const c = useFitMatches("gap")`)).toEqual([])
      expect(check(`const d = { gap: 1 }; const benchmarkScore = d.gap`)).toEqual([])
      expect(check(`// a gap and a benchmark in a comment`)).toEqual([])
    })

    it("still catches the word beside a Tailwind class in the same string", () => {
      expect(check(`const a = "gap-2 mind the gap"`)).toHaveLength(1)
    })
  })
})
