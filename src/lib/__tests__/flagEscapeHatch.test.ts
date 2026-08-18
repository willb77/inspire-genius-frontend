/**
 * The escape hatch exists because a stale localStorage flag pins a user to the
 * old app with no in-app way back. These tests pin the two things that matter:
 * a reset link actually clears the override, and a URL with no flag params
 * touches nothing.
 */
import { applyFlagOverridesFromUrl } from "@/lib/flagEscapeHatch"
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags"

const AGENT_ENGINE_KEY = "agent_engine_enabled"
const SURFACES_KEY = "new_user_surfaces"

describe("applyFlagOverridesFromUrl", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(console, "info").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── The trap this was written for ──────────────────────────────
  it("frees a user pinned to Classic by a stale flag", () => {
    localStorage.setItem(SURFACES_KEY, "false")
    expect(isNewUserSurfacesEnabled()).toBe(false) // stuck

    applyFlagOverridesFromUrl("?flags=reset")

    expect(localStorage.getItem(SURFACES_KEY)).toBeNull()
    expect(isNewUserSurfacesEnabled()).toBe(true) // free
  })

  it("frees a user whose sidebar shows 'Chat with Coaches'", () => {
    localStorage.setItem(AGENT_ENGINE_KEY, "false")
    applyFlagOverridesFromUrl("?flags=reset")
    expect(localStorage.getItem(AGENT_ENGINE_KEY)).toBeNull()
  })

  it("clears both flags in one link", () => {
    localStorage.setItem(SURFACES_KEY, "false")
    localStorage.setItem(AGENT_ENGINE_KEY, "false")

    const applied = applyFlagOverridesFromUrl("?flags=reset")

    expect(localStorage.getItem(SURFACES_KEY)).toBeNull()
    expect(localStorage.getItem(AGENT_ENGINE_KEY)).toBeNull()
    expect(applied).toEqual(
      expect.arrayContaining(["new_user_surfaces=reset", "agent_engine_enabled=reset"]),
    )
  })

  // ── Per-flag control ───────────────────────────────────────────
  it.each([
    ["?surfaces=classic", "false"],
    ["?surfaces=new", "true"],
    ["?surfaces=off", "false"],
    ["?surfaces=on", "true"],
  ])("%s sets new_user_surfaces=%s", (search, expected) => {
    applyFlagOverridesFromUrl(search)
    expect(localStorage.getItem(SURFACES_KEY)).toBe(expected)
  })

  it.each([
    ["?agent_engine=off", "false"],
    ["?agent_engine=on", "true"],
  ])("%s sets agent_engine_enabled=%s", (search, expected) => {
    applyFlagOverridesFromUrl(search)
    expect(localStorage.getItem(AGENT_ENGINE_KEY)).toBe(expected)
  })

  it("?surfaces=reset clears only that flag", () => {
    localStorage.setItem(SURFACES_KEY, "false")
    localStorage.setItem(AGENT_ENGINE_KEY, "false")

    applyFlagOverridesFromUrl("?surfaces=reset")

    expect(localStorage.getItem(SURFACES_KEY)).toBeNull()
    expect(localStorage.getItem(AGENT_ENGINE_KEY)).toBe("false")
  })

  // ── Must not fire on ordinary navigation ───────────────────────
  it.each(["", "?tab=history", "?utm_source=email&ref=x"])(
    "leaves storage untouched for %p",
    (search) => {
      localStorage.setItem(SURFACES_KEY, "false")
      const applied = applyFlagOverridesFromUrl(search)
      expect(applied).toEqual([])
      expect(localStorage.getItem(SURFACES_KEY)).toBe("false")
    },
  )

  it("ignores an unrecognised value rather than guessing", () => {
    localStorage.setItem(SURFACES_KEY, "false")
    const applied = applyFlagOverridesFromUrl("?surfaces=banana")
    expect(applied).toEqual([])
    expect(localStorage.getItem(SURFACES_KEY)).toBe("false")
  })

  it("survives storage being unavailable", () => {
    const getItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded")
    })
    expect(() => applyFlagOverridesFromUrl("?surfaces=classic")).not.toThrow()
    getItem.mockRestore()
  })

  // ── The URL must not keep re-applying itself ───────────────────
  it("strips flag params so a shared link does not re-apply forever", () => {
    const replaceState = jest.spyOn(window.history, "replaceState")
    applyFlagOverridesFromUrl("?flags=reset&tab=history")

    expect(replaceState).toHaveBeenCalled()
    const nextUrl = replaceState.mock.calls[0][2] as string
    expect(nextUrl).not.toContain("flags=")
    expect(nextUrl).toContain("tab=history") // unrelated params preserved
  })
})
