/**
 * @jest-environment jsdom
 *
 * RM-5 guards (company-admin house switch ON): every old company-admin address
 * still opens its own page, inside its hub, with its own tab selected; the
 * Cohort Read-out tab shows only when the org's switch reads true; "Add
 * people" still opens the in-place panel (W2b) and does not navigate.
 */
import type { ReactNode } from "react"
import { render, screen, within, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import CompanyAdminUsers from "../Users"
import CompanyAdminOrganization from "../Organization"
import BulkImport from "../BulkImport"
import CultureDocs from "../CultureDocs"
import CompanyAdminAnalytics from "../Analytics"
import CompanyAdminObservability from "../Observability"
import CohortReadout from "../CohortReadout"
import { ANALYTICS_HUB, COMPANY_ADMIN_HUBS, ORGANIZATION_HUB, PEOPLE_HUB, visibleHubTabs } from "../house/hubs"
import { ROUTES } from "@/constants/routes"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="company-admin-layout">{children}</div>,
}))
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      !opts || typeof opts.defaultValue !== "string"
        ? key
        : Object.entries(opts).reduce((s, [k, v]) => s.split("{{" + k + "}}").join(String(v)), opts.defaultValue),
    i18n: { language: "en" },
  }),
}))
jest.mock("sonner", () => ({ toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() } }))
jest.mock("@/components/company-admin/LinkRequestsAdminSection", () => ({
  LinkRequestsAdminSection: () => <div data-testid="link-requests" />,
}))
jest.mock("@/components/company-admin/house/AddPeople", () => ({
  AddPeople: () => <div data-testid="add-people-panel" />,
}))
jest.mock("@/hooks/useMinorConsent", () => ({
  useRosterAgeCapture: () => ({
    ageCaptureAllowed: false,
    recordFrom: jest.fn(),
    mutation: { isPending: false, isError: false, data: undefined, reset: jest.fn() },
  }),
}))
jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyUsers: () => ({ data: { users: [], total: 0 }, isLoading: false, error: null, refetch: jest.fn() }),
  useCompanyDepartments: () => ({ data: { departments: [] }, isLoading: false, error: null, refetch: jest.fn() }),
}))
jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({ mutate: jest.fn(), isPending: false, data: null }),
  useBulkDemoInvite: () => ({ mutate: jest.fn(), isPending: false, data: undefined }),
  useSendInvitations: () => ({ mutate: jest.fn(), isPending: false }),
  useInvitationStatus: () => ({ data: undefined, isLoading: false }),
  useResendInvitation: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/culture/useCultureDocs", () => ({
  useCultureDocs: () => ({ data: { documents: [] }, isLoading: false, error: null, refetch: jest.fn() }),
  useUploadCultureDoc: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteCultureDoc: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useCompanyAnalytics: () => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() }),
}))
jest.mock("@/components/analytics/charts", () => ({
  EngagementChart: () => <div data-testid="chart" />,
  GoalsBreakdownChart: () => <div data-testid="chart" />,
  CostTrendChart: () => <div data-testid="chart" />,
  UtilizationAreaChart: () => <div data-testid="chart" />,
}))
jest.mock("@/hooks/observability/useObservability", () => ({
  useDashboardMetrics: () => ({ isLoading: false, refetch: jest.fn() }),
}))
jest.mock("@/components/super-admin/CostBoard", () => ({ __esModule: true, default: () => <div data-testid="cost-board" /> }))
jest.mock("@/components/super-admin/ObservabilityBoard", () => ({
  __esModule: true,
  default: () => <div data-testid="observability-board" />,
}))
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrgDirectory: () => ({ data: [], isLoading: false, error: null }),
}))
/** The org's cohort_readout switch as the server reports it: true, false, or undefined (loading / failed). */
let mockCohortOn: boolean | undefined
const mockCohortEnabled = jest.fn()
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: (enabled: boolean) => {
    mockCohortEnabled(enabled)
    return { data: enabled ? mockCohortOn : undefined }
  },
  useCohortReadout: () => ({ data: undefined, isLoading: false, error: null }),
  useCohortReadoutExport: () => ({ mutate: jest.fn(), isPending: false }),
}))
// RM-6 B: the practitioner client-roster status reads OFF here, so every
// menu below is today's menu (the switch-on menu has its own suite).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}))

