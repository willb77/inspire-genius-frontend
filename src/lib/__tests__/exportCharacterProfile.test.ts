import { profileFileStem, QUADRANT_MEANING } from "@/lib/exportCharacterProfile"

describe("exportCharacterProfile", () => {
  it("builds a safe filename stem from a character name", () => {
    expect(profileFileStem("Sonny Corleone")).toBe("PRISM_Character_Sonny_Corleone")
    expect(profileFileStem("Ripley (Alien)")).toBe("PRISM_Character_Ripley_Alien")
  })

  it("falls back rather than producing a dangling stem", () => {
    expect(profileFileStem("!!!")).toBe("PRISM_Character_profile")
    expect(profileFileStem("")).toBe("PRISM_Character_profile")
  })

  it("maps each colour to its canonical dimension pair", () => {
    // The rotation that shipped once had Blue = Finishing+Evaluating. Pinned here
    // because this text is what a reader uses to interpret the number.
    expect(QUADRANT_MEANING.Green).toMatch(/Innovating \+ Initiating/)
    expect(QUADRANT_MEANING.Blue).toMatch(/Supporting \+ Coordinating/)
    expect(QUADRANT_MEANING.Red).toMatch(/Focusing \+ Delivering/)
    expect(QUADRANT_MEANING.Gold).toMatch(/Finishing \+ Evaluating/)
  })

  it("describes all four colours and invents no fifth", () => {
    expect(Object.keys(QUADRANT_MEANING).sort()).toEqual(["Blue", "Gold", "Green", "Red"])
    // "Orange" is a legacy DB column name, never a PRISM colour.
    expect(Object.keys(QUADRANT_MEANING)).not.toContain("Orange")
  })
})
