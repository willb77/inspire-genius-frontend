/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

const mockUseVerticalAccess = jest.fn()
jest.mock("../useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

import RequireVertical from "../RequireVertical"

function renderGate(redirectTo?: string) {
  return render(
    <MemoryRouter initialEntries={["/vertical/grant"]}>
      <Routes>
        <Route
          path="/vertical/grant"
          element={
            <RequireVertical vertical="grant" redirectTo={redirectTo}>
              <div>vertical content</div>
            </RequireVertical>
          }
        />
        <Route path="/home" element={<div>home</div>} />
        <Route path="/elsewhere" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("RequireVertical", () => {
  beforeEach(() => jest.clearAllMocks())

  test("renders children for an entitled user", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    renderGate()
    expect(screen.getByText("vertical content")).toBeInTheDocument()
  })

  test("redirects an unentitled user to /home by default", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    renderGate()
    expect(screen.queryByText("vertical content")).not.toBeInTheDocument()
    expect(screen.getByText("home")).toBeInTheDocument()
  })

  test("honours an explicit redirectTo", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    renderGate("/elsewhere")
    expect(screen.getByText("elsewhere")).toBeInTheDocument()
  })

  test("shows a spinner rather than flashing content while entitlement loads", () => {
    // The gate must not render children before the answer arrives, or an
    // unentitled user briefly sees the vertical.
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: true, enabledVerticals: [] })
    renderGate()
    expect(screen.queryByText("vertical content")).not.toBeInTheDocument()
    expect(screen.queryByText("home")).not.toBeInTheDocument()
  })
})
