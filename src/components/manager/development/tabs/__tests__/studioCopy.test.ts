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
import { TEAM_STUDIO_COMPARE_COPY, TEAM_STUDIO_SCENARIO_COPY } from "../studioCopy"
import { CHARACTER_LAB_COMPARE_COPY } from "@/components/super-admin/character-lab/copy"

/** Every string reachable in a copy object, including inside arrays/objects. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === "object") return Object.values(value).flatMap(strings)
  return []
}

const FICTIONAL = /\b(character|characters|fictional|synthetic)\b/i

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
