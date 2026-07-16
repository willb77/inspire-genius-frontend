/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"

const mockUseEnabledVerticals = jest.fn()
jest.mock("../useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}))

import { useVerticalAccess, DEV_ACCESS_KEY } from "../useVerticalAccess"

describe("useVerticalAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    mockUseEnabledVerticals.mockReturnValue({ data: [], isLoading: false })
  })

  test("grants access when the vertical is in the server entitlement", () => {
    mockUseEnabledVerticals.mockReturnValue({ data: ["grant"], isLoading: false })
    const { result } = renderHook(() => useVerticalAccess("grant"))
    expect(result.current.hasAccess).toBe(true)
    expect(result.current.enabledVerticals).toEqual(["grant"])
  })

  test("denies access when entitlement is absent and no override", () => {
    const { result } = renderHook(() => useVerticalAccess("grant"))
    expect(result.current.hasAccess).toBe(false)
  })

  test("override 'true' forces access on regardless of entitlement", () => {
    window.localStorage.setItem(DEV_ACCESS_KEY, "true")
    const { result } = renderHook(() => useVerticalAccess("grant"))
    expect(result.current.hasAccess).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  test("override 'false' forces access off even when entitled", () => {
    mockUseEnabledVerticals.mockReturnValue({ data: ["grant"], isLoading: false })
    window.localStorage.setItem(DEV_ACCESS_KEY, "false")
    const { result } = renderHook(() => useVerticalAccess("grant"))
    expect(result.current.hasAccess).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  test("passes through loading state from the entitlement read", () => {
    mockUseEnabledVerticals.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => useVerticalAccess("grant"))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasAccess).toBe(false)
  })
})
