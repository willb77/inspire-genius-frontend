/** @jest-environment jsdom */
import fs from "node:fs"
import path from "node:path"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

/**
 * RM-6 (CSA #2236), the practitioner's one client front page.
 *
 *  - The practitioner's My Clients and Practitioner Home rows leave the menu.
 *    Both pages are opened from the Studio header, one click away. The manager
 *    header gains nothing.
 *  - RM6PRE-a: when the roster is the practitioner's clients, the first lens
 *    reads "My clients" and the scope line says what the list is. An
 *    organisation roster (the switch off, or the server's fallback after a
 *    failed client read) keeps "Whole organisation".
 *
 * Invented people — this repo is public.
 */

let mockFrontPage = true
const mockSwitchCalls: boolean[] = []
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: (enabled = true) => {
    mockSwitchCalls.push(enabled)
    return enabled && mockFrontPage
  },
}))

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const ORG_CARD: RosterMember = {
  memberId: "m-1",
  name: "Dana Whitfield",
  title: "Service Designer",
  department: "Experience",
  coverage: { prism: true, clifton: false, disc: false },
  planStatus: "on_track",
}
const CLIENT_CARD = { ...ORG_CARD, memberId: "m-2", name: "Rory Calder", clientId: "c-2", connected: true } as RosterMember

const rosterState: { data: RosterMember[]; isLoading: boolean; isError: boolean } = {
  data: [ORG_CARD],
  isLoading: false,
  isError: false,
}

jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
  }
})

let mockRole = "practitioner"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => role === mockRole }),
}))

jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel">org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel">my reports</div>,
}))
jest.mock("@/components/manager/development/LinkRequestsPanel", () => ({
  LinkRequestsPanel: () => null,
}))
jest.mock("@/components/manager/development/MemberCard", () => ({
  MemberCard: ({ member }: { member: RosterMember }) => <div data-testid="member-card">{member.name}</div>,
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock("@/components/ui/select", () => ({
  __esModule: true,
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: { children: React.ReactNode }) => (
    <div role="combobox" {...rest}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

import DevelopmentStudio from "../DevelopmentStudio"
import { DEV_TEXT } from "@/constants/development"
import { ROUTES } from "@/constants/routes"

function renderStudio(audience: "manager" | "practitioner") {
  const route = audience === "practitioner" ? ROUTES.PRACTITIONER.DEVELOPMENT : ROUTES.MANAGER.DEVELOPMENT
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={route} element={<DevelopmentStudio audience={audience} />} />
      </Routes>
    </MemoryRouter>,
  )
}

const CLIENT_SCOPE =
  "These are your clients. A client who has connected an InspiresGenius account has a card; anyone you have added who has not connected yet is listed below."

beforeEach(() => {
  rosterState.data = [ORG_CARD]
  mockRole = "practitioner"
  mockFrontPage = true
  mockSwitchCalls.length = 0
})

describe("RM-6 B: with the switch OFF the practitioner Studio is today's", () => {
  it("no header links, and a client card still reads the organisation wording", () => {
    mockFrontPage = false
    rosterState.data = [CLIENT_CARD]
    renderStudio("practitioner")
    expect(screen.queryByTestId("studio-clients-link")).not.toBeInTheDocument()
    expect(screen.queryByTestId("studio-practice-overview-link")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Whole organisation" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "My clients" })).not.toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.scope.team"])).toBeInTheDocument()
  })

  it("an empty roster with the switch OFF keeps the organisation wording", () => {
    mockFrontPage = false
    rosterState.data = []
    renderStudio("practitioner")
    expect(screen.queryByRole("button", { name: "My clients" })).not.toBeInTheDocument()
  })

  it("the manager mount never asks for the switch", () => {
    mockRole = "manager"
    renderStudio("manager")
    expect(mockSwitchCalls.length).toBeGreaterThan(0)
    expect(mockSwitchCalls.every((asked) => asked === false)).toBe(true)
  })
})

describe("RM-6: the Studio header opens the pages that left the practitioner menu", () => {
  it("the practitioner header links Clients and Practice overview, one click each", () => {
    renderStudio("practitioner")
    const header = screen.getByRole("banner")
    expect(within(header).getByTestId("studio-clients-link")).toHaveAttribute("href", ROUTES.PRACTITIONER.CLIENTS)
    expect(within(header).getByTestId("studio-clients-link")).toHaveTextContent("Clients")
    // Home with ?view=overview: the one way in that is not forwarded back here.
    expect(within(header).getByTestId("studio-practice-overview-link")).toHaveAttribute(
      "href",
      `${ROUTES.PRACTITIONER.HOME}?view=overview`,
    )
    expect(within(header).getByTestId("studio-practice-overview-link")).toHaveTextContent("Practice overview")
    // The manager's Engagement link stays a manager link.
    expect(within(header).queryByTestId("studio-engagement-link")).not.toBeInTheDocument()
  })

  it("the manager header gains neither link and keeps Engagement", () => {
    mockRole = "manager"
    renderStudio("manager")
    const header = screen.getByRole("banner")
    expect(within(header).queryByTestId("studio-clients-link")).not.toBeInTheDocument()
    expect(within(header).queryByTestId("studio-practice-overview-link")).not.toBeInTheDocument()
    expect(within(header).getByTestId("studio-engagement-link")).toBeInTheDocument()
    expect(within(header).queryByText("Practice overview")).not.toBeInTheDocument()
  })
})

describe("RM-6 / RM6PRE-a: the first lens says clients only when the roster is clients", () => {
  it('a practitioner roster with a client card reads "My clients" and says what the list is', () => {
    rosterState.data = [CLIENT_CARD]
    renderStudio("practitioner")
    expect(screen.getByRole("button", { name: "My clients" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Whole organisation" })).not.toBeInTheDocument()
    expect(screen.getByText(CLIENT_SCOPE)).toBeInTheDocument()
    expect(screen.queryByText(DEV_TEXT["dev.studio.scope.team"])).not.toBeInTheDocument()
  })

  it("a practitioner with no cards yet reads My clients (the switch-on empty roster)", () => {
    rosterState.data = []
    renderStudio("practitioner")
    expect(screen.getByRole("button", { name: "My clients" })).toBeInTheDocument()
    expect(screen.getByText(CLIENT_SCOPE)).toBeInTheDocument()
  })

  it("an organisation roster (no client card) keeps the organisation wording", () => {
    rosterState.data = [ORG_CARD]
    renderStudio("practitioner")
    expect(screen.getByRole("button", { name: "Whole organisation" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "My clients" })).not.toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.scope.team"])).toBeInTheDocument()
    expect(screen.queryByText(CLIENT_SCOPE)).not.toBeInTheDocument()
  })

  it("the manager mount never says clients, even if a card carried a client id", () => {
    mockRole = "manager"
    rosterState.data = [CLIENT_CARD]
    renderStudio("manager")
    expect(screen.getByRole("button", { name: "My team" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "My clients" })).not.toBeInTheDocument()
    expect(screen.queryByText(CLIENT_SCOPE)).not.toBeInTheDocument()
  })
})

describe("RM-6 strings exist, translated, in every language the parity gate reads", () => {
  const ROOT = path.resolve(__dirname, "../../../../..")
  type Pages = { studioHeader?: Record<string, string>; studioRoster?: Record<string, string> }
  const read = (lang: string) =>
    JSON.parse(fs.readFileSync(path.join(ROOT, "public/locales", lang, "practitionerPages.json"), "utf8")) as Pages
  const en = read("en")

  it.each(["es", "fr", "pt", "it", "pl", "cs"])("%s has all four keys, none left in English", (lang) => {
    const t = read(lang)
    for (const [block, key] of [
      ["studioHeader", "clients"],
      ["studioHeader", "practiceOverview"],
      ["studioRoster", "lensClients"],
      ["studioRoster", "scopeClients"],
    ] as const) {
      const value = t[block]?.[key]
      expect(typeof value).toBe("string")
      expect(value).not.toBe(en[block]?.[key])
    }
  })
})
