/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import PractitionerClients from "../Clients"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockUseCoachClients = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClients: () => mockUseCoachClients(),
  useAddCoachClient: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkImportCoachClients: () => ({ mutate: jest.fn(), isPending: false }),
}))

const ROSTER = [
  { id: "cl-1", name: "Marcus Chen", email: "marcus@techcorp.com", org: "TechCorp Inc", sessions: 12, prismScore: 82, prismStatus: "ready", topGoals: ["Delegation"], resourcesPresent: 7, status: "active" },
  { id: "cl-2", name: "Sophie Laurent", email: "sophie@ce.com", org: "CreativeEdge", sessions: 20, prismScore: 91, prismStatus: "ready", topGoals: ["Exec"], resourcesPresent: 10, status: "active" },
]

const q = (data: unknown, over: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...over,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <PractitionerClients />
    </MemoryRouter>,
  )
}

describe("PractitionerClients", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCoachClients.mockReturnValue(q(ROSTER))
  })

  it("renders inside the layout with the My Clients title", () => {
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText("My Clients")).toBeInTheDocument()
  })

  it("renders the Add Client and Bulk Import actions", () => {
    renderPage()
    expect(screen.getAllByText("Add Client").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bulk Import").length).toBeGreaterThan(0)
  })

  it("lists clients from the coachClient hook", () => {
    renderPage()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
    expect(screen.getByText("Sophie Laurent")).toBeInTheDocument()
  })

  it("renders a loading state without crashing", () => {
    mockUseCoachClients.mockReturnValue(q(undefined, { isLoading: true }))
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("does not list clients on error", () => {
    mockUseCoachClients.mockReturnValue(q(undefined, { error: new Error("fail") }))
    renderPage()
    expect(screen.queryByText("Marcus Chen")).not.toBeInTheDocument()
  })
})
