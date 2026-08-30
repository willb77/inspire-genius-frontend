/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock the specific Core modules, not the `@/verticals/core` barrel — mocking
// the barrel would replace every export it re-exports, not just these two.
const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

const mockSetOverride = jest.fn()
jest.mock("@/verticals/core/previewStore", () => ({
  setPreviewOverride: (vertical: string, on: boolean) => mockSetOverride(vertical, on),
}))

import GrantPreviewToggle from "../GrantPreviewToggle"

describe("GrantPreviewToggle", () => {
  beforeEach(() => jest.clearAllMocks())

  test("reflects current access as the switch state", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    render(<GrantPreviewToggle />)
    expect(screen.getByRole("switch")).toBeChecked()
    expect(screen.getByText("Financial Aid preview")).toBeInTheDocument()
  })

  test("toggling off calls setPreviewOverride(false)", async () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    render(<GrantPreviewToggle />)
    await userEvent.click(screen.getByRole("switch"))
    expect(mockSetOverride).toHaveBeenCalledWith("grant", false)
  })

  test("toggling on calls setPreviewOverride(true)", async () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    render(<GrantPreviewToggle />)
    await userEvent.click(screen.getByRole("switch"))
    expect(mockSetOverride).toHaveBeenCalledWith("grant", true)
  })
})
