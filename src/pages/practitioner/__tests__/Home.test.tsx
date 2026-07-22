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
  })

  it("renders inside the practitioner layout", () => {
    renderHome()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("greets the practitioner by first name", () => {
    renderHome()
    expect(screen.getByText(/Welcome back, Dana/)).toBeInTheDocument()
  })

  it("renders the Chat with Meridian tile and the quick actions", () => {
    renderHome()
    expect(screen.getByText("Open Meridian chat")).toBeInTheDocument()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Meeting")).toBeInTheDocument()
    expect(screen.getByText("Add a Client")).toBeInTheDocument()
    expect(screen.getByText("Credits")).toBeInTheDocument()
  })

  it("falls back to a friendly greeting when no name is present", () => {
    mockUseAuth.mockReturnValue({ user: {} })
    renderHome()
    expect(screen.getByText(/Welcome back, there/)).toBeInTheDocument()
  })
})