const SWITCH = "house_style_company-admin"

function renderAt(route: string, el: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function hubNav(title: string) {
  return screen.getByRole("navigation", { name: `${title} sections` })
}

function tabLabels(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .map((a) => a.textContent)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(SWITCH, "true")
  mockCohortOn = true
  mockCohortEnabled.mockClear()
})

/** Every old company-admin address RM-5 folds into a hub: [route, hub title, selected tab, a mark of the page body, page]. */
const ROUTE_TABLE: [string, string, string, string, () => ReactNode][] = [
  [ROUTES.COMPANY_ADMIN.USERS, "People", "People", "link-requests", () => <CompanyAdminUsers />],
  [ROUTES.COMPANY_ADMIN.BULK_IMPORT, "People", "Bulk import", "Upload", () => <BulkImport />],
  [ROUTES.COMPANY_ADMIN.ORGANIZATION, "Organization", "Organization", "No departments yet", () => <CompanyAdminOrganization />],
  [ROUTES.COMPANY_ADMIN.CULTURE, "Organization", "Culture Docs", "How Culture Context Works", () => <CultureDocs />],
  [ROUTES.COMPANY_ADMIN.ANALYTICS, "Reports", "Analytics", "chart", () => <CompanyAdminAnalytics />],
  [ROUTES.COMPANY_ADMIN.OBSERVABILITY, "Reports", "AI Observability", "observability-board", () => <CompanyAdminObservability />],
  [ROUTES.COMPANY_ADMIN.COHORT_READOUT, "Reports", "Cohort Read-out", "Activity since", () => <CohortReadout />],
]

describe("RM-5 — every old address opens its page inside its hub, its tab selected", () => {
  it.each(ROUTE_TABLE)("%s → %s hub, tab %s", (route, hubTitle, tab, bodyMark, el) => {
    renderAt(route, el())
    expect(screen.getByRole("heading", { level: 1, name: hubTitle })).toBeInTheDocument()
    const nav = hubNav(hubTitle)
    const selected = within(nav)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page")
    expect(selected.map((a) => a.textContent)).toEqual([tab])
    // The open tab points at the address being shown.
    expect(selected[0]).toHaveAttribute("href", route)
    // The page's own body still renders under the hub.
    const marks = [...screen.queryAllByTestId(bodyMark), ...screen.queryAllByText(bodyMark, { exact: false })]
    expect(marks.length).toBeGreaterThan(0)
    // One h1 only: the page's own title is hidden inside the hub.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("covers every hub tab: each tab's route is in the table, and each table route is a hub tab", () => {
    const tabRoutes = COMPANY_ADMIN_HUBS.flatMap((h) => h.tabs.map((t) => t.to)).sort()
    expect(ROUTE_TABLE.map(([route]) => route).sort()).toEqual(tabRoutes)
  })

  it("each tab that is not open links to its own existing address", () => {
    renderAt(ROUTES.COMPANY_ADMIN.ANALYTICS, <CompanyAdminAnalytics />)
    const links = within(hubNav("Reports")).getAllByRole("link")
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Analytics", ROUTES.COMPANY_ADMIN.ANALYTICS],
      ["AI Observability", ROUTES.COMPANY_ADMIN.OBSERVABILITY],
      ["Cohort Read-out", ROUTES.COMPANY_ADMIN.COHORT_READOUT],
    ])
  })

  it("the hubs hold exactly the tabs the CSA names, in order", () => {
    expect(PEOPLE_HUB.tabs.map((t) => t.to)).toEqual([ROUTES.COMPANY_ADMIN.USERS, ROUTES.COMPANY_ADMIN.BULK_IMPORT])
    expect(ORGANIZATION_HUB.tabs.map((t) => t.to)).toEqual([ROUTES.COMPANY_ADMIN.ORGANIZATION, ROUTES.COMPANY_ADMIN.CULTURE])
    expect(ANALYTICS_HUB.tabs.map((t) => t.to)).toEqual([
      ROUTES.COMPANY_ADMIN.ANALYTICS,
      ROUTES.COMPANY_ADMIN.OBSERVABILITY,
      ROUTES.COMPANY_ADMIN.COHORT_READOUT,
    ])
  })
})

