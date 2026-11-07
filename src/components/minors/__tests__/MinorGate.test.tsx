/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import MinorGate from "../MinorGate"
import { useMinorConsentStatus } from "@/hooks/useMinorConsent"

jest.mock("@/hooks/useMinorConsent", () => ({ useMinorConsentStatus: jest.fn() }))

const mockStatus = useMinorConsentStatus as jest.Mock

function renderGate(surface: "chat" | "prism" = "chat") {
  return render(
    <MemoryRouter>
      <MinorGate surface={surface}>
        <p>the page</p>
      </MinorGate>
    </MemoryRouter>,
  )
}

const BLOCKED_CHAT = {
  enabled: true,
  rosterAgeCapture: false,
  surfaces: {
    chat: { allowed: false, reason: "consent_required", message: "Ask your school contact." },
    prism: { allowed: true, reason: "policy_allows", message: null },
  },
}

describe("MinorGate", () => {
  beforeEach(() => jest.clearAllMocks())

  it("switch off: the page is exactly today's", () => {
    mockStatus.mockReturnValue({ data: { enabled: false, rosterAgeCapture: false } })
    renderGate()
    expect(screen.getByText("the page")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("while loading or on error the page renders (the server enforces)", () => {
    mockStatus.mockReturnValue({ data: undefined, isLoading: true })
    renderGate()
    expect(screen.getByText("the page")).toBeInTheDocument()
    mockStatus.mockReturnValue({ data: undefined, isError: true })
    renderGate()
    expect(screen.getAllByText("the page")).toHaveLength(2)
  })

  it("a refused surface shows the server's honest message, never a blank page", () => {
    mockStatus.mockReturnValue({ data: BLOCKED_CHAT })
    renderGate("chat")
    expect(screen.queryByText("the page")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Ask your school contact.")
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/home")
  })

  it("only the refused surface is replaced", () => {
    mockStatus.mockReturnValue({ data: BLOCKED_CHAT })
    renderGate("prism")
    expect(screen.getByText("the page")).toBeInTheDocument()
  })

  it("a refusal with no message still says something", () => {
    mockStatus.mockReturnValue({
      data: { enabled: true, rosterAgeCapture: false, surfaces: { chat: { allowed: false, reason: "x", message: null } } },
    })
    renderGate()
    expect(screen.getByRole("status")).toHaveTextContent("isn't available on your account yet")
  })

  it("a refusal is ignored unless the switch is explicitly on", () => {
    mockStatus.mockReturnValue({ data: { ...BLOCKED_CHAT, enabled: false } })
    renderGate()
    expect(screen.getByText("the page")).toBeInTheDocument()
  })
})
