/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockUseVerticalAccess = jest.fn()
jest.mock("@/hooks/grant/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

const mockSetOverride = jest.fn()
jest.mock("@/hooks/grant/grantPreviewStore", () => ({
  setGrantPreviewOverride: (v: boolean) => mockSetOverride(v),
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

  test("toggling off calls setGrantPreviewOverride(false)", async () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    render(<GrantPreviewToggle />)
    await userEvent.click(screen.getByRole("switch"))
    expect(mockSetOverride).toHaveBeenCalledWith(false)
  })

  test("toggling on calls setGrantPreviewOverride(true)", async () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    render(<GrantPreviewToggle />)
    await userEvent.click(screen.getByRole("switch"))
    expect(mockSetOverride).toHaveBeenCalledWith(true)
  })
})
