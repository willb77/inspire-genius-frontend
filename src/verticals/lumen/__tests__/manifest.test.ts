import { __resetRegistry } from "@/verticals/core/registry"

describe("Lumen manifest", () => {
  test("registers itself on import", async () => {
    __resetRegistry()
    jest.resetModules()
    const { LUMEN } = await import("../manifest")
    expect(LUMEN.key).toBe("lumen")
    expect(LUMEN.routePrefix).toBe("/vertical/lumen")
    expect(LUMEN.homePath).toBe("/vertical/lumen/dashboard")
    expect(LUMEN.title).toBe("Lumen")
  })

  test("the src/verticals barrel registers it as a side effect", async () => {
    // main.tsx imports "./verticals" purely for this side effect. If the
    // barrel stops re-exporting this manifest, the vertical silently
    // vanishes from every launcher and admin list — with nothing else failing.
    __resetRegistry()
    jest.resetModules()
    const verticals = await import("../../index")
    expect(verticals.LUMEN.key).toBe("lumen")

    const { listVerticals } = await import("../../core/registry")
    expect(listVerticals().map((v) => v.key)).toContain("lumen")
  })
})