describe("RM-5 — Cohort Read-out tab only when the org's switch is on", () => {
  it.each([
    ["off (false)", false],
    ["loading or failed (undefined)", undefined],
  ] as const)("switch %s: no Cohort Read-out tab on Analytics or AI Observability", (_name, value) => {
    mockCohortOn = value
    const { unmount } = renderAt(ROUTES.COMPANY_ADMIN.ANALYTICS, <CompanyAdminAnalytics />)
    expect(tabLabels(hubNav("Reports"))).toEqual(["Analytics", "AI Observability"])
    unmount()
    renderAt(ROUTES.COMPANY_ADMIN.OBSERVABILITY, <CompanyAdminObservability />)
    expect(tabLabels(hubNav("Reports"))).toEqual(["Analytics", "AI Observability"])
  })

  it("switch on: the Cohort Read-out tab is shown", () => {
    mockCohortOn = true
    renderAt(ROUTES.COMPANY_ADMIN.ANALYTICS, <CompanyAdminAnalytics />)
    expect(tabLabels(hubNav("Reports"))).toEqual(["Analytics", "AI Observability", "Cohort Read-out"])
  })

  it("the old address with the switch off: the page renders as before (the server refuses), with no Cohort tab", () => {
    mockCohortOn = false
    renderAt(ROUTES.COMPANY_ADMIN.COHORT_READOUT, <CohortReadout />)
    expect(tabLabels(hubNav("Reports"))).toEqual(["Analytics", "AI Observability"])
    expect(screen.getByText("Activity since", { exact: false })).toBeInTheDocument()
  })

  it("visibleHubTabs: a cohort-gated tab only on true", () => {
    expect(visibleHubTabs(ANALYTICS_HUB, false).map((t) => t.key)).toEqual(["analytics", "observability"])
    expect(visibleHubTabs(ANALYTICS_HUB, true).map((t) => t.key)).toEqual(["analytics", "observability", "cohort-readout"])
    expect(visibleHubTabs(PEOPLE_HUB, false)).toHaveLength(2)
  })

  it("the People and Organization hubs do not read the cohort switch", () => {
    renderAt(ROUTES.COMPANY_ADMIN.USERS, <CompanyAdminUsers />)
    renderAt(ROUTES.COMPANY_ADMIN.CULTURE, <CultureDocs />)
    expect(mockCohortEnabled).not.toHaveBeenCalledWith(true)
  })
})

describe("RM-5 — the super-admin cohort read-out never gets the company-admin hub", () => {
  it("switch ON, audience super-admin: super-admin layout, no hub", () => {
    renderAt(ROUTES.SUPER_ADMIN.COHORT_READOUT, <CohortReadout audience="super-admin" />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
    expect(screen.queryByTestId("company-admin-layout")).toBeNull()
    expect(screen.queryByRole("navigation", { name: "Reports sections" })).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: "Cohort read-out" })).toBeInTheDocument()
  })
})

describe("RM-5 — Add people is unchanged (W2b)", () => {
  it("opens the in-place panel and stays on People", () => {
    renderAt(ROUTES.COMPANY_ADMIN.USERS, <CompanyAdminUsers />)
    const button = screen.getByRole("button", { name: "Add people" })
    expect(button.closest("a")).toBeNull()
    expect(screen.queryByTestId("add-people-panel")).toBeNull()
    fireEvent.click(button)
    expect(screen.getByTestId("add-people-panel")).toBeInTheDocument()
    // Still the People tab of the People hub, not Bulk import.
    const selected = within(hubNav("People"))
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page")
    expect(selected.map((a) => a.textContent)).toEqual(["People"])
  })
})
