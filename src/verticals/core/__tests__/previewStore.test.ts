/**
 * @jest-environment jsdom
 */
import {
  previewKey,
  getPreviewOverride,
  setPreviewOverride,
  clearPreviewOverride,
  subscribePreview,
} from "../previewStore"

describe("previewStore", () => {
  beforeEach(() => window.localStorage.clear())

  test("preserves GRANT's established localStorage key", () => {
    // Existing super-admin toggles in the wild already wrote this exact key —
    // changing it would silently drop their override.
    expect(previewKey("grant")).toBe("grant_dev_access")
  })

  test("get returns null when unset (follow entitlement)", () => {
    expect(getPreviewOverride("grant")).toBeNull()
  })

  test("set true / false writes the override and notifies subscribers", () => {
    const cb = jest.fn()
    const unsub = subscribePreview(cb)

    setPreviewOverride("grant", true)
    expect(window.localStorage.getItem(previewKey("grant"))).toBe("true")
    expect(getPreviewOverride("grant")).toBe("true")

    setPreviewOverride("grant", false)
    expect(getPreviewOverride("grant")).toBe("false")

    expect(cb).toHaveBeenCalledTimes(2)
    unsub()
  })

  test("clear removes the override and notifies", () => {
    setPreviewOverride("grant", true)
    const cb = jest.fn()
    const unsub = subscribePreview(cb)
    clearPreviewOverride("grant")
    expect(getPreviewOverride("grant")).toBeNull()
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
  })
})
