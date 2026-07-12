/**
 * @jest-environment jsdom
 */
import {
  GRANT_PREVIEW_KEY,
  getGrantPreviewOverride,
  setGrantPreviewOverride,
  clearGrantPreviewOverride,
  subscribeGrantPreview,
} from "../grantPreviewStore"

describe("grantPreviewStore", () => {
  beforeEach(() => window.localStorage.clear())

  test("get returns null when unset (follow entitlement)", () => {
    expect(getGrantPreviewOverride()).toBeNull()
  })

  test("set true / false writes the override and notifies subscribers", () => {
    const cb = jest.fn()
    const unsub = subscribeGrantPreview(cb)

    setGrantPreviewOverride(true)
    expect(window.localStorage.getItem(GRANT_PREVIEW_KEY)).toBe("true")
    expect(getGrantPreviewOverride()).toBe("true")

    setGrantPreviewOverride(false)
    expect(getGrantPreviewOverride()).toBe("false")

    expect(cb).toHaveBeenCalledTimes(2)
    unsub()
  })

  test("clear removes the override and notifies", () => {
    setGrantPreviewOverride(true)
    const cb = jest.fn()
    const unsub = subscribeGrantPreview(cb)
    clearGrantPreviewOverride()
    expect(getGrantPreviewOverride()).toBeNull()
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
  })
})
