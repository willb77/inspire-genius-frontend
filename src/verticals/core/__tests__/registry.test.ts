import {
  __resetRegistry,
  getVertical,
  listEntitledVerticals,
  listVerticals,
  registerVertical,
  type VerticalDefinition,
} from "../registry"

const ACME = {
  key: "grant", // the only key in the VerticalKey union today
  title: "ACME",
  routePrefix: "/vertical/grant",
  homePath: "/vertical/grant/dashboard",
} satisfies VerticalDefinition

describe("vertical registry", () => {
  beforeEach(() => __resetRegistry())

  test("registers and reads back a vertical", () => {
    registerVertical(ACME)
    expect(getVertical("grant")?.title).toBe("ACME")
    expect(listVerticals()).toHaveLength(1)
  })

  test("rejects duplicate keys", () => {
    registerVertical(ACME)
    expect(() => registerVertical(ACME)).toThrow(/already registered/)
  })

  test("rejects a routePrefix that breaks the /vertical/{key} convention", () => {
    expect(() =>
      registerVertical({ ...ACME, routePrefix: "/grant" })
    ).toThrow(/must be '\/vertical\/grant'/)
  })

  test("listEntitledVerticals filters by the user's entitlement list", () => {
    registerVertical(ACME)
    expect(listEntitledVerticals(["grant"])).toHaveLength(1)
    expect(listEntitledVerticals([])).toHaveLength(0)
    expect(listEntitledVerticals(["other"])).toHaveLength(0)
  })
})

describe("GRANT manifest", () => {
  test("registers itself on import", async () => {
    __resetRegistry()
    jest.resetModules()
    const { GRANT } = await import("../../grant/manifest")
    expect(GRANT.key).toBe("grant")
    expect(GRANT.routePrefix).toBe("/vertical/grant")
  })

  test("the src/verticals barrel registers every vertical as a side effect", async () => {
    // main.tsx imports "./verticals" purely for this side effect. If the barrel
    // stops re-exporting a manifest, the vertical silently vanishes from every
    // launcher and admin list — with nothing else failing.
    __resetRegistry()
    jest.resetModules()
    const verticals = await import("../../index")
    expect(verticals.GRANT.key).toBe("grant")

    const { listVerticals: list } = await import("../registry")
    expect(list().map((v) => v.key)).toContain("grant")
  })
})
