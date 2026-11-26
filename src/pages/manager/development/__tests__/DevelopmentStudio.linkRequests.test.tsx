/** @jest-environment jsdom */
/**
 * MMLR-6 + U7 on the Team Development page. A waiting join request shows as a
 * one-line notice above the lenses; "Review" opens the "Add people" dialog on
 * its Requests tab, where the request is answered. The practitioner mounts
 * make no request at all, a 404 hides both the notice and the tab, and a fault
 * never blanks the roster.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"
import type { IncomingLinkRequest } from "@/services/manager/development/growthService"
import { AuthContext } from "@/context/auth-context"

// RM-6 B: the practitioner client-roster status reads OFF here, so the
// practitioner Studio is today's (the switch-on Studio is DevelopmentStudio.rm6).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}))
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
  const view = render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <DevelopmentStudio audience={audience} />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
  return { ...view, qc }
}

function openAddPeople() {
  fireEvent.click(screen.getByRole("button", { name: /Add people/ }))
  return screen.getByRole("dialog")
}

beforeEach(() => {
  jest.clearAllMocks()
  growth.getIncomingLinkRequests.mockResolvedValue(ok([request()]))
})

it("a manager sees a one-line notice with the count, and it stays across the lenses", async () => {
  renderStudio("manager", "manager")
  const notice = await screen.findByTestId("link-requests-notice")
  expect(notice).toHaveTextContent("People waiting to join your team: 1")
  // The requests are answered in the dialog now, not inline on the page.
  expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /My reports/ }))
  expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
  expect(screen.getByTestId("link-requests-notice")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /Org Chart/ }))
  expect(screen.getByTestId("link-requests-notice")).toBeInTheDocument()
})

it("Review opens Add people on the Requests tab, with the count and the request", async () => {
  renderStudio("manager", "manager")
  const notice = await screen.findByTestId("link-requests-notice")
  fireEvent.click(within(notice).getByRole("button", { name: "Review" }))
  const dialog = screen.getByRole("dialog")
  const tab = within(dialog).getByRole("tab", { name: /Requests/ })
  expect(tab).toHaveAttribute("aria-selected", "true")
  expect(within(dialog).getByTestId("add-people-requests-count")).toHaveTextContent("1")
  expect(await within(dialog).findByTestId("link-requests-panel")).toBeInTheDocument()
  expect(within(dialog).getByText("Robin Example")).toBeInTheDocument()
  expect(within(dialog).getByTestId("add-people-org-join-requests-link")).toHaveAttribute("href", "/manager/join-requests")
})

it("the header button opens Add people on the first tab, Requests offered beside it", async () => {
  renderStudio("manager", "manager")
  const notice = await screen.findByTestId("link-requests-notice")
  // Opened once on Requests from the notice and closed, the header button
  // still opens on the first tab.
  fireEvent.click(within(notice).getByRole("button", { name: "Review" }))
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  const dialog = openAddPeople()
  expect(within(dialog).getByRole("tab", { name: "Add a person" })).toHaveAttribute("aria-selected", "true")
  expect(within(dialog).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Add a person", "Import a file", "Requests1"])
})

it("accepting from the tab refreshes the roster and keeps the answer on screen", async () => {
  growth.decideLinkRequest.mockResolvedValue(ok({ id: "r1", status: "approved" }))
  const { qc } = renderStudio("manager", "manager")
  const invalidate = jest.spyOn(qc, "invalidateQueries")
  fireEvent.click(within(await screen.findByTestId("link-requests-notice")).getByRole("button", { name: "Review" }))
  const dialog = screen.getByRole("dialog")
  growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
  fireEvent.click(await within(dialog).findByRole("button", { name: "Accept" }))
  await waitFor(() => expect(growth.decideLinkRequest).toHaveBeenCalledWith("r1", "approve"))
  expect(await within(dialog).findByText("Added to your team.")).toBeInTheDocument()
  expect(invalidate.mock.calls.some(([arg]) => JSON.stringify(arg).includes("roster"))).toBe(true)
  // The tab stays while it is open, even though nothing waits any more.
  expect(within(dialog).getByRole("tab", { name: /Requests/ })).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByTestId("link-requests-notice")).toBeNull())
})

it("a manager with nothing waiting gets no notice and the two tabs only", async () => {
  growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
  renderStudio("manager", "manager")
  await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
  await act(async () => undefined)
  expect(screen.queryByTestId("link-requests-notice")).toBeNull()
  const dialog = openAddPeople()
  expect(within(dialog).getAllByRole("tab")).toHaveLength(2)
})

it("a 404 from the list hides the notice and the tab, and shows no error", async () => {
  growth.getIncomingLinkRequests.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } })
  renderStudio("manager", "manager")
  await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
  await act(async () => undefined)
  expect(screen.queryByTestId("link-requests-notice")).toBeNull()
  const dialog = openAddPeople()
  expect(within(dialog).getAllByRole("tab")).toHaveLength(2)
  expect(within(dialog).queryByRole("alert")).toBeNull()
})

it("the practitioner mount makes no request, whatever the role says, and keeps two tabs", async () => {
  renderStudio("practitioner", "manager")
  await act(async () => undefined)
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
  expect(screen.queryByTestId("link-requests-notice")).toBeNull()
  const dialog = openAddPeople()
  expect(within(dialog).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Add a person", "Import a file"])
  expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
})

it("a fault inside the requests leaves the roster on the page", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => undefined)
  growth.getIncomingLinkRequests.mockResolvedValue(ok([request({ categories: null as unknown as string[] })]))
  renderStudio("manager", "manager")
  await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
  await act(async () => undefined)
  expect(screen.getByRole("heading", { name: "Team Development Studio" })).toBeInTheDocument()
  expect(screen.getByText("Dana Example")).toBeInTheDocument()
  spy.mockRestore()
})

it("a 404 on a refresh takes a shown notice away", async () => {
  const { qc } = renderStudio("manager", "manager")
  await screen.findByTestId("link-requests-notice")
  growth.getIncomingLinkRequests.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } })
  await act(async () => {
    await qc.refetchQueries()
  })
  await waitFor(() => expect(screen.queryByTestId("link-requests-notice")).toBeNull())
})
