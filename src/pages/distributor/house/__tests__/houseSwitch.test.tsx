/**
 * @jest-environment jsdom
 *
 * The `distributor` house-style switch: OFF (the default) must render today's
 * pages exactly — same text, same sample figures — and ON must render the
 * house pages, which show only what the server returned.
 */
import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import DistributorDashboard from "../../Dashboard"
import DistributorCredits from "../../Credits"
import DistributorAnalytics from "../../Analytics"
import NetworkHub from "../../NetworkHub"
import { formatDate } from "@/lib/house/formatDate"

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}))
jest.mock("@/components/job-blueprint/validation/ValidationReviewQueue", () => ({
  ValidationReviewQueue: () => <div data-testid="validation-queue" />,
}))
jest.mock("@/components/analytics/charts", () => ({
  EngagementChart: ({ title }: { title: string }) => <div>{title}</div>,
  UtilizationAreaChart: ({ title }: { title: string }) => <div>{title}</div>,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockUser: { current: { fullName?: string | null; name?: string | null } | null } = {
  current: { fullName: "Carolina Reyes" },
}
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockUser.current }),
}))

const mockWrite = { on: false }
jest.mock("@/components/credits/CreditsWriteControls", () => ({
  get CREDITS_WRITE() {
    return mockWrite.on
  },
  DistributorAllocateControl: () => <button>Give credits</button>,
  DistributorPurchaseControl: () => <button>Buy credits</button>,
}))

type Q = { data?: unknown; isLoading?: boolean; error?: unknown; refetch?: jest.Mock }
const hooks: Record<string, Q> = {}
const q = (name: string) => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn(), ...hooks[name] })
jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorPractitioners: () => q("practs"),
  useDistributorCredits: () => q("credits"),
  useDistributorTransactions: () => q("txs"),
  useDistributorTerritory: () => q("territory"),
}))
jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useDistributorAnalytics: () => q("analytics"),
}))

const REAL = {
  practs: {
    data: {
      practitioners: [
        { id: "p1", name: "Ana Gomez", email: "test@example.com", region: "North", credits_allocated: 50, credits_used: 42 },
        { id: "p2", name: "Rowan Test", email: null, region: null, credits_allocated: 0, credits_used: 0 },
      ],
      total: 2,
    },
  },
  credits: { data: { balance: 1234, currency: "USD", total_allocated: 50, total_used: 42 } },
  txs: {
    data: {
      transactions: [
        { id: "t1", type: "allocate", amount: 50, description: "to Ana", counterparty_id: "p1", created_at: "2026-11-03T15:00:00Z" },
        { id: "t2", type: "purchase", amount: 1284, description: null, counterparty_id: null, created_at: "2026-10-01T15:00:00Z" },
      ],
    },
  },
  territory: { data: { territories: [{ id: "r1", name: "North", region_code: "N", practitioner_count: 1, coverage_pct: 33.3 }], total_practitioners: 1, avg_coverage: 33.3 } },
}

const SAMPLE_TEXT = [/PRISM Partners Inc\./, /^10,000$/, /^3,200$/, /^1,800$/, /^5,000$/, /Dr\. Sarah Chen/, /Michael Torres/]

function expectNoSample() {
  for (const re of SAMPLE_TEXT) expect(screen.queryByText(re)).not.toBeInTheDocument()
}

const at = (ui: React.ReactElement, path = "/") => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

function setSwitch(v: "true" | "false" | null) {
  if (v === null) localStorage.removeItem("house_style_distributor")
  else localStorage.setItem("house_style_distributor", v)
}

beforeEach(() => {
  for (const k of Object.keys(hooks)) delete hooks[k]
  mockUser.current = { fullName: "Carolina Reyes" }
  mockWrite.on = false
  localStorage.clear()
})

