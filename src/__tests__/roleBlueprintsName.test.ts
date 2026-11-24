/**
 * @jest-environment node
 *
 * One blueprint name: "Role Blueprints" (TS-1).
 *
 * The `job-blueprint` vertical was titled "Career Blueprint" while the role
 * item beside it in the Tools menu was "Job Blueprint": two names for one
 * family of screens. Both are retired from everything a person reads. The
 * vertical is "Role Blueprints"; one blueprint is "a role blueprint"; the James
 * match page is "Role Blueprint Match".
 *
 * Labels and copy only. The vertical KEY stays `job-blueprint` (it is also the
 * entitlement value, the API segment and the route segment), so identifiers,
 * routes, file names and i18n key paths that spell `job-blueprint` /
 * `jobBlueprint` are not names a person reads and are not checked here.
 *
 * Static on purpose: a retired name comes back one string at a time, in a
 * default value or a locale file nobody opens, and no behavioural test fails.
 * Comments are not copy and are not checked: the walk reads string literals,
 * template text and JSX text from the parsed file.
 */
import fs from "fs"
import path from "path"
import ts from "typescript"

const SRC = path.resolve(__dirname, "..")
const LOCALES = path.resolve(SRC, "..", "public", "locales")

/** The retired names, as a person would read them (space or underscore, any case). */
const RETIRED = /\b(?:job|career)[\s_]+blueprints?\b/i
const NAME = "Role Blueprints"

/** Languages that ship these screens translated (decision D1 of the localisation programme). */
const TRANSLATED = ["en", "es", "fr", "pt", "it", "pl", "cs"]

/**
 * Text that legitimately still spells a retired name. Each entry is one exact
 * string in one file, so a new occurrence anywhere else still fails.
 *
 * `lib/house/glossary.ts` maps OLD words to the plain word shown instead; its
 * keys are lookup terms for names people may still type or that older data
 * carries, never painted on screen.
 */
const ALLOWED: Record<string, readonly string[]> = {
  [path.join("lib", "house", "glossary.ts")]: ["job blueprint", "career blueprint"],
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name === "__snapshots__") continue
      sourceFiles(full, acc)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      acc.push(full)
    }
  }
  return acc
}

/** Every piece of text in a source file that is not a comment and not code. */
function textOf(fileName: string, source: string): string[] {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false, kind)
  const out: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      out.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function retiredIn(fileName: string, source: string): string[] {
  return textOf(fileName, source).filter((text) => RETIRED.test(text))
}

type Leaf = { key: string; value: string }

function leaves(node: unknown, prefix: string, acc: Leaf[] = []): Leaf[] {
  if (typeof node === "string") acc.push({ key: prefix, value: node })
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) leaves(v, prefix ? `${prefix}.${k}` : k, acc)
  }
  return acc
}

function localeLeaves(lang: string, ns: string): Leaf[] {
  return leaves(JSON.parse(fs.readFileSync(path.join(LOCALES, lang, `${ns}.json`), "utf8")), "")
}

function valueAt(lang: string, ns: string, key: string): string | undefined {
  return localeLeaves(lang, ns).find((l) => l.key === key)?.value
}

