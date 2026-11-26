/**
 * @jest-environment jsdom
 *
 * RM-5 guard: the switch-off path is byte-identical.
 *
 * With the `company-admin` house switch OFF, every page RM-5 touched must
 * render exactly the markup it rendered before RM-5. The snapshot in
 * __snapshots__/rm5-switch-off.test.tsx.snap was written by running THIS file
 * on the pre-RM-5 base (inspire-genius-frontend 9eca3732), then carried over
 * unchanged — so a diff here means RM-5 leaked into the switch-off path.
 *
 * The super-admin cohort read-out (`/super-admin/cohort-readout`) is checked
 * with the switch ON as well: RM-5 must never wrap it in the company-admin hub.
 *
 * This file deliberately imports only the pages, never RM-5's new modules, so
 * it runs unchanged on the base.
 */
import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import CompanyAdminUsers from "../Users"
import CompanyAdminOrganization from "../Organization"
import BulkImport from "../BulkImport"
import CultureDocs from "../CultureDocs"
import CompanyAdminAnalytics from "../Analytics"
import CompanyAdminObservability from "../Observability"
import CohortReadout from "../CohortReadout"

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
// The charts receive random placeholder series; render a fixed stand-in so the snapshot is stable.
jest.mock("@/components/analytics/charts", () => ({
  EngagementChart: ({ title }: { title?: string }) => <div data-testid="chart">{title}</div>,
  GoalsBreakdownChart: ({ title }: { title?: string }) => <div data-testid="chart">{title}</div>,
  CostTrendChart: ({ title }: { title?: string }) => <div data-testid="chart">{title}</div>,
  UtilizationAreaChart: ({ title }: { title?: string }) => <div data-testid="chart">{title}</div>,
}))
jest.mock("@/hooks/observability/useObservability", () => ({
  useDashboardMetrics: () => ({ isLoading: false, refetch: jest.fn() }),
}))
jest.mock("@/components/super-admin/CostBoard", () => ({
  __esModule: true,
  default: () => <div data-testid="cost-board" />,
}))
jest.mock("@/components/super-admin/ObservabilityBoard", () => ({
  __esModule: true,
  default: () => <div data-testid="observability-board" />,
}))
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrgDirectory: () => ({ data: [], isLoading: false, error: null }),
}))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: true }),
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

function html(el: ReactNode): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const { container, unmount } = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  )
  const out = container.innerHTML
  unmount()
  return out
}

const PAGES: [string, () => ReactNode][] = [
  ["/company-admin/users", () => <CompanyAdminUsers />],
  ["/company-admin/organization", () => <CompanyAdminOrganization />],
  ["/company-admin/bulk-import", () => <BulkImport />],
  ["/company-admin/culture", () => <CultureDocs />],
  ["/company-admin/analytics", () => <CompanyAdminAnalytics />],
  ["/company-admin/observability", () => <CompanyAdminObservability />],
  ["/company-admin/cohort-readout", () => <CohortReadout />],
]

beforeEach(() => localStorage.clear())

describe("RM-5 — switch OFF renders each page exactly as before", () => {
  it.each(PAGES)("%s (switch absent)", (_route, el) => {
    expect(html(el())).toMatchSnapshot()
  })

  it.each(PAGES)("%s (switch explicitly false)", (_route, el) => {
    const absent = html(el())
    localStorage.setItem(SWITCH, "false")
    expect(html(el())).toBe(absent)
  })
})

describe("RM-5 — the super-admin cohort read-out is unchanged whatever the company-admin switch says", () => {
  it("switch ON", () => {
    localStorage.setItem(SWITCH, "true")
    expect(html(<CohortReadout audience="super-admin" />)).toMatchSnapshot()
  })

  it("switch OFF matches switch ON", () => {
    const off = html(<CohortReadout audience="super-admin" />)
    localStorage.setItem(SWITCH, "true")
    expect(html(<CohortReadout audience="super-admin" />)).toBe(off)
  })
})
