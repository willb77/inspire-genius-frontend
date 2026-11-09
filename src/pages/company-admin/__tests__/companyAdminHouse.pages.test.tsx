/**
 * @jest-environment jsdom
 *
 * House style W2b (area `company-admin`, default OFF): the People,
 * Organization and Dashboard pages. Switch OFF must render today's pages;
 * switch ON must show only real data, and keep error distinct from empty.
 */
import type { ReactNode } from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import CompanyAdminUsers from "../Users"
import CompanyAdminOrganization from "../Organization"
import CompanyAdminDashboard from "../Dashboard"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}))
jest.mock("@/components/company-admin/LinkRequestsAdminSection", () => ({
  LinkRequestsAdminSection: () => <div data-testid="link-requests" />,
}))
jest.mock("@/components/job-blueprint/validation/ValidationReviewQueue", () => ({
  ValidationReviewQueue: () => <div data-testid="review-queue" />,
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: null }) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}))
jest.mock("sonner", () => ({ toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/useMinorConsent", () => ({
  useRosterAgeCapture: () => ({
    ageCaptureAllowed: false,
    recordFrom: jest.fn(),
    mutation: { isPending: false, isError: false, data: undefined },
  }),
}))

type Q = { data?: unknown; isLoading?: boolean; error?: unknown; refetch?: jest.Mock }
let users: Q
let depts: Q
let analytics: Q
let rollups: Q
const refetchUsers = jest.fn()
const refetchDepts = jest.fn()
jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyUsers: () => ({ isLoading: false, error: null, refetch: refetchUsers, ...users }),
  useCompanyDepartments: () => ({ isLoading: false, error: null, refetch: refetchDepts, ...depts }),
  useCompanyAnalytics: () => ({ isLoading: false, error: null, ...analytics }),
}))
jest.mock("@/hooks/company-admin/useObservabilityRollup", () => ({
  useObservabilityRollup: () => ({ isLoading: false, error: null, ...rollups }),
}))

const SWITCH = "house_style_company-admin"
// The classic page's eight sample people, by first name and initial.
const FALLBACK_NAMES = ["Alex T", "Maria G", "James W", "Sarah L", "Chris M", "Priya P", "Tom H", "David C"]
const INVENTED = ["247", "$107,000", "Enterprise (247 seats)", ...FALLBACK_NAMES]

function renderPage(el: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function expectNoInvented() {
  const text = document.body.textContent ?? ""
  for (const s of INVENTED) expect(text).not.toContain(s)
}

const REAL_PEOPLE = {
  users: [
    { id: "1", user_id: "u1", name: "Rowan Field", email: "rowan.field (test)", role: "manager", department: null, is_active: true, prism_completed: true, last_active: "2026-11-03T14:05:00Z" },
    { id: "2", user_id: "u2", name: "Kit Marsh", email: "kit.marsh (test)", role: "user", department: "Sales", is_active: false, prism_completed: false, last_active: null },
  ],
  total: 2,
}

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  users = { data: undefined }
  depts = { data: undefined }
  analytics = { data: undefined }
  rollups = { data: null }
})

describe("switch OFF: today's pages, unchanged", () => {
  it("Users shows today's page, including its sample rows and figures", () => {
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByText("admin:users.title")).toBeInTheDocument()
    expect(screen.getByText("Total Users")).toBeInTheDocument()
    expect(screen.getByText("247")).toBeInTheDocument()
    expect(screen.getByText(/^Alex T/)).toBeInTheDocument()
    expect(screen.getByText("common:addUser")).toBeInTheDocument()
    expect(screen.queryByText("Add people")).not.toBeInTheDocument()
  })

  it("Organization shows today's chart", () => {
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getByText("Organization Chart")).toBeInTheDocument()
    expect(screen.getByText("CEO")).toBeInTheDocument()
  })

  it("Dashboard shows today's titles and tiles", () => {
    renderPage(<CompanyAdminDashboard />)
    expect(screen.getByText("Admin Surfaces")).toBeInTheDocument()
    expect(screen.getByText("Org Rollups")).toBeInTheDocument()
    expect(screen.getByText("Monthly LLM Cost")).toBeInTheDocument()
    expect(screen.getByText("Costs")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(screen.getByText("$0.00")).toBeInTheDocument()
    expect(screen.queryByText("Shortcuts")).not.toBeInTheDocument()
  })

  it("an explicit false behaves like absent", () => {
    localStorage.setItem(SWITCH, "false")
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByText("Total Users")).toBeInTheDocument()
  })
})

