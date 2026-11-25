/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react"

let mockItems: unknown = []
jest.mock("@/hooks/useFrontendText", () => ({
  useFrontendText: () => ({ data: { data: { items: mockItems } } }),
}))

import { useDevelopmentText } from "../useDevelopmentText"
import { DEV_TEXT, DEV_TEXT_PRACTITIONER } from "@/constants/development"

/**
 * U9 — `useDevelopmentText` takes the audience.
 *
 * Manager (the default, and what every caller passed before U9 by passing
 * nothing) resolves exactly as before. Practitioner reads the practitioner
 * table, and a server override written against the manager's wording does not
 * reach a key whose practitioner wording differs.
 */
beforeEach(() => {
  mockItems = []
})

describe("useDevelopmentText — manager, the default", () => {
  it("returns every DEV_TEXT line unchanged, with and without the argument", () => {
    const bare = renderHook(() => useDevelopmentText()).result.current.t
    const named = renderHook(() => useDevelopmentText("manager")).result.current.t
    for (const [key, value] of Object.entries(DEV_TEXT)) {
      expect(bare(key)).toBe(value)
      expect(named(key)).toBe(value)
    }
  })

  it("still lets a server override win, then the fallback, then the key", () => {
    mockItems = [{ key: "dev.studio.title", value: "Server title" }]
    const { t } = renderHook(() => useDevelopmentText()).result.current
    expect(t("dev.studio.title")).toBe("Server title")
    expect(t("dev.unknown", "fallback")).toBe("fallback")
    expect(t("dev.unknown")).toBe("dev.unknown")
  })
})

describe("useDevelopmentText — practitioner", () => {
  it("reads the client wording for every key the practitioner table changes", () => {
    const { t } = renderHook(() => useDevelopmentText("practitioner")).result.current
    for (const [key, value] of Object.entries(DEV_TEXT_PRACTITIONER)) {
      expect(t(key)).toBe(value)
    }
    expect(t("dev.studio.title")).toBe("Client Development Studio")
  })

  it("reads the manager's line for every key it does not change", () => {
    const { t } = renderHook(() => useDevelopmentText("practitioner")).result.current
    for (const [key, value] of Object.entries(DEV_TEXT)) {
      if (key in DEV_TEXT_PRACTITIONER) continue
      expect(t(key)).toBe(value)
    }
  })

  it("does not let a manager-worded server override put 'team' back", () => {
    mockItems = { "dev.studio.title": "Team Development Studio (server)", "dev.tab.notes": "Server notes" }
    const { t } = renderHook(() => useDevelopmentText("practitioner")).result.current
    expect(t("dev.studio.title")).toBe("Client Development Studio")
    // A key the practitioner table does not change still takes the override.
    expect(t("dev.tab.notes")).toBe("Server notes")
  })
})
