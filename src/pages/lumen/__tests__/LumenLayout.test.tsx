import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LumenLayout from "../LumenLayout"
import { useVerticalAccess } from "@/verticals/core"

jest.mock("@/verticals/core", () => ({
  useVerticalAccess: jest.fn(),
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "user" } }),
}))
jest.mock("@/layouts/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))
jest.mock("@/components/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}))

const mockAccess = useVerticalAccess as jest.MockedFunction<typeof useVerticalAccess>

const renderLayout = () =>
  render(
    <MemoryRouter>
      <LumenLayout />
    </MemoryRouter>
  )

describe("LumenLayout", () => {
  afterEach(() => jest.resetAllMocks())

  test("shows the request-access state to an unentitled user, not a redirect", () => {
    // Core's RequireVertical would navigate to /home, which for a B2C visitor
    // reads as the product not existing. §7.3 wants an explanation instead.
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(
      screen.getByText("Lumen isn't switched on for your account yet")
    ).toBeInTheDocument()
  })

  test("the unentitled state is not a paywall", () => {
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(screen.getByText(/nothing to buy here/)).toBeInTheDocument()
    for (const forbidden of [/upgrade/i, /subscribe/i, /\$\d/, /per month/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })

  test("renders the vertical for an entitled user", () => {
    mockAccess.mockReturnValue({ hasAccess: true, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(screen.getByTestId("app-shell")).toBeInTheDocument()
    expect(
      screen.queryByText("Lumen isn't switched on for your account yet")
    ).not.toBeInTheDocument()
  })

  test("waits rather than flashing the request-access state", () => {
    // Rendering "not enabled" before entitlement resolves would tell entitled
    // users they have no access, every single load.
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: true } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(screen.getByTestId("loading")).toBeInTheDocument()
    expect(
      screen.queryByText("Lumen isn't switched on for your account yet")
    ).not.toBeInTheDocument()
  })

  test("gates on the vertical key Lumen actually owns", () => {
    mockAccess.mockReturnValue({ hasAccess: true, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(mockAccess).toHaveBeenCalledWith("lumen")
  })
})
