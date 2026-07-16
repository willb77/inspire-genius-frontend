/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import VerticalShell from "../VerticalShell"

// Gate is exercised on its own in RequireVertical.test; here we force it open so
// the tests isolate the chrome-selection behaviour (default AppShell vs custom).
const mockUseVerticalAccess = jest.fn()
jest.mock("../useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { role: "user" } }) }))
jest.mock("@/layouts/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

function renderShell(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/vertical/grant/page"]}>
      <Routes>
        <Route path="/vertical/grant" element={element}>
          <Route path="page" element={<div>routed page</div>} />
        </Route>
        <Route path="/home" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("VerticalShell chrome selection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
  })

  test("default: wraps the routed page in the shared AppShell", () => {
    renderShell(<VerticalShell vertical="grant" />)
    expect(screen.getByTestId("app-shell")).toBeInTheDocument()
    expect(screen.getByText("routed page")).toBeInTheDocument()
  })

  test("custom shell REPLACES AppShell (no shared chrome rendered)", () => {
    // A themed vertical's shell renders its own <Outlet/>; here a stand-in that
    // wraps children in its own chrome marker.
    const CustomShell = () => (
      <div data-testid="honor-shell">
        {/* real shells render <Outlet/>; the stand-in just proves substitution */}
        custom chrome
      </div>
    )
    renderShell(<VerticalShell vertical="grant" shell={<CustomShell />} />)
    expect(screen.getByTestId("honor-shell")).toBeInTheDocument()
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument()
  })

  test("gate still applies with a custom shell: unentitled user is redirected", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    const CustomShell = () => <div data-testid="honor-shell">custom chrome</div>
    renderShell(<VerticalShell vertical="grant" shell={<CustomShell />} redirectTo="/home" />)
    expect(screen.queryByTestId("honor-shell")).not.toBeInTheDocument()
    expect(screen.getByText("home")).toBeInTheDocument()
  })
})
