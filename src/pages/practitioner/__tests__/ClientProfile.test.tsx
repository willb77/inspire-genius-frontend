/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import PractitionerClientProfile from "../ClientProfile"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/prism/usePrismImport", () => ({
  usePrismImport: () => ({ mutate: jest.fn(), isPending: false }),
}))

const mockUseCoachClient = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClient: () => mockUseCoachClient(),
  useUploadClientResource: () => ({ mutate: jest.fn(), isPending: false }),
}))

const DETAIL = {
  id: "cl-1",
  name: "Marcus Chen",
  email: "marcus@techcorp.com",
  org: "TechCorp Inc",
  sessions: 12,
  prismScore: 82,
  prismStatus: "ready",
  topGoals: ["Delegation"],
  resourcesPresent: 7,
  status: "active",
  sessionsList: [{ id: "s1", date: "2026-07-15", topic: "Quarterly review", durationMin: 60 }],
  goals: [{ id: "g0", title: "Delegation", objective: "Delegate more." }],
  prismScores: [{ dimension: "Gold", score: 34 }],
  conversations: [{ id: "cv1", date: "2026-07-14", preview: "Discussed delegation approach…" }],
  resources: {
    prism_csv: true,
    disc: true,
    clifton: false,
    mbti: false,
    big_five: false,
    hogan: false,
    resume: true,
    bio: false,
    additional_info: false,
    goals: false,
  },
  followUps: [{ id: "f1", date: "2026-07-22", note: "Send reading list" }],
  topics: ["Delegation"],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/practitioner/clients/cl-1"]}>
      <Routes>
        <Route path="/practitioner/clients/:clientId" element={<PractitionerClientProfile />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("PractitionerClientProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCoachClient.mockReturnValue({ data: DETAIL, isLoading: false })
  })

  it("renders the client header and back link", () => {
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
    expect(screen.getByText("Back to My Clients")).toBeInTheDocument()
  })

  it("renders the main section cards from the detail", () => {
    renderPage()
    expect(screen.getByText("Quarterly review")).toBeInTheDocument()
    expect(screen.getByText("PRISM Scores")).toBeInTheDocument()
    expect(screen.getByText("Resources")).toBeInTheDocument()
  })

  it("renders a loading skeleton state", () => {
    mockUseCoachClient.mockReturnValue({ data: undefined, isLoading: true })
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText("Back to My Clients")).toBeInTheDocument()
  })

  it("renders a not-found state when no data resolves", () => {
    mockUseCoachClient.mockReturnValue({ data: null, isLoading: false })
    renderPage()
    expect(screen.getByText("Client not found.")).toBeInTheDocument()
  })
})
