/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import PractitionerSchedule from "../Schedule"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockUseCoachClients = jest.fn()
const mockUseCoachSchedule = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClients: () => mockUseCoachClients(),
  useCoachSchedule: () => mockUseCoachSchedule(),
  useCreateSessionsBulk: () => ({ mutate: jest.fn(), isPending: false }),
}))

const CLIENTS = [
  { id: "cl-1", name: "Marcus Chen", org: "TechCorp Inc" },
  { id: "cl-2", name: "Sophie Laurent", org: "CreativeEdge" },
]
const SCHEDULE = [
  { id: "sch-1", clientName: "Marcus Chen", startsAt: "2026-07-23T15:00:00", durationMin: 60, topic: "Delegation deep-dive" },
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
      <PractitionerSchedule />
    </MemoryRouter>,
  )
}

describe("PractitionerSchedule", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCoachClients.mockReturnValue(q(CLIENTS))
    mockUseCoachSchedule.mockReturnValue(q(SCHEDULE))
  })

  it("renders inside the layout with the Schedule heading", () => {
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /schedule/i })).toBeInTheDocument()
  })

  it("renders the create-sessions form and upcoming-sessions cards", () => {
    renderPage()
    expect(screen.getByText("Create sessions with clients")).toBeInTheDocument()
    expect(screen.getByText("Upcoming sessions")).toBeInTheDocument()
  })

  it("lists cohort clients and upcoming session entries", () => {
    renderPage()
    // Marcus appears in both the cohort list and the upcoming schedule entry.
    expect(screen.getAllByText("Marcus Chen").length).toBeGreaterThan(0)
    expect(screen.getByText("Sophie Laurent")).toBeInTheDocument()
    expect(screen.getByText("Delegation deep-dive")).toBeInTheDocument()
  })

  it("renders loading and empty states without crashing", () => {
    mockUseCoachClients.mockReturnValue(q(undefined, { isLoading: true }))
    mockUseCoachSchedule.mockReturnValue(q([]))
    renderPage()
    expect(screen.getByText("No sessions scheduled yet.")).toBeInTheDocument()
  })
})
