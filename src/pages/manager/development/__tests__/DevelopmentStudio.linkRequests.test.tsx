/** @jest-environment jsdom */
/**
 * MMLR-6 on the Team Development page: the manager mounts pass their audience
 * through so the panel shows above the lenses, the practitioner mounts make no
 * request at all, and a fault in the panel never blanks the roster.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"
import type { IncomingLinkRequest } from "@/services/manager/development/growthService"
import { AuthContext } from "@/context/auth-context"

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

const roster: RosterMember[] = [
  {
    memberId: "m-1",
    name: "Dana Example",
    title: "Designer",
    department: "Experience",
    coverage: { prism: true, clifton: false, disc: false },
    reconciledHeadline: "Plans before moving.",
    headlineConfidence: "high",
    planStatus: "on_track",
    milestoneProgress: 40,
    topMatch: null,
  } as unknown as RosterMember,
]
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ data: roster, isLoading: false, isError: false, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
    usePersonLookup: () => ({ results: [], isLoading: false, isError: false }),
  }
})
jest.mock("@/hooks/useFrontendText", () => ({ useFrontendText: () => ({ data: undefined }) }))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ hasRole: () => false }) }))
jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel">org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel">my reports</div>,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const growth = { getIncomingLinkRequests: jest.fn(), decideLinkRequest: jest.fn() }
jest.mock("@/services/manager/development/growthService", () => ({
  getIncomingLinkRequests: () => growth.getIncomingLinkRequests(),
  decideLinkRequest: (...a: unknown[]) => growth.decideLinkRequest(...a),
}))

import DevelopmentStudio from "../DevelopmentStudio"

const ok = <T,>(data: T) => ({ data: { success: true, data, message: "OK" } })

function request(over: Partial<IncomingLinkRequest> = {}): IncomingLinkRequest {
  return {
    id: "r1",
    memberId: "m-2",
    memberName: "Robin Example",
    status: "pending",
    categories: [],
    createdAt: "2026-10-01T10:00:00+00:00",
    expiresAt: "2026-10-15T10:00:00+00:00",
    grantOutcome: null,
    ...over,
  }
}

function renderStudio(audience: "manager" | "practitioner", role: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const auth = { hasRole: (r: string) => r === role } as unknown as React.ContextType<typeof AuthContext>
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <DevelopmentStudio audience={audience} />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  growth.getIncomingLinkRequests.mockResolvedValue(ok([request()]))
})

it("a manager sees the panel above the roster, and it stays across the lenses", async () => {
  renderStudio("manager", "manager")
  expect(await screen.findByTestId("link-requests-panel")).toBeInTheDocument()
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /My reports/ }))
  expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
  expect(screen.getByTestId("link-requests-panel")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /Org Chart/ }))
  expect(screen.getByTestId("link-requests-panel")).toBeInTheDocument()
})

it("the practitioner mount makes no request, whatever the role says", async () => {
  renderStudio("practitioner", "manager")
  await act(async () => undefined)
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
  expect(screen.queryByTestId("link-requests-panel")).toBeNull()
})

it("a fault inside the panel leaves the roster on the page", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => undefined)
  growth.getIncomingLinkRequests.mockResolvedValue(ok([request({ categories: null as unknown as string[] })]))
  renderStudio("manager", "manager")
  await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
  await act(async () => undefined)
  expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  expect(screen.getByRole("heading", { name: "Team Development Studio" })).toBeInTheDocument()
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  spy.mockRestore()
})