describe("one blueprint name: Role Blueprints", () => {
  const files = sourceFiles(SRC)
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8")

  describe("the checker itself (it must be able to fail)", () => {
    it("walks the source tree and reaches the files that carry the name", () => {
      expect(files.length).toBeGreaterThan(500)
      const rels = files.map((f) => path.relative(SRC, f))
      expect(rels).toContain(path.join("verticals", "job-blueprint", "manifest.ts"))
      expect(rels).toContain(path.join("constants", "navigation.ts"))
      expect(rels).toContain(path.join("components", "interview", "LiveInterviewBody.tsx"))
    })

    it("flags a retired name in a string, a template, JSX text and a default value", () => {
      expect(retiredIn("a.ts", 'export const a = { label: "Job Blueprint" }')).toEqual(["Job Blueprint"])
      expect(retiredIn("a.ts", "export const a = `from Career Blueprint ${x} now`")).toHaveLength(1)
      expect(retiredIn("a.tsx", "export const A = () => <h1>Job Blueprints</h1>")).toEqual(["Job Blueprints"])
      expect(retiredIn("a.tsx", 'export const A = () => <p>{t("k", { defaultValue: "the career blueprint" })}</p>')).toHaveLength(1)
      expect(RETIRED.test("Job_Blueprint")).toBe(true)
    })

    it("does not flag comments, identifiers, routes or the vertical key", () => {
      expect(retiredIn("a.ts", "// Job Blueprint — a comment\n/** Career Blueprint */\nexport const a = 1")).toEqual([])
      expect(retiredIn("a.ts", 'export const JOB_BLUEPRINT = { key: "job-blueprint", to: "/vertical/job-blueprint" }')).toEqual([])
      expect(retiredIn("a.ts", 'import JobBlueprintBody from "@/components/task-agents/JobBlueprintBody"')).toEqual([])
      expect(RETIRED.test("taskAgents.jobBlueprintBody.jobBlueprintMatch")).toBe(false)
      expect(RETIRED.test("Role Blueprints")).toBe(false)
    })

    it("reads the locale files (every language folder, and thousands of strings)", () => {
      const langs = fs.readdirSync(LOCALES).filter((d) => fs.statSync(path.join(LOCALES, d)).isDirectory())
      for (const lang of TRANSLATED) expect(langs).toContain(lang)
      expect(localeLeaves("en", "interviewPages").length).toBeGreaterThan(100)
      expect(localeLeaves("cs", "jobBlueprintPages").length).toBeGreaterThan(100)
    })
  })

  describe("the retired names are gone from what people read", () => {
    it("no source string, template or JSX text says Job Blueprint or Career Blueprint", () => {
      const offenders: string[] = []
      for (const file of files) {
        const rel = path.relative(SRC, file)
        const source = fs.readFileSync(file, "utf8")
        if (!RETIRED.test(source)) continue
        const allowed = ALLOWED[rel] ?? []
        for (const text of retiredIn(file, source)) {
          if (!allowed.includes(text)) offenders.push(`${rel}: ${JSON.stringify(text.trim().slice(0, 90))}`)
        }
      }
      expect(offenders).toEqual([])
    })

    it("every allowed exception still exists (a stale exception is removed, not kept)", () => {
      for (const [rel, texts] of Object.entries(ALLOWED)) {
        const found = retiredIn(rel, read(rel))
        for (const text of texts) expect(found).toContain(text)
      }
    })

    it("no locale file, in any language, carries either name in a key or a value", () => {
      const offenders: string[] = []
      let checked = 0
      for (const lang of fs.readdirSync(LOCALES)) {
        const dir = path.join(LOCALES, lang)
        if (!fs.statSync(dir).isDirectory()) continue
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
          for (const { key, value } of localeLeaves(lang, file.replace(/\.json$/, ""))) {
            checked += 1
            // Only the LAST segment of a key is a label-derived name (nav.items.<Label>).
            const last = key.slice(key.lastIndexOf(".") + 1)
            if (RETIRED.test(value) || RETIRED.test(last)) offenders.push(`${lang}/${file}: ${key}`)
          }
        }
      }
      expect(checked).toBeGreaterThan(20000)
      expect(offenders).toEqual([])
    })
  })

  describe("Role Blueprints is where the old names were", () => {
    it("the vertical's title is Role Blueprints, and its key and routes did not move", () => {
      const manifest = textOf("manifest.ts", read(path.join("verticals", "job-blueprint", "manifest.ts")))
      expect(manifest).toContain(NAME)
      expect(manifest).toContain("job-blueprint")
      expect(manifest).toContain("/vertical/job-blueprint")
      expect(manifest).toContain("/vertical/job-blueprint/dashboard")
    })

    it("the launcher and the Tools section paint the manifest title, not a name of their own", () => {
      // Tools -> Career Studio / Talent Studio lifts the launcher's row for this
      // vertical, and the launcher's label IS the registry title.
      expect(read(path.join("components", "layout", "useVerticalLauncher.ts"))).toMatch(/label:\s*v\.title\b/)
      const tools = textOf("useToolsSection.ts", read(path.join("hooks", "nav", "useToolsSection.ts")))
      expect(tools).toContain("/vertical/job-blueprint")
    })

    it("the role item in Tools is Role Blueprint Match, with a nav entry in every translated language", () => {
      const labels = textOf("navigation.ts", read(path.join("constants", "navigation.ts"))).filter((s) => s === "Role Blueprint Match")
      expect(labels).toHaveLength(2) // manager + practitioner
      for (const lang of TRANSLATED) {
        expect(valueAt(lang, "shellUi", "nav.items.Role_Blueprint_Match")).toMatch(/Role Blueprint/)
      }
    })

    it("the vertical's own page title is Role Blueprints in every translated language", () => {
      for (const lang of TRANSLATED) expect(valueAt(lang, "jobBlueprintPages", "dashboard.title")).toBe(NAME)
      expect(textOf("p.tsx", read(path.join("pages", "job-blueprint", "JobBlueprintDashboardPage.tsx")))).toContain(NAME)
    })

    it("the Live Interview notices name Role Blueprints, in both builds and every translated language", () => {
      const KEYS = [
        "live.scorecard.reviewLink",
        "live.deepLink.loading",
        "live.deepLink.ready",
        "live.deepLink.readyWithId",
        "live.deepLink.error",
      ]
      for (const lang of TRANSLATED) {
        for (const key of KEYS) expect(`${lang} ${key}: ${valueAt(lang, "interviewPages", key)}`).toContain(NAME)
      }
      for (const rel of [
        path.join("components", "interview", "LiveInterviewBody.tsx"),
        path.join("components", "interview", "house", "run", "runParts.tsx"),
      ]) {
        const naming = textOf(rel, read(rel)).filter((s) => s.includes(NAME))
        expect(naming).toHaveLength(KEYS.length)
      }
    })
  })
})
