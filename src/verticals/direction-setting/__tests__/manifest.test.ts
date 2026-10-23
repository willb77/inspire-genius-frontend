import { __resetRegistry } from "@/verticals/core/registry"

describe("Direction Setting manifest", () => {
  test("registers itself on import", async () => {
    __resetRegistry()
    jest.resetModules()
    const { DIRECTION_SETTING } = await import("../manifest")
    expect(DIRECTION_SETTING.key).toBe("direction-setting")
    expect(DIRECTION_SETTING.routePrefix).toBe("/vertical/direction-setting")
    expect(DIRECTION_SETTING.homePath).toBe("/vertical/direction-setting/journey")
    expect(DIRECTION_SETTING.title).toBe("Direction Setting")
  })

  test("the src/verticals barrel registers it as a side effect", async () => {
    // main.tsx imports "./verticals" purely for this side effect. If the
    // barrel stops re-exporting this manifest, the vertical silently
    // vanishes from every launcher and admin list — with nothing else failing.
    __resetRegistry()
    jest.resetModules()
    const verticals = await import("../../index")
    expect(verticals.DIRECTION_SETTING.key).toBe("direction-setting")

    const { listVerticals } = await import("../../core/registry")
    expect(listVerticals().map((v) => v.key)).toContain("direction-setting")
  })

  test("is a workspace vertical (main menu), never hidden", async () => {
    // History: this originally asserted membership of WORKSPACE_VERTICALS; the
    // set was emptied (#321) and the test flipped to assert NON-membership,
    // with Direction Setting in the Tools catalogue. Tools is not shown to the
    // `user` role, so an entitled user had no sidebar door at all. 2026-10-22
    // (DS-nav, request) it is a workspace vertical again: in every entitled
    // account's main menu, out of Tools. Still never withheld like Honor.
    const { WORKSPACE_VERTICALS, HIDDEN_VERTICALS } = await import(
      "@/components/layout/useVerticalLauncher"
    )
    expect(HIDDEN_VERTICALS.has("direction-setting")).toBe(false)
    expect(WORKSPACE_VERTICALS.has("direction-setting")).toBe(true)
  })

  test("the vertical sub-nav has a switch arm for it", async () => {
    // verticalSubNavItems() falls through to `default: return null`, so a
    // missing case means entering the vertical shows no sidebar menu at all —
    // and every page still renders, so nothing looks broken.
    const { verticalSubNavItems } = await import("@/constants/vertical-subnav")
    const nav = verticalSubNavItems("direction-setting", "user")
    expect(nav).not.toBeNull()
    expect(nav?.items.length).toBeGreaterThan(0)
    expect(nav?.items[0].to).toBe("/vertical/direction-setting/journey")
  })
})
