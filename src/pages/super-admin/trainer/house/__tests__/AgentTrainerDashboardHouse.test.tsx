import { render, screen, fireEvent, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import AgentTrainerDashboard from "../../AgentTrainerDashboard"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="sa-layout">{children}</div>,
}))

type Q = { data?: unknown; isLoading?: boolean; isError?: boolean; refetch?: jest.Mock }
const mockState: { agents: Q; coaches: Q } = { agents: {}, coaches: {} }
const mockAgentsRefetch = jest.fn()
const mockCoachesRefetch = jest.fn()

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useTrainerAgents: () => mockState.agents,
  useEcosystems: () => ({ data: { data: [{ ecosystem_id: "inspire-genius", ecosystem_name: "Inspire Genius" }] } }),
}))
jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => mockState.coaches,
}))

const AGENTS = [
  { id: "t-1", name: "Coach One", domain: "coaching", maturity_level: 3, status: "active", role_subtitle: "Helper" },
  { id: "t-2", name: "Business Two", domain: "business", maturity_level: 1, status: "active" },
]

function Where() {
  const { pathname } = useLocation()
  return <div data-testid="where">{pathname}</div>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/super-admin/agent-trainer"]}>
      <Routes>
        <Route path="/super-admin/agent-trainer" element={<><AgentTrainerDashboard /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockState.agents = { data: { data: AGENTS }, isLoading: false, isError: false, refetch: mockAgentsRefetch }
  mockState.coaches = { data: undefined, isLoading: false, isError: false, refetch: mockCoachesRefetch }
  mockAgentsRefetch.mockClear()
  mockCoachesRefetch.mockClear()
})
afterEach(() => localStorage.removeItem("house_style_admin"))

describe("AgentTrainerDashboard — house style switch", () => {
  it("switch OFF (default): today's page, card click still navigates as before", () => {
    renderPage()
    expect(screen.getByText("How to train agents")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search agents...")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Coach One"))
    expect(screen.getAllByTestId("where").pop()).toHaveTextContent("/super-admin/agent-trainer/t-1")
  })

  it("switch ON: house header, and a coach card is no longer a fake link", () => {
    localStorage.setItem("house_style_admin", "true")
    renderPage()
    expect(screen.getByRole("heading", { level: 1, name: "Agent Trainer" })).toBeInTheDocument()
    expect(screen.queryByText("How to train agents")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Coach One"))
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/super-admin\/agent-trainer$/)
  })

  it("switch ON: every action button keeps its destination", () => {
    localStorage.setItem("house_style_admin", "true")
    renderPage()
    const card = screen.getByTestId("coach-card-t-1")
    for (const [label, seg] of [
      ["Prompt", "prompt"],
      ["Knowledge", "knowledge"],
      ["Test", "test"],
      ["Training", "training"],
      ["Costs", "costs"],
    ]) {
      expect(within(card).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `/super-admin/agent-trainer/t-1/${seg}`,
      )
    }
    expect(screen.getByRole("link", { name: /Workflow Designer/ })).toHaveAttribute(
      "href",
      "/super-admin/agent-trainer/workflows",
    )
  })

  it("switch ON: search and domain filters work, and an empty result can be cleared", () => {
    localStorage.setItem("house_style_admin", "true")
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "business" }))
    expect(screen.queryByText("Coach One")).not.toBeInTheDocument()
    expect(screen.getByText("Business Two")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Search coaches"), { target: { value: "zzz" } })
    expect(screen.getByText("No coaches found")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.getByText("Coach One")).toBeInTheDocument()
  })

  it("switch ON: falls back to the coaches list when the trainer list is empty", () => {
    localStorage.setItem("house_style_admin", "true")
    mockState.agents = { data: { data: [] }, isLoading: false, isError: true, refetch: mockAgentsRefetch }
    mockState.coaches = { data: { data: [{ id: "c-9", name: "Fallback Coach", status: "active" }] }, isLoading: false }
    renderPage()
    expect(within(screen.getByTestId("coach-card-c-9")).getByRole("link", { name: "Prompt" })).toHaveAttribute(
      "href",
      "/super-admin/agent-trainer/c-9/prompt",
    )
  })

  it("switch ON: both sources failing is an error, not 'no coaches'", () => {
    localStorage.setItem("house_style_admin", "true")
    mockState.agents = { data: undefined, isLoading: false, isError: true, refetch: mockAgentsRefetch }
    mockState.coaches = { data: undefined, isLoading: false, isError: true, refetch: mockCoachesRefetch }
    renderPage()
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the coaches.")
    expect(screen.queryByText("No coaches found")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Try again"))
    expect(mockAgentsRefetch).toHaveBeenCalled()
    expect(mockCoachesRefetch).toHaveBeenCalled()
  })

  it("switch ON: nothing set up is an honest empty state", () => {
    localStorage.setItem("house_style_admin", "true")
    mockState.agents = { data: { data: [] }, isLoading: false, isError: false }
    renderPage()
    expect(screen.getByText("No coaches are set up for this ecosystem yet.")).toBeInTheDocument()
  })

  it("switch ON: loading shows the house loading state", () => {
    localStorage.setItem("house_style_admin", "true")
    mockState.agents = { data: undefined, isLoading: true }
    renderPage()
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })
})
