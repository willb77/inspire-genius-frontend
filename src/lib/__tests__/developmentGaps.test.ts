import { classifyGap } from "@/lib/developmentGaps"
import type { DevelopmentGap } from "@/types/development"

const base: DevelopmentGap = {
  gapId: "g",
  memberId: "m",
  competency: "Delegation",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
}

describe("classifyGap (TDS-8)", () => {
  it("is measured only when the fit engine set engineVersion", () => {
    expect(classifyGap({ ...base, engineVersion: "fit/7" })).toBe("measured")
  })

  it("files a legacy behavioral row with a null engine version as indicative", () => {
    expect(classifyGap({ ...base, engineVersion: null })).toBe("indicative")
    expect(classifyGap({ ...base, source: "coaching", engineVersion: null })).toBe("indicative")
  })

  it("is unclassified when the backend did not send the key at all", () => {
    expect(classifyGap(base)).toBe("unclassified")
  })

  it("keeps a skill gap a skill gap whatever else it carries", () => {
    expect(classifyGap({ ...base, source: "skill" })).toBe("skill")
    expect(classifyGap({ ...base, source: "skill", engineVersion: "fit/7" })).toBe("skill")
  })
})