describe("switch OFF — today's pages, unchanged", () => {
  it.each([null, "false"] as const)("dashboard keeps the classic text (switch %s)", (v) => {
    setSwitch(v)
    at(<DistributorDashboard />)
    expect(screen.getByText(/Welcome back, PRISM Partners Inc\./)).toBeInTheDocument()
    expect(screen.getByText("10,000")).toBeInTheDocument()
    expect(screen.getByText("Dr. Sarah Chen")).toBeInTheDocument()
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).not.toBeInTheDocument()
  })

  it("credits keeps the classic page", () => {
    at(<DistributorCredits />)
    expect(screen.getByText("Credit Management")).toBeInTheDocument()
    expect(screen.getByText("Purchase Credits")).toBeInTheDocument()
    expect(screen.getByText("Total Purchased")).toBeInTheDocument()
  })

  it("analytics keeps the classic page", () => {
    at(<DistributorAnalytics />)
    expect(screen.getByText("Territory Analytics")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Reports" })).not.toBeInTheDocument()
  })

  it("network keeps the classic page", () => {
    at(<NetworkHub />)
    expect(screen.getByRole("heading", { name: "Network" })).toBeInTheDocument()
    expect(screen.getByText("+ Onboard Practitioner")).toBeInTheDocument()
  })
})

describe("switch ON — distributor home", () => {
  beforeEach(() => setSwitch("true"))

  it("greets the account by its own name and shows real figures", () => {
    Object.assign(hooks, REAL)
    at(<DistributorDashboard />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening), Carolina$/)
    expect(within(screen.getByTestId("stat-Credits available")).getByText("1,234")).toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Given to practitioners")).getByText("50")).toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Practitioners")).getByText("2")).toBeInTheDocument()
    expect(screen.getByText("Ana Gomez")).toBeInTheDocument()
    expect(screen.getByText("42 of 50 credits used")).toBeInTheDocument()
    expect(screen.getByText("Given to a practitioner")).toBeInTheDocument()
    // Formatted in the runner's own time zone, as the page does.
    expect(screen.getByText(formatDate("2026-11-03T15:00:00Z"))).toBeInTheDocument()
    expect(screen.getByTestId("validation-queue")).toBeInTheDocument()
    expectNoSample()
  })

  it("with no name on the account, greets without a stand-in name", () => {
    mockUser.current = { fullName: null, name: null }
    at(<DistributorDashboard />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening)$/)
  })

  it("with no data, shows dashes and honest empty states — never sample data", () => {
    hooks.practs = { data: { practitioners: [], total: 0 } }
    hooks.txs = { data: { transactions: [] } }
    at(<DistributorDashboard />)
    expect(within(screen.getByTestId("stat-Credits available")).getByText("—")).toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Credits available")).getByText("Not available yet")).toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Practitioners")).getByText("0")).toBeInTheDocument()
    expect(screen.getByText("No practitioners yet")).toBeInTheDocument()
    expect(screen.getByText("No credit activity yet")).toBeInTheDocument()
    expectNoSample()
  })

  it("a failed load shows the error state with Try again, not 'empty'", () => {
    const refetch = jest.fn()
    hooks.practs = { error: new Error("boom"), refetch }
    hooks.txs = { error: new Error("boom") }
    hooks.credits = { error: new Error("boom"), data: { balance: 99 } }
    at(<DistributorDashboard />)
    expect(screen.getByText("We couldn't load your practitioners.")).toBeInTheDocument()
    expect(screen.getByText("We couldn't load your credit activity.")).toBeInTheDocument()
    expect(screen.queryByText("No practitioners yet")).not.toBeInTheDocument()
    expect(screen.queryByText("99")).not.toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Practitioners")).getByText("—")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Try again" })[0])
    expect(refetch).toHaveBeenCalled()
    expectNoSample()
  })

  it("while loading, shows the loading pattern", () => {
    hooks.practs = { isLoading: true }
    hooks.txs = { isLoading: true }
    hooks.credits = { isLoading: true }
    at(<DistributorDashboard />)
    expect(screen.getAllByRole("status", { name: "Loading" }).length).toBe(2)
  })

  it("an unrecognised answer reads as not available, not as zero", () => {
    hooks.practs = { data: { something: "else" } }
    hooks.txs = { data: null }
    at(<DistributorDashboard />)
    expect(screen.getByText("Your practitioner list isn't available yet.")).toBeInTheDocument()
    expect(screen.getByText("Credit activity isn't available yet.")).toBeInTheDocument()
  })
})

