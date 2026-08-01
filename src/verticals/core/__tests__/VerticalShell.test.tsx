/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import VerticalShell from "../VerticalShell"
import { __resetRegistry, registerVertical } from "../registry"

// Gate is exercised on its own in RequireVertical.test; here we force it open so
// the tests isolate the chrome-selection behaviour (default SidebarScaffold vs
// a themed vertical's custom shell) and the vertical sub-nav preservation.
const mockUseVerticalAccess = jest.fn()
jest.mock("../useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { role: "user" } }) }))
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))

// Mock the shared scaffold: capture the section labels it receives so we can
// assert each vertical keeps its own sub-nav after the move off AppShell.
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: ({
    children,
    navSections,
  }: {
    children: React.ReactNode
    navSections?: Array<{ label: string; items: Array<{ label: string }> }>
  }) => (
    <div
      data-testid="sidebar-scaffold"
      data-section-labels={JSON.stringify((navSections ?? []).map((s) => s.label))}
    >
      {children}
    </div>
  ),
}))

function renderShell(element: React.ReactNode, vertical = "grant") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/vertical/${vertical}/page`]}>
        <Routes>
          <Route path={`/vertical/${vertical}`} element={element}>
            <Route path="page" element={<div>routed page</div>} />
          </Route>
          <Route path="/home" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function sectionLabels(): string[] {
  return JSON.parse(
    screen.getByTestId("sidebar-scaffold").getAttribute("data-section-labels") ?? "[]",
  )
}

describe("VerticalShell chrome selection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    __resetRegistry()
    registerVertical({
      key: "grant",
      title: "GRANT",
      routePrefix: "/vertical/grant",
      homePath: "/vertical/grant/dashboard",
    })
    registerVertical({
      key: "knowledge-continuity",
      title: "Knowledge Continuity",
      routePrefix: "/vertical/knowledge-continuity",
      homePath: "/vertical/knowledge-continuity/blueprint",
    })
  })

  test("default: wraps the routed page in the standard SidebarScaffold", () => {
    renderShell(<VerticalShell vertical="grant" />)
    expect(screen.getByTestId("sidebar-scaffold")).toBeInTheDocument()
    expect(screen.getByText("routed page")).toBeInTheDocument()
  })

  test("GRANT keeps its Financial Aid sub-nav after the AppShell removal", () => {
    renderShell(<VerticalShell vertical="grant" />)
    expect(sectionLabels()).toContain("Financial Aid")
  })

  test("KCE keeps its Knowledge Continuity sub-nav", () => {
    renderShell(<VerticalShell vertical="knowledge-continuity" />, "knowledge-continuity")
    expect(sectionLabels()).toContain("Knowledge Continuity")
  })

  test("the whole app menu stays present, in order, with the vertical between", () => {
    // Entering a vertical used to REPLACE the menu; now My Workspace and the
    // Tools catalogue stay reachable (rolled up) around the open sub-nav.
    // "Verticals" was renamed to "Tools" on 2026-07-31 — the section id is
    // unchanged, so stored collapse state survived the rename.
    renderShell(<VerticalShell vertical="grant" />)
    expect(sectionLabels()).toEqual([
      "My Workspace",
      "Financial Aid",
      "Tools",
    ])
  })

  test("custom shell REPLACES the scaffold (no shared chrome rendered) — the Honor path", () => {
    const CustomShell = () => <div data-testid="honor-shell">custom chrome</div>
    renderShell(<VerticalShell vertical="honor" shell={<CustomShell />} />, "honor")
    expect(screen.getByTestId("honor-shell")).toBeInTheDocument()
    expect(screen.queryByTestId("sidebar-scaffold")).not.toBeInTheDocument()
  })

  test("gate still applies with a custom shell: unentitled user is redirected", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    const CustomShell = () => <div data-testid="honor-shell">custom chrome</div>
    renderShell(<VerticalShell vertical="honor" shell={<CustomShell />} redirectTo="/home" />, "honor")
    expect(screen.queryByTestId("honor-shell")).not.toBeInTheDocument()
    expect(screen.getByText("home")).toBeInTheDocument()
  })
})
