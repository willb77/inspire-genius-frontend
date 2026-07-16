/**
 * @jest-environment jsdom
 *
 * The public surface of `@/verticals/core`.
 *
 * A vertical imports from the barrel and nowhere deeper, so the barrel IS the
 * contract. This test pins it: dropping or renaming an export here is a
 * breaking change for every vertical, and should fail loudly rather than at the
 * next vertical's build.
 */
import * as Core from "../index"

describe("@/verticals/core public contract", () => {
  test.each([
    // The gate + shell a vertical mounts its routes behind
    "RequireVertical",
    "VerticalShell",
    // Entitlement
    "useVerticalAccess",
    "useEnabledVerticals",
    "getEnabledVerticals",
    "DEV_ACCESS_KEY",
    // Preview override
    "previewKey",
    "getPreviewOverride",
    "setPreviewOverride",
    "clearPreviewOverride",
    "subscribePreview",
    // Registry
    "registerVertical",
    "getVertical",
    "listVerticals",
    "listEntitledVerticals",
  ])("exports %s", (name) => {
    expect(Core[name as keyof typeof Core]).toBeDefined()
  })

  test("the preview key helper is reachable through the barrel", () => {
    // Guards against a barrel that exports a name bound to the wrong module.
    expect(Core.previewKey("grant")).toBe("grant_dev_access")
  })

  test("the registry is reachable through the barrel", () => {
    Core.__resetRegistry()
    Core.registerVertical({
      key: "grant",
      title: "GRANT",
      routePrefix: "/vertical/grant",
      homePath: "/vertical/grant/dashboard",
    })
    expect(Core.getVertical("grant")?.title).toBe("GRANT")
    expect(Core.listEntitledVerticals(["grant"])).toHaveLength(1)
    Core.__resetRegistry()
  })
})
