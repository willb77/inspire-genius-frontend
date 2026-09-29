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
    mockCredits.mockReturnValue(q({ clientsUnderManagement: 3 }))
    mockUsage.mockReturnValue(
      q([{ clientName: "Marcus Chen", sessions: 12, creditsUsed: 24, lastActive: "2026-07-15" }]),
    )
  })

  it("renders inside the practitioner layout", () => {
    render(<PractitionerAnalytics />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("renders clients under management and the Client use section", () => {
    render(<PractitionerAnalytics />)
    expect(screen.getByRole("region", { name: "Clients under management" })).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Client use")).toBeInTheDocument()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
  })

  it("no longer claims a credit balance", () => {
    render(<PractitionerAnalytics />)
    expect(screen.queryByText(/PUK/)).not.toBeInTheDocument()
    expect(screen.queryByText(/balance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/managed by your distributor/i)).not.toBeInTheDocument()
  })

  it("renders zero as a real zero, not as unavailable", () => {
    mockCredits.mockReturnValue(q({ clientsUnderManagement: 0 }))
    render(<PractitionerAnalytics />)
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText(/activated their account and are linked to you/i)).toBeInTheDocument()
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument()
  })

  it("renders a missing count as unavailable, never as zero", () => {
    mockCredits.mockReturnValue(q({ clientsUnderManagement: null }))
    render(<PractitionerAnalytics />)
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getByText(/not available/i)).toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("renders the error with a retry", () => {
    mockCredits.mockReturnValue(q(undefined, { error: new Error("boom") }))
    render(<PractitionerAnalytics />)
    expect(screen.getByText(/Failed to load clients under management/)).toBeInTheDocument()
  })

  it("renders a loading state without crashing", () => {
    mockCredits.mockReturnValue(q(undefined, { isLoading: true }))
    mockUsage.mockReturnValue(q(undefined, { isLoading: true }))
    render(<PractitionerAnalytics />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })
})
