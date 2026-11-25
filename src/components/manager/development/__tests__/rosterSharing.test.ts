/**
 * U6c guards over the pure rules (rosterSharing.ts). The rendered-card guards
 * are in MemberCard.sharing.test.tsx.
 */
import {
  SHARING_CATEGORY_KEYS,
  SHARING_DISPLAYS,
  chipContradictsCard,
  gatedFieldsShown,
  sharingDisplay,
  sharingReadWorked,
  type GatedField,
  type SharingDisplay,
} from "../rosterSharing"
import { NOT_KNOWN_SHAPES, SHARING_CASES, parse } from "@/test/rosterSharingFixtures"
import type { RosterMember } from "@/types/development"

describe("sharingDisplay — the eight states, from the server's response shape", () => {
  it.each(SHARING_CASES.map((c) => [c.display, c] as const))("%s", (display, c) => {
    expect(sharingDisplay(parse(c.json), c.readWorked)).toBe(display)
  })

  it("covers all eight displays, each exactly once", () => {
    expect(new Set(SHARING_CASES.map((c) => c.display))).toEqual(new Set(SHARING_DISPLAYS))
    expect(SHARING_CASES).toHaveLength(8)
  })

  it.each(NOT_KNOWN_SHAPES.map((s) => [s.why, s] as const))(
    "null is never 'nothing shared': %s reads Not known",
    (_why, s) => {
      expect(sharingDisplay(parse(s.json), s.readWorked)).toBe("not_known")
    },
  )
})

describe("sharingReadWorked", () => {
  it("is true only when some row carries a block", () => {
    const withBlock = parse(SHARING_CASES[0].json)
    const without = parse(SHARING_CASES[7].json)
    expect(sharingReadWorked([without, withBlock])).toBe(true)
    expect(sharingReadWorked([without, without])).toBe(false)
    expect(sharingReadWorked(undefined)).toBe(false)
  })
})

describe("chipContradictsCard — task 4", () => {
  const ABSENCE: SharingDisplay[] = ["not_asked", "awaiting", "declined", "withdrawn", "term_ended"]
  const FIELDS: GatedField[] = ["prismTick", "cliftonTick", "discTick", "headline", "topMatch"]

  it.each(ABSENCE.flatMap((d) => FIELDS.map((f) => [d, f] as const)))(
    "%s beside %s contradicts",
    (display, field) => {
      expect(chipContradictsCard(display, [], [field])).toBe(true)
    },
  )

  it.each(ABSENCE)("%s with no gated field does not contradict", (display) => {
    expect(chipContradictsCard(display, [], [])).toBe(false)
  })

  it("Shared contradicts a field whose category it does not include", () => {
    expect(chipContradictsCard("shared", ["goals"], ["prismTick"])).toBe(true)
    expect(chipContradictsCard("shared", ["goals"], ["headline"])).toBe(true)
    expect(chipContradictsCard("shared", ["prism"], ["topMatch"])).toBe(true)
    expect(chipContradictsCard("shared", ["prism"], ["discTick"])).toBe(true)
  })

  it("Shared does not contradict fields its categories cover", () => {
    expect(chipContradictsCard("shared", ["prism"], ["prismTick", "headline"])).toBe(false)
    expect(chipContradictsCard("shared", ["prism", "development"], ["topMatch"])).toBe(false)
    expect(chipContradictsCard("shared", ["assessments"], ["cliftonTick", "discTick"])).toBe(false)
  })

  it.each(["no_account", "not_known"] as const)("%s claims nothing, so never contradicts", (display) => {
    expect(chipContradictsCard(display, [], FIELDS)).toBe(false)
  })
})

describe("gatedFieldsShown", () => {
  it("lists exactly the fields the card renders", () => {
    const m: RosterMember = parse(SHARING_CASES[0].json)
    expect(gatedFieldsShown(m.coverage, m.reconciledHeadline, false)).toEqual([])
    expect(
      gatedFieldsShown({ prism: true, clifton: true, disc: true }, "A headline", true),
    ).toEqual(["prismTick", "cliftonTick", "discTick", "headline", "topMatch"])
  })
})

it("names every category the server can grant, including interviews and development", () => {
  expect([...SHARING_CATEGORY_KEYS].sort()).toEqual(
    ["artefacts", "assessments", "development", "engagement", "goals", "interviews", "prism", "topics"],
  )
})

describe("U6d: cardGatedFields reads `withheld`, never `sharing`", () => {
  // Imported here to keep the U6c blocks above unchanged.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- same module as above, read lazily for this block
  const { cardGatedFields, withheldCategories } = require("../rosterSharing") as typeof import("../rosterSharing")
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fixtures module, as above
  const { u6dRow } = require("@/test/rosterSharingFixtures") as typeof import("@/test/rosterSharingFixtures")
  const NONE = `{"state":"none","grantedCategories":[],"canRequest":true}`
  const BOTH = `{"state":"granted","grantedCategories":["prism","development"],"canRequest":false}`

  it("absent or null `withheld` is the fallback (ticks count)", () => {
    const m = parse(u6dRow([], NONE))
    expect(withheldCategories({ ...m, withheld: undefined })).toBeNull()
    expect(withheldCategories({ ...m, withheld: null })).toBeNull()
    expect(cardGatedFields({ ...m, withheld: null }, true)).toEqual(["prismTick", "headline", "topMatch"])
  })

  it.each([
    [["prism", "development"], []],
    [["prism"], ["plan"]],
    [["development"], ["headline"]],
    [[], ["headline", "plan", "topMatch"]],
  ] as const)("withheld %j: the card still carries %j; the kept tick never counts", (w, still) => {
    const m = parse(u6dRow([...w], NONE))
    expect(cardGatedFields(m, Boolean(m.topMatch))).toEqual(still)
  })

  it("the same `withheld` gives the same fields whatever `sharing` says", () => {
    for (const w of [["prism"], ["development"], []]) {
      const a = parse(u6dRow(w, NONE))
      const b = parse(u6dRow(w, BOTH))
      expect(cardGatedFields(a, Boolean(a.topMatch))).toEqual(cardGatedFields(b, Boolean(b.topMatch)))
    }
  })

  it("a fully withheld card with a not-shared chip does not contradict; plan needs development", () => {
    const m = parse(u6dRow(["prism", "development"], NONE))
    expect(chipContradictsCard("not_asked", [], cardGatedFields(m, false))).toBe(false)
    expect(chipContradictsCard("shared", ["prism"], ["plan"])).toBe(true)
    expect(chipContradictsCard("shared", ["development"], ["plan"])).toBe(false)
  })
})
