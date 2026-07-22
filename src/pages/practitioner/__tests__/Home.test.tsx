/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import PractitionerHome from "../Home"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }))

const mockClients = jest.fn()
const mockCredits = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClients: () => mockClients(),
  useCoachCredits: () => mockCredits(),
}))

const q = (data: unknown, over: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...over,
})

const ROSTER = [
  { id: "cl-1", name: "Marcus Chen", email: "m@x.com", org: "TechCorp", sessions: 12, prismScore: 82, prismStatus: "ready", topGoals: ["Delegation"], resourcesPresent: 7, status: "active" },
  { id: "cl-2", name: "Ryan Park", email: "r@x.com", org: "BuildRight", sessions: 4, prismScore: null, prismStatus: "none", topGoals: [], resourcesPresent: 1, status: "new" },
]

function renderHome() {
  return render(
    <MemoryRouter>
      <PractitionerHome />
    </MemoryRouter>,
  )
}

describe("PractitionerHome", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { fullName: "Dana Coach", name: "Dana Coach" } })
    mockClients.mockReturnValue(q(ROSTER))
    mockCredits.mockReturnValue(q({ balance: 340, allocated: 500, used: 160, currency: "PUK" }))
  })

  it("renders inside the practitioner layout", () => {
    renderHome()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("greets the practitioner by first name", () => {
    renderHome()
    expect(screen.getByText(/Welcome back, Dana/)).toBeInTheDocument()
  })

  it("renders the quick actions and status tiles", () => {
    renderHome()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Meeting")).toBeInTheDocument()
    expect(screen.getByText("Add a Client")).toBeInTheDocument()
    expect(screen.getByText("Active Clients")).toBeInTheDocument()
    expect(screen.getByText("Credit Balance")).toBeInTheDocument()
  })

  it("renders the 2-column client list", () => {
    renderHome()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
    expect(screen.getByText("Ryan Park")).toBeInTheDocument()
  })

  it("falls back to a friendly greeting when no name is present", () => {
    mockUseAuth.mockReturnValue({ user: {} })
    renderHome()
    expect(screen.getByText(/Welcome back, there/)).toBeInTheDocument()
  })
})
