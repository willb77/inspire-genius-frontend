import { __resetRegistry } from "@/verticals/core/registry"

describe("Career & Education Discovery manifest", () => {
  test("registers itself with the permanent key, prefix and home", async () => {
    __resetRegistry()
    jest.resetModules()
    const { CAREER_DISCOVERY } = await import("../manifest")
    expect(CAREER_DISCOVERY.key).toBe("career-discovery")
    expect(CAREER_DISCOVERY.routePrefix).toBe("/vertical/career-discovery")
    expect(CAREER_DISCOVERY.homePath).toBe("/vertical/career-discovery/journey")
  })

  test("the barrel registers it as a side effect", async () => {
    __resetRegistry()
    jest.resetModules()
    const verticals = await import("../../index")
    expect(verticals.CAREER_DISCOVERY.key).toBe("career-discovery")
    const { listVerticals } = await import("../../core/registry")
    expect(listVerticals().map((v) => v.key)).toContain("career-discovery")
  })

  test("the sub-nav lists the ten stages in journey order", async () => {
    const { verticalSubNavItems } = await import("@/constants/vertical-subnav")
    const nav = verticalSubNavItems("career-discovery", "user")
    expect(nav?.items.map((i) => i.label)).toEqual([
      "My journey", "About me", "Who I am", "Career areas", "What it pays", "My goals",
      "Goals vs wiring", "Education paths", "Cost and payback", "My plan",
    ])
  })
})
