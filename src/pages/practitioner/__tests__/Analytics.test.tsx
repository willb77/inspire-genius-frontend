/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import PractitionerAnalytics from "../Analytics"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))

const mockCredits = jest.fn()
const mockUsage = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachCredits: () => mockCredits(),
  useClientUsage: () => mockUsage(),
}))

const q = (data: unknown, over: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...over,
})

describe("PractitionerAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCredits.mockReturnValue(q({ balance: 340, allocated: 500, used: 160, currency: "PUK" }))
    mockUsage.mockReturnValue(
      q([{ clientName: "Marcus Chen", sessions: 12, creditsUsed: 24, lastActive: "2026-07-15" }]),
    )
  })

  it("renders inside the practitioner layout", () => {
    render(<PractitionerAnalytics />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("renders the PUK Credits and Client use sections", () => {
    render(<PractitionerAnalytics />)
    expect(screen.getByText("PUK Credits")).toBeInTheDocument()
    expect(screen.getByText("Client use")).toBeInTheDocument()
  })

  it("shows the read-only distributor note and a client-usage row", () => {
    render(<PractitionerAnalytics />)
    expect(screen.getByText(/managed by your distributor/i)).toBeInTheDocument()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
  })

  it("renders a loading state without crashing", () => {
    mockCredits.mockReturnValue(q(undefined, { isLoading: true }))
    mockUsage.mockReturnValue(q(undefined, { isLoading: true }))
    render(<PractitionerAnalytics />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })
})
