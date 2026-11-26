import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LumenLayout from "../LumenLayout"
import { useVerticalAccess } from "@/verticals/core"
import type { RoleMenuFrame } from "@/hooks/nav/useGatedNavItems"

jest.mock("@/verticals/core", () => ({
  useVerticalAccess: jest.fn(),
  // The entitled path delegates to Core's shell; stubbing it keeps this test
  // about Lumen's gate rather than Core's chrome.
  VerticalShell: ({ vertical }: { vertical: string }) => (
    <div data-testid="vertical-shell">{vertical}</div>
  ),
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "user" } }),
}))
// RM-4: the request-access page shows the role's menu frame. The frame's own
// assembly is tested in rm4-menu-frame.test.tsx; here it is a fixed value.
const USER_FRAME: RoleMenuFrame = { own: [], workspace: null, tools: null, footer: null }
const mockFrame = jest.fn((): RoleMenuFrame => USER_FRAME)
jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  ...jest.requireActual("@/hooks/nav/useGatedNavItems"),
  useRoleMenuFrame: () => mockFrame(),
}))
const mockScaffoldProps = jest.fn()
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode }) => {
    mockScaffoldProps(props)
    return <div data-testid="app-shell">{children}</div>
  },
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
  beforeEach(() => mockFrame.mockImplementation(() => USER_FRAME))

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

  test("delegates to Core's shell for an entitled user", () => {
    // Lumen forks the gate, not the chrome — Core owns the shell, the role nav,
    // and the page-view audit.
    mockAccess.mockReturnValue({ hasAccess: true, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(screen.getByTestId("vertical-shell")).toHaveTextContent("lumen")
    expect(
      screen.queryByText("Lumen isn't switched on for your account yet")
    ).not.toBeInTheDocument()
  })

  test("the unentitled state keeps the role nav so the user can leave", () => {
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(screen.getByTestId("app-shell")).toBeInTheDocument()
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

  test("RM-4: the request-access page shows a framed role's whole menu, footer included", () => {
    const footer = [{ to: "/help", icon: () => null, label: "Help & Support" }]
    mockFrame.mockImplementation(() => ({ own: [], workspace: [], tools: null, footer }))
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    const sections = mockScaffoldProps.mock.calls.at(-1)![0].navSections
    expect(sections.map((s: { label: string }) => s.label)).toEqual(["", "My Workspace", ""])
    expect(sections.at(-1).items).toBe(footer)
  })

  test("RM-4: a role outside the frame (user) keeps the flat list, with no sections", () => {
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false } as ReturnType<
      typeof useVerticalAccess
    >)
    renderLayout()
    expect(mockScaffoldProps.mock.calls.at(-1)![0].navSections).toBeUndefined()
  })
})
