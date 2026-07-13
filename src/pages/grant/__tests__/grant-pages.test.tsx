/**
 * @jest-environment jsdom
 *
 * UI-2..7 page smoke + interaction tests. Every GRANT tool page is mock-backed
 * (USE_GRANT_MOCKS=true), so these render each page against the fixture data and
 * exercise the primary interaction (search, calculate, toggle, filter) to lock
 * in behavior and keep the grant page module covered.
 */

import { render, screen, fireEvent, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  syncAuthToken: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
// These smoke tests exercise the pages against the fixture layer, independent of
// the production USE_GRANT_MOCKS flag (which is now false for the dev go-live).
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

import GrantScholarshipsPage from "../GrantScholarshipsPage"
import GrantFederalPage from "../GrantFederalPage"
import GrantInstitutionsPage from "../GrantInstitutionsPage"
import GrantComparePage from "../GrantComparePage"
import GrantLoansPage from "../GrantLoansPage"
import GrantApplicationsPage from "../GrantApplicationsPage"
import GrantPlanPage from "../GrantPlanPage"
import {
  formatCurrency,
  formatDate,
  daysUntil,
  relativeDeadline,
} from "../_format"

function renderPage(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("GRANT _shared helpers", () => {
  test("formatCurrency renders whole-dollar USD", () => {
    expect(formatCurrency(15500)).toBe("$15,500")
    expect(formatCurrency(212.4)).toBe("$212")
  })

  test("formatDate humanizes ISO and passes through junk", () => {
    expect(formatDate("2026-06-30")).toMatch(/2026/)
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })

  test("daysUntil is positive for the future, negative for the past", () => {
    const now = new Date("2026-01-01T00:00:00Z")
    expect(daysUntil("2026-01-11T00:00:00Z", now)).toBe(10)
    expect(daysUntil("2025-12-22T00:00:00Z", now)).toBe(-10)
  })

  test("relativeDeadline phrases today/tomorrow/past", () => {
    const now = new Date("2026-01-01T00:00:00Z")
    expect(relativeDeadline("2026-01-01T00:00:00Z", now)).toBe("due today")
    expect(relativeDeadline("2026-01-02T00:00:00Z", now)).toBe("due tomorrow")
    expect(relativeDeadline("2025-12-31T00:00:00Z", now)).toBe("1 day ago")
    expect(relativeDeadline("2026-01-15T00:00:00Z", now)).toBe("in 14 days")
  })
})

describe("GrantScholarshipsPage (UI-2)", () => {
  test("renders ranked matches and supports search", async () => {
    renderPage(<GrantScholarshipsPage />)
    expect(screen.getByRole("heading", { name: "Scholarships" })).toBeInTheDocument()
    // Mock data resolves; highest match score first.
    expect(await screen.findByText("Horizon STEM Award")).toBeInTheDocument()
    expect(screen.getByText("First-Gen Leaders Grant")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Keywords"), { target: { value: "STEM" } })
    fireEvent.change(screen.getByLabelText("Min award ($)"), { target: { value: "3000" } })
    fireEvent.click(screen.getByRole("button", { name: /Search/i }))
    // Results still render after re-query.
    expect(await screen.findByText("Horizon STEM Award")).toBeInTheDocument()
  })
})

describe("GrantFederalPage (UI-3)", () => {
  test("lists deadlines and filters by type", async () => {
    renderPage(<GrantFederalPage />)
    expect(screen.getByRole("heading", { name: "Federal & State Aid" })).toBeInTheDocument()
    expect(await screen.findByText("FAFSA Submission")).toBeInTheDocument()
    expect(screen.getByText("Cal Grant GPA Verification")).toBeInTheDocument()

    // Filter to State only — the federal item drops out.
    fireEvent.click(screen.getByRole("button", { name: "State" }))
    expect(screen.getByText("Cal Grant GPA Verification")).toBeInTheDocument()
    expect(screen.queryByText("FAFSA Submission")).not.toBeInTheDocument()
  })
})

describe("GrantInstitutionsPage (UI-4)", () => {
  test("estimates net price for an institution", async () => {
    renderPage(<GrantInstitutionsPage />)
    expect(screen.getByRole("heading", { name: "Institutions" })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Institution"), { target: { value: "State University" } })
    fireEvent.click(screen.getByRole("button", { name: /Estimate net price/i }))

    // Mutation resolves to the mock net-price estimate.
    expect(await screen.findByText("$15,500")).toBeInTheDocument()
    expect(screen.getByText(/net \/ yr/i)).toBeInTheDocument()
  })
})

describe("GrantComparePage (UI-5)", () => {
  test("renders the comparison table and flags best value", async () => {
    renderPage(<GrantComparePage />)
    expect(screen.getByRole("heading", { name: "Compare Offers" })).toBeInTheDocument()
    // City College has the lower net cost (9000 < 15500) → flagged best value.
    expect(await screen.findByText("Best value")).toBeInTheDocument()
    expect(screen.getByText(/lowest net cost at/i)).toBeInTheDocument()
    // Both institutions appear (in the table and the side-by-side detail cards).
    expect(screen.getAllByText(/City College/).length).toBeGreaterThan(0)
    expect(screen.getAllByText("State University").length).toBeGreaterThan(0)
  })
})

describe("GrantLoansPage (UI-6)", () => {
  test("projects repayment and looks up salary", async () => {
    renderPage(<GrantLoansPage />)
    expect(screen.getByRole("heading", { name: "Loans & Debt" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Project repayment/i }))
    expect(await screen.findByText("$212")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Occupation"), {
      target: { value: "Software Developer" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Look up/i }))
    expect(await screen.findByText("$124,200")).toBeInTheDocument()
    // With both present, an affordability band appears.
    expect(await screen.findByText(/entry-level monthly income/i)).toBeInTheDocument()
  })
})

describe("GrantApplicationsPage (UI-7 concierge)", () => {
  test("builds a checklist and toggles completion", async () => {
    renderPage(<GrantApplicationsPage />)
    expect(screen.getByRole("heading", { name: "Application Concierge" })).toBeInTheDocument()
    // "Create your FSA ID" is both the "Next up" hint and a list item — expect it twice.
    expect((await screen.findAllByText("Create your FSA ID")).length).toBeGreaterThan(1)

    // A deadline-derived task is unique to the list; toggling it strikes it through.
    const fafsaLabel = await screen.findByText("Submit FAFSA Submission")
    expect(fafsaLabel).not.toHaveClass("line-through")
    fireEvent.click(fafsaLabel.closest("button") as HTMLButtonElement)
    expect(fafsaLabel).toHaveClass("line-through")
  })
})

describe("GrantPlanPage (UI-7 plan)", () => {
  test("aggregates tools into summary + next actions", async () => {
    renderPage(<GrantPlanPage />)
    expect(screen.getByRole("heading", { name: "My Aid Plan" })).toBeInTheDocument()
    // Potential aid = 5000 + 2500 = 7500.
    expect(await screen.findByText("$7,500")).toBeInTheDocument()

    const actions = await screen.findByText(/Your next actions/i)
    const list = actions.parentElement as HTMLElement
    // Intake not ready (mock intake empty) → first action is finishing the profile.
    expect(within(list).getByText(/Finish your aid profile/i)).toBeInTheDocument()
  })
})
