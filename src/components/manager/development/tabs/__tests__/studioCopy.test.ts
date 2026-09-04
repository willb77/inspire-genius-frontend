/**
 * No copy shown to a manager about a real colleague may call them fictional.
 *
 * The shared components under `prism/` serve two subjects: Character Lab's
 * authored characters and Team Studio's real people. Every string that differs
 * between them is a prop with a Character-Lab default, so the failure mode is
 * silent — a caller that forgets to pass one inherits wording about a
 * "character" and it renders perfectly well.
 *
 * That is not hypothetical: `castCapHint` was exactly this. `CastPicker`
 * hard-coded "Deselect one to choose a different character.", it was invisible
 * while the Team Studio flag was off, and it would have read wrong the moment
 * anyone opened the tabs on a real subordinate.
 *
 * This walks the whole copy object rather than asserting one string, so a
 * future field added without a Team Studio override fails here instead of in
 * front of a manager.
 */
import fs from "fs"
import path from "path"
import { TEAM_STUDIO_COMPARE_COPY, TEAM_STUDIO_SCENARIO_COPY } from "../studioCopy"
import { CHARACTER_LAB_COMPARE_COPY } from "@/components/super-admin/character-lab/copy"

/** Every string reachable in a copy object, including inside arrays/objects. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === "object") return Object.values(value).flatMap(strings)
  return []
}

// `scene` is here because it is what actually shipped: the scenario panel
// hardcoded "The hospital scene" and "Running the scene…", and the previous
// regex — character/fictional/synthetic — would have passed both. A work
// situation involving named colleagues is not a scene, and they are not
// performing in one.
const FICTIONAL = /\b(character|characters|fictional|synthetic|scene|scenes)\b/i

describe("Team Studio copy", () => {
  it.each([
    ["compare", TEAM_STUDIO_COMPARE_COPY],
    ["scenario", TEAM_STUDIO_SCENARIO_COPY],
  ])("names no fictional subject anywhere in the %s copy", (_label, copy) => {
    const offenders = strings(copy).filter((s) => FICTIONAL.test(s))
    expect(offenders).toEqual([])
  })

  it.each([
    ["compare", TEAM_STUDIO_COMPARE_COPY],
    ["scenario", TEAM_STUDIO_SCENARIO_COPY],
  ])("overrides the at-cap hint rather than inheriting it in the %s copy", (_label, copy) => {
    // `undefined` here means CastPicker falls back to its Character Lab
    // default — which is the bug this file exists to prevent.
    expect(copy.castCapHint).toBeDefined()
    expect(String(copy.castCapHint)).not.toMatch(FICTIONAL)
  })

  it("is not vacuous — the Character Lab copy still reads as fictional", () => {
    // If this ever passes an empty list, the regex or the traversal has broken
    // and the assertions above would be green for the wrong reason.
    const clStrings = strings(CHARACTER_LAB_COMPARE_COPY)
    expect(clStrings.length).toBeGreaterThan(0)
    expect(clStrings.some((s) => FICTIONAL.test(s))).toBe(true)
  })
})


/**
 * The copy-object walk above cannot see a string that never reaches a copy
 * object. That is exactly how "The hospital scene" survived it: the shared
 * `ScenarioPanel` hardcoded the placeholder in its markup, so there was no
 * field to omit and nothing for the traversal to find. It rendered above a
 * named direct report's PRISM scenario on staging-b until 2026-09-04.
 *
 * So this reads the shared panels' SOURCE, the way the agent-engine guards read
 * `team_studio.py`. A behavioural test only covers the branches it happens to
 * render; the leak is in whichever branch nobody opened.
 */
describe("the shared studio panels hold no subject wording of their own", () => {
  /** Source minus comments and imports — a guard tracks what a file RENDERS. */
  function renderable(file: string): string {
    return fs
      .readFileSync(path.join(__dirname, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !/^\s*(\/\/|import |} from )/.test(l))
      .join("\n")
  }

  it.each([
    ["ScenarioPanel", "../../../../prism/studio/ScenarioPanel.tsx"],
    ["ComparePanel", "../../../../prism/studio/ComparePanel.tsx"],
  ])("%s names no fictional subject in its own markup", (_label, file) => {
    const src = renderable(file)
    // Everything the panel says about a subject must arrive through `copy`,
    // because the same component renders authored characters AND real people.
    const offenders = (src.match(/[^\n]*\b(character|fictional|synthetic|scene)\b[^\n]*/gi) ?? [])
      // `character_names` / `COLLABORATIVE` are wire fields and constants, not
      // words anyone reads; `characterLab` in a type position likewise.
      .filter((l) => !/character_names|character-lab|characterLab|ProfileSummary/.test(l))
    expect(offenders).toEqual([])
  })

  it("is not vacuous — the guard still fires on the string that shipped", () => {
    // Mutation-proofing the guard itself. If the filter above ever swallows
    // everything, this fails and says so.
    const shipped = '              placeholder="The hospital scene"'
    expect(/\b(character|fictional|synthetic|scene)\b/i.test(shipped)).toBe(true)
  })
})
