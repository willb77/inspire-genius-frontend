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