describe("switch ON: People", () => {
  beforeEach(() => localStorage.setItem(SWITCH, "true"))

  it("lists the real people, and no invented ones", () => {
    users = { data: REAL_PEOPLE }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByRole("heading", { name: "People" })).toBeInTheDocument()
    expect(screen.getByText("Rowan Field")).toBeInTheDocument()
    expect(screen.getByText("Kit Marsh")).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(within(table).getByText("Manager")).toBeInTheDocument()
    expect(within(table).getByText("Inactive")).toBeInTheDocument()
    expect(within(table).getByText("Done")).toBeInTheDocument()
    expect(within(table).getByText("Nov 3, 2026")).toBeInTheDocument()
    expect(screen.getByTestId("link-requests")).toBeInTheDocument()
    expectNoInvented()
  })

  it("search narrows the list, and a search with no match says so", () => {
    users = { data: REAL_PEOPLE }
    renderPage(<CompanyAdminUsers />)
    const box = screen.getByPlaceholderText("Search by name, email or department")
    fireEvent.change(box, { target: { value: "sales" } })
    expect(screen.queryByText("Rowan Field")).not.toBeInTheDocument()
    expect(screen.getByText("Kit Marsh")).toBeInTheDocument()
    fireEvent.change(box, { target: { value: "zzz" } })
    expect(screen.getByText("No matches")).toBeInTheDocument()
  })

  it("a failed load is an error with Try again, never 'No people yet'", () => {
    users = { error: new Error("boom") }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your people.")
    expect(screen.queryByText("No people yet")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetchUsers).toHaveBeenCalled()
    expectNoInvented()
  })

  it("an error wins over a cached empty list (a failed refresh is not 'No people yet')", () => {
    users = { data: { users: [], total: 0 }, error: new Error("refresh failed") }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your people.")
    expect(screen.queryByText("No people yet")).not.toBeInTheDocument()
  })

  it("an unreadable answer is an error too, not an empty organization", () => {
    users = { data: undefined }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("No people yet")).not.toBeInTheDocument()
    expectNoInvented()
  })

  it("an empty organization says 'No people yet'", () => {
    users = { data: { users: [], total: 0 } }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByText("No people yet")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expectNoInvented()
  })

  it("loading shows the loading state", () => {
    users = { isLoading: true }
    renderPage(<CompanyAdminUsers />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    expectNoInvented()
  })

  it("Add people opens in place with the sign-in notice, and closes", () => {
    users = { data: REAL_PEOPLE }
    renderPage(<CompanyAdminUsers />)
    fireEvent.click(screen.getByRole("button", { name: "Add people" }))
    expect(screen.getByRole("note")).toHaveTextContent("they cannot sign in yet")
    expect(screen.getByText("Rowan Field")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add people" })).toBeInTheDocument()
  })
})

describe("switch ON: Organization", () => {
  beforeEach(() => localStorage.setItem(SWITCH, "true"))

  it("shows only real departments: no chart, no CEO, no invented figures", () => {
    depts = { data: { departments: [{ id: "d1", name: "Field Ops", headcount: 12, training_completion: 40.5 }, { id: "d2", name: "Legal", headcount: null }] } }
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getByText("Field Ops")).toBeInTheDocument()
    expect(screen.getByText("40.5%")).toBeInTheDocument()
    expect(screen.getAllByText("12").length).toBeGreaterThan(0)
    expect(screen.queryByText("CEO")).not.toBeInTheDocument()
    expect(screen.queryByText("Organization Chart")).not.toBeInTheDocument()
    expect(screen.queryByText("Engineering")).not.toBeInTheDocument()
    expectNoInvented()
  })

  it("error is distinct from empty", () => {
    depts = { error: new Error("x") }
    const { unmount } = renderPage(<CompanyAdminOrganization />)
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your organization.")
    expect(screen.queryByText("No departments yet")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetchDepts).toHaveBeenCalled()
    unmount()
    depts = { data: { departments: [] } }
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getByText("No departments yet")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("an error wins over a cached empty list", () => {
    depts = { data: { departments: [] }, error: new Error("refresh failed") }
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("No departments yet")).not.toBeInTheDocument()
  })

  it("shows '—' for people when no department has a headcount", () => {
    depts = { data: { departments: [{ id: "d2", name: "Legal" }] } }
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
  })

  it("loading shows the loading state", () => {
    depts = { isLoading: true }
    renderPage(<CompanyAdminOrganization />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })
})

describe("switch ON: Dashboard", () => {
  beforeEach(() => localStorage.setItem(SWITCH, "true"))

  it("new wording; Costs and Settings gone; Help present", () => {
    renderPage(<CompanyAdminDashboard />)
    expect(screen.getByText("Shortcuts")).toBeInTheDocument()
    expect(screen.getByText("AI usage cost this month")).toBeInTheDocument()
    expect(screen.queryByText("Admin Surfaces")).not.toBeInTheDocument()
    expect(screen.queryByText("Monthly LLM Cost")).not.toBeInTheDocument()
    const links = screen.getAllByRole("link").map((a) => a.textContent)
    expect(links).toContain("Help & Support")
    expect(links).not.toContain("Costs")
    expect(links).not.toContain("Settings")
    expect(screen.getAllByRole("link").some((a) => /costs|settings/.test(a.getAttribute("href") ?? ""))).toBe(false)
    expect(screen.getByTestId("review-queue")).toBeInTheDocument()
  })

  it("null rollups and missing figures show '—', never 0", () => {
    rollups = { data: null }
    analytics = { data: undefined }
    depts = { error: new Error("x") }
    renderPage(<CompanyAdminDashboard />)
    const text = document.body.textContent ?? ""
    expect(text).not.toMatch(/\$0\.00|(^|\D)0%|0\.00/)
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(8)
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your departments.")
  })

  it("real figures from the server's own field names", () => {
    analytics = { data: { total_users: 31, active_users: 20, avg_prism_score: 45.2, training_completion: 60 } }
    rollups = { data: { coverage_percent: 80, active_today: 0, avg_sessions_per_user: 1.5, monthly_llm_cost_usd: 12.3 } }
    depts = { data: { departments: [{ id: "d1", name: "Field Ops", headcount: 1 }] } }
    renderPage(<CompanyAdminDashboard />)
    expect(screen.getByText("31")).toBeInTheDocument()
    expect(screen.getByText("60%")).toBeInTheDocument()
    expect(screen.getByText("45.2%")).toBeInTheDocument()
    expect(screen.getByText("80%")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("1.50")).toBeInTheDocument()
    expect(screen.getByText("$12.30")).toBeInTheDocument()
    expect(screen.getByText("1 person")).toBeInTheDocument()
  })

  it("an empty department list is an empty state", () => {
    depts = { data: { departments: [] } }
    renderPage(<CompanyAdminDashboard />)
    expect(screen.getByText("No departments yet")).toBeInTheDocument()
  })
})
