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

  test("is a workspace vertical only while workspace_direction_setting is on", async () => {
    // WS-1 (2026-10-23, CSA 2026-10-22-ws-1, option 2). Entitled accounts that
    // are not super-admin, manager or practitioner had no menu path into
    // Direction Setting at all, so it becomes a My Workspace row — but only
    // when the tier's switch is on, because a frontend merge reaches dev and
    // stable together and customers must see it on the owner's word, not on
    // the merge. So the STATIC set must not contain it (that would put it live
    // on merge), and the EFFECTIVE set must contain it exactly when the switch
    // is on. It is never withheld like Honor: off, it stays in Tools.
    const { WORKSPACE_VERTICALS, HIDDEN_VERTICALS, effectiveWorkspaceVerticals } = await import(
      "@/components/layout/useVerticalLauncher"
    )
    expect(HIDDEN_VERTICALS.has("direction-setting")).toBe(false)
    expect(WORKSPACE_VERTICALS.has("direction-setting")).toBe(false)
    expect(effectiveWorkspaceVerticals(false).has("direction-setting")).toBe(false)
    expect(effectiveWorkspaceVerticals(true).has("direction-setting")).toBe(true)
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
