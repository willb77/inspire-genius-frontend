/**
 * @jest-environment node
 *
 * The product name is written "InspiresGenius", one word, in every language.
 *
 * The Team fit sentence shown when a team member has no account kept the old
 * two-word form in seven locale files and in the component's default value
 * after the rest of the copy was corrected. Nothing failed, because a name in
 * a locale file is only text. This test reads the files.
 *
 * Values only. Keys are identifiers (the support popup placeholder key is one, and
 * renaming a key is a different change), so they are never checked.
 *
 * Static on purpose: a wrong form comes back one string at a time, in a file
 * nobody opens, and no behavioural test notices.
 */
import fs from "fs"
import path from "path"

const SRC = path.resolve(__dirname, "..")
const LOCALES = path.resolve(SRC, "..", "public", "locales")

const NAME = "InspiresGenius"

/** The wrong forms: two words (space, no-break space or underscore), or one word without the "s". */
const WRONG = /inspires?[\s\u00a0_]+genius|inspiregenius/i

/** Languages that ship the shell translated (decision D1 of the localisation programme). */
const SHIPPED = ["en", "es", "fr", "pt", "it", "pl", "cs"]

type Leaf = { key: string; value: string }

function leaves(node: unknown, prefix = "", acc: Leaf[] = []): Leaf[] {
  if (typeof node === "string") acc.push({ key: prefix, value: node })
  else if (Array.isArray(node)) node.forEach((item, i) => leaves(item, `${prefix}[${i}]`, acc))
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, acc)
  }
  return acc
}

function readLeaves(file: string): Leaf[] {
  return leaves(JSON.parse(fs.readFileSync(file, "utf8")))
}

/** "key: value" for every value that carries a wrong form of the name. */
function wrongIn(found: Leaf[]): string[] {
  return found.filter((leaf) => WRONG.test(leaf.value)).map((leaf) => `${leaf.key}: ${leaf.value}`)
}

const shellUi = (lng: string): string => path.join(LOCALES, lng, "shellUi.json")

describe("the product name in locale files", () => {
  it("the check itself catches each wrong form, ignores keys and passes the right one", () => {
    // The wrong forms are assembled from parts so this file does not itself carry one.
    const [one, ones, two] = ["Inspire", "Inspires", "Genius"]
    const control: Leaf[] = [
      { key: "a", value: `Welcome to ${one} ${two}` },
      { key: "b", value: `Welcome to ${ones} ${two}` },
      { key: "c", value: `Welcome to ${one}${two}` },
      { key: "d", value: `${one} ${two}`.toUpperCase() },
      { key: "e", value: `${one}\u00a0${two} account` },
      { key: "f", value: `${one}_${two}` },
      { key: `askAbout${one}${two}`, value: `Ask about ${NAME}…` },
      { key: "g", value: `Welcome to ${NAME}` },
    ]
    expect(wrongIn(control).map((line) => line.split(":")[0])).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("Team fit's no-account sentence names the product correctly in English", () => {
    const en = readLeaves(shellUi("en")).find((leaf) => leaf.key === "talentStudio.teamFit.noAccount")
    expect(en?.value).toBe(`{{name}} does not have an ${NAME} account yet, so there are no matches to show.`)
  })

  it("the component's default for that sentence is the English locale value, word for word", () => {
    // The component test renders from the locale file, so it cannot see the default drift.
    const source = fs.readFileSync(path.join(SRC, "components", "talent-studio", "TeamFitMemberMatches.tsx"), "utf8")
    const en = readLeaves(shellUi("en")).find((leaf) => leaf.key === "talentStudio.teamFit.noAccount")
    expect(en?.value).toContain(NAME)
    expect(source).toContain(`defaultValue: ${JSON.stringify(en?.value)}`)
    expect(source.split("\n").filter((line) => WRONG.test(line))).toEqual([])
  })

  it.each(SHIPPED)("%s keeps the name untranslated in Team fit's no-account sentence", (lng) => {
    const leaf = readLeaves(shellUi(lng)).find((l) => l.key === "talentStudio.teamFit.noAccount")
    expect(leaf?.value).toContain(NAME)
    expect(leaf?.value).toContain("{{name}}")
  })

  it.each(SHIPPED)("%s/shellUi.json carries no wrong form of the name", (lng) => {
    const found = readLeaves(shellUi(lng))
    // Populated control: an empty or unread file must not pass as clean.
    expect(found.length).toBeGreaterThan(400)
    expect(wrongIn(found)).toEqual([])
  })

  it("no locale file in any served language carries a wrong form of the name", () => {
    const offenders: string[] = []
    let files = 0
    let values = 0
    const langs = fs.readdirSync(LOCALES).filter((d) => fs.statSync(path.join(LOCALES, d)).isDirectory())
    for (const lng of langs) {
      for (const file of fs.readdirSync(path.join(LOCALES, lng)).filter((f) => f.endsWith(".json"))) {
        const found = readLeaves(path.join(LOCALES, lng, file))
        files += 1
        values += found.length
        offenders.push(...wrongIn(found).map((line) => `${lng}/${file} ${line}`))
      }
    }
    // Populated control: the walk must have covered every language directory, not an empty tree.
    expect(langs).toEqual(expect.arrayContaining([...SHIPPED, "ko"]))
    expect(files).toBeGreaterThan(200)
    expect(values).toBeGreaterThan(20000)
    expect(offenders).toEqual([])
  })
})