describe("switch ON — credits", () => {
  beforeEach(() => setSwitch("true"))

  it("shows the real totals, roster and ledger", () => {
    Object.assign(hooks, REAL)
    at(<DistributorCredits />)
    expect(screen.getByRole("heading", { level: 1, name: "Credits" })).toBeInTheDocument()
    expect(within(screen.getByTestId("stat-Used by practitioners")).getByText("42")).toBeInTheDocument()
    expect(screen.getByText("84%")).toBeInTheDocument()
    expect(screen.getByText("Credits bought")).toBeInTheDocument()
    expect(screen.getByText(/to Ana/)).toBeInTheDocument()
    expect(screen.queryByText("Purchase Credits")).not.toBeInTheDocument()
    expectNoSample()
  })

  it("with buying switched off, says so instead of a button that does nothing", () => {
    at(<DistributorCredits />)
    expect(screen.getByText(/Buying and giving credits here isn't available yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/help")
    expect(screen.queryByRole("button", { name: "Buy credits" })).not.toBeInTheDocument()
  })

  it("with buying switched on, shows the real controls", () => {
    mockWrite.on = true
    at(<DistributorCredits />)
    expect(screen.getByRole("button", { name: "Buy credits" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Give credits" })).toBeInTheDocument()
    expect(screen.queryByText(/Buying and giving credits here isn't available yet/)).not.toBeInTheDocument()
  })

  it("empty, error, loading and unknown states", () => {
    hooks.practs = { data: { practitioners: [] } }
    hooks.txs = { error: new Error("x") }
    const { unmount } = at(<DistributorCredits />)
    expect(screen.getByText("No practitioners yet")).toBeInTheDocument()
    expect(screen.getByText("We couldn't load your credit history.")).toBeInTheDocument()
    unmount()

    hooks.practs = { error: new Error("x") }
    hooks.txs = { data: { transactions: [] } }
    const second = at(<DistributorCredits />)
    expect(screen.getByText("We couldn't load your practitioners.")).toBeInTheDocument()
    expect(screen.getByText("No credit activity yet")).toBeInTheDocument()
    second.unmount()

    hooks.practs = { isLoading: true }
    hooks.txs = { data: {} }
    hooks.credits = { isLoading: true }
    at(<DistributorCredits />)
    expect(screen.getAllByRole("status", { name: "Loading" }).length).toBe(1)
    expect(screen.getByText("Credit history isn't available yet.")).toBeInTheDocument()
  })

  it("an unknown roster answer reads as not available", () => {
    hooks.practs = { data: "?" }
    at(<DistributorCredits />)
    expect(screen.getByText("Credits by practitioner aren't available yet.")).toBeInTheDocument()
  })
})

describe("switch ON — my practitioners", () => {
  beforeEach(() => setSwitch("true"))

  it("lists the real roster, searchable, with no dead Onboard button", () => {
    Object.assign(hooks, REAL)
    at(<NetworkHub />)
    expect(screen.getByRole("heading", { level: 1, name: "My practitioners" })).toBeInTheDocument()
    expect(screen.getByText("Practitioners (2)")).toBeInTheDocument()
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.queryByText("+ Onboard Practitioner")).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText("Search by name, email or region"), { target: { value: "north" } })
    expect(screen.getByText("Ana Gomez")).toBeInTheDocument()
    expect(screen.queryByText("Rowan Test")).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText("Search by name, email or region"), { target: { value: "zzz" } })
    expect(screen.getByText("No practitioner matches that search.")).toBeInTheDocument()
    expectNoSample()
  })

  it("opens the Regions tab from ?tab=territory and shows real territory rows", () => {
    Object.assign(hooks, REAL)
    at(<NetworkHub />, "/distributor/network?tab=territory")
    expect(screen.getByText("Regions (1)")).toBeInTheDocument()
    expect(screen.getByText("33%")).toBeInTheDocument()
  })

  it("honours defaultTab and ignores a bad ?tab value", () => {
    hooks.territory = { data: { territories: [] } }
    at(<NetworkHub defaultTab="territory" />, "/distributor/territory?tab=nonsense")
    expect(screen.getByText("No regions yet")).toBeInTheDocument()
  })

  it("switches tabs and keeps the choice in the address", () => {
    Object.assign(hooks, REAL)
    at(<NetworkHub />)
    const tab = screen.getByRole("tab", { name: "Regions" })
    fireEvent.mouseDown(tab)
    fireEvent.click(tab)
    expect(screen.getByText("Regions (1)")).toBeInTheDocument()
  })

  it("empty, error, loading and unknown states", () => {
    hooks.practs = { data: { practitioners: [] } }
    const a = at(<NetworkHub />)
    expect(screen.getByText("No practitioners yet")).toBeInTheDocument()
    a.unmount()
    hooks.practs = { error: new Error("x") }
    const b = at(<NetworkHub />)
    expect(screen.getByText("We couldn't load your practitioners.")).toBeInTheDocument()
    b.unmount()
    hooks.practs = { isLoading: true }
    const c = at(<NetworkHub />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    c.unmount()
    hooks.practs = { data: undefined }
    const d = at(<NetworkHub />)
    expect(screen.getByText("Your practitioner list isn't available yet.")).toBeInTheDocument()
    d.unmount()
    hooks.territory = { error: new Error("x") }
    const e = at(<NetworkHub defaultTab="territory" />)
    expect(screen.getByText("We couldn't load your territory.")).toBeInTheDocument()
    e.unmount()
    hooks.territory = { isLoading: true }
    const f = at(<NetworkHub defaultTab="territory" />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    f.unmount()
    hooks.territory = { data: { regions: [] } }
    at(<NetworkHub defaultTab="territory" />)
    expect(screen.getByText("Territory details aren't available yet.")).toBeInTheDocument()
  })
})

describe("switch ON — reports", () => {
  beforeEach(() => setSwitch("true"))

  it("builds reports from the real roster and ledger only", () => {
    Object.assign(hooks, REAL)
    at(<DistributorAnalytics />)
    expect(screen.getByRole("heading", { level: 1, name: "Reports" })).toBeInTheDocument()
    expect(screen.getByText("No region")).toBeInTheDocument()
    expect(screen.getByText("Nov 2026")).toBeInTheDocument()
    expect(screen.getByText("Oct 2026")).toBeInTheDocument()
    expect(screen.queryByText("Territory Analytics")).not.toBeInTheDocument()
    expectNoSample()
  })

  it("empty, error, loading and unknown states", () => {
    hooks.practs = { data: { practitioners: [] } }
    hooks.txs = { data: { transactions: [] } }
    const a = at(<DistributorAnalytics />)
    expect(screen.getAllByText("Nothing to report yet")).toHaveLength(2)
    a.unmount()
    hooks.practs = { error: new Error("x") }
    hooks.txs = { error: new Error("x") }
    const b = at(<DistributorAnalytics />)
    expect(screen.getAllByText("We couldn't load this report.")).toHaveLength(2)
    b.unmount()
    hooks.practs = { isLoading: true }
    hooks.txs = { isLoading: true }
    const c = at(<DistributorAnalytics />)
    expect(screen.getAllByRole("status", { name: "Loading" })).toHaveLength(2)
    c.unmount()
    hooks.practs = { data: undefined }
    hooks.txs = { data: undefined }
    at(<DistributorAnalytics />)
    expect(screen.getAllByText("This report isn't available yet.")).toHaveLength(2)
  })
})
