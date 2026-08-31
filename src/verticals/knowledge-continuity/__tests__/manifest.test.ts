import { __resetRegistry } from "@/verticals/core/registry"

describe("Knowledge Continuity manifest", () => {
  test("registers itself on import", async () => {
    __resetRegistry()
    jest.resetModules()
    const { KNOWLEDGE_CONTINUITY } = await import("../manifest")
    expect(KNOWLEDGE_CONTINUITY.key).toBe("knowledge-continuity")
    expect(KNOWLEDGE_CONTINUITY.routePrefix).toBe("/vertical/knowledge-continuity")
    expect(KNOWLEDGE_CONTINUITY.homePath).toBe("/vertical/knowledge-continuity/dashboard")
    expect(KNOWLEDGE_CONTINUITY.title).toBe("Knowledge Continuity")
  })

  test("the src/verticals barrel registers it as a side effect", async () => {
    // main.tsx imports "./verticals" purely for this side effect. If the
    // barrel stops re-exporting this manifest, the vertical silently
    // vanishes from every launcher and admin list — with nothing else failing.
    __resetRegistry()
    jest.resetModules()
    const verticals = await import("../../index")
    expect(verticals.KNOWLEDGE_CONTINUITY.key).toBe("knowledge-continuity")

    const { listVerticals } = await import("../../core/registry")
    expect(listVerticals().map((v) => v.key)).toContain("knowledge-continuity")
  })
})
