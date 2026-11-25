/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { MemberDossier, RosterMember } from "@/types/development"

/**
 * U9 — the Studio's words follow the audience, end to end.
 *
 * These render both Studio pages through the REAL `useDevelopmentText`, so
 * they fail if a page stops passing its `audience` to the hook — the one link
 * the table tests cannot see. The practitioner mount must not say "team
 * member"; the manager mount must still say exactly what it said before U9.
 *
 * Scope: the copy that comes from the Studio text table. Strings that come
 * from the locale files (the Add member dialog, the Meridian panel, the
 * Compare and Scenarios tabs) are outside U9 and are not asserted here.
 *
 * Invented people — this repo is public.
 */

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

/* The server text overlay answers with nothing, as it does when unset. */
jest.mock("@/hooks/useFrontendText", () => ({
  useFrontendText: () => ({ data: { data: { items: [] } } }),
}))

const rosterState: { data: RosterMember[]; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
}
let dossierState: { data: MemberDossier | null | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: true,
}

// TDS-U11b: the practitioner mount also reads unconnected clients from the
// roster query; that section has its own suite (UnconnectedClientsSection).
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const actualText = jest.requireActual("@/hooks/manager/development/useDevelopmentText")
  return {
    useDevelopmentText: actualText.useDevelopmentText,
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch: jest.fn() }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useMemberDossier: () => dossierState,
    useMemberFitMatches: () => ({ data: undefined, isLoading: false, isError: false }),
    useRefreshDossier: () => ({ mutate: jest.fn(), isPending: false }),
    useSharePlan: () => ({ mutate: jest.fn(), isPending: false }),
    useGoalSession: () => ({ mutate: jest.fn(), isPending: false }),
  }
})

let mockRole = "manager"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => role === mockRole }),
}))

jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div>org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div>my reports</div>,
}))
jest.mock("@/components/manager/development/LinkRequestsPanel", () => ({
  LinkRequestsPanel: () => null,
}))
jest.mock("@/services/manager/studentRoster.service", () => ({ requestStudentAccess: jest.fn() }))
jest.mock("@/lib/dossierPdf", () => ({ exportDossierPdf: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

/* The workspace's panels are probes: their own copy is not the Studio table's. */
jest.mock("@/components/manager/development/tabs/BehavioralProfilePanel", () => ({ BehavioralProfilePanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/ProfileStudioPanel", () => ({ ProfileStudioPanel: () => <div /> }))
jest.mock("@/components/manager/development/MeridianDevelopmentPanel", () => ({ MeridianDevelopmentPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({ GoalsPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/GapAnalysisPanel", () => ({ GapAnalysisPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/LearningPlanPanel", () => ({ LearningPlanPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/CareerMatchPanel", () => ({ CareerMatchPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/FitEngineMatchPanel", () => ({ FitEngineMatchPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/RoadmapTimeline", () => ({ RoadmapTimeline: () => <div /> }))
jest.mock("@/components/manager/development/tabs/NotesPanel", () => ({ NotesPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/InterviewsPanel", () => ({ InterviewsPanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/TeamComparePanel", () => ({ TeamComparePanel: () => <div /> }))
jest.mock("@/components/manager/development/tabs/TeamScenarioPanel", () => ({ TeamScenarioPanel: () => <div /> }))

/* Radix Select needs PointerEvent / hasPointerCapture, which jsdom lacks. */
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
import MemberDevelopmentWorkspace from "../MemberDevelopmentWorkspace"
import { DEV_TEXT } from "@/constants/development"
import { ROUTES } from "@/constants/routes"

type Audience = "manager" | "practitioner"

function renderStudio(audience: Audience) {
  const route = audience === "practitioner" ? ROUTES.PRACTITIONER.DEVELOPMENT : ROUTES.MANAGER.DEVELOPMENT
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={route} element={<DevelopmentStudio audience={audience} />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderWorkspace(audience: Audience) {
  const route = audience === "practitioner" ? ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER : ROUTES.MANAGER.DEVELOPMENT_MEMBER
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route.replace(":memberId", "m-1")]}>
        <Routes>
          <Route path={route} element={<MemberDevelopmentWorkspace audience={audience} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const member: RosterMember = {
  memberId: "m-1",
  name: "Rowan Ashby",
  title: "Programme Lead",
  department: "Operations",
  coverage: { prism: true, clifton: false, disc: false },
  planStatus: "on_track",
}

function dossier(): MemberDossier {
  return {
    memberId: "m-1",
    member: { name: "Rowan Ashby", title: "Programme Lead", department: "Operations" },
    reconciledHeadline: "Steady organiser",
    overallConfidence: "high",
    profile: {
      prism: [],
      reconciliation: { headline: "", throughLine: "", discrepancies: [], confidence: "low" },
      coverage: { prism: true, clifton: false, disc: false },
    },
    goals: [],
    goalCoverage: [],
    gaps: [],
    learning: [],
    milestones: [],
    matches: [],
  }
}

const NO_TEAM_MEMBER = /team members?/i

beforeEach(() => {
  rosterState.data = []
  rosterState.isError = false
  dossierState = { data: undefined, isLoading: false, isError: true }
})

describe("roster page — practitioner mount says client (U9)", () => {
  beforeEach(() => {
    mockRole = "practitioner"
  })

  it("empty roster: the Studio's name, the search box and the empty state", () => {
    renderStudio("practitioner")
    expect(screen.getByRole("heading", { name: "Client Development Studio" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search clients…")).toBeInTheDocument()
    expect(screen.getByText("No clients yet")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(NO_TEAM_MEMBER)
    expect(document.body.innerHTML).not.toMatch(NO_TEAM_MEMBER)
  })

  it("with a client on the roster", () => {
    rosterState.data = [member]
    renderStudio("practitioner")
    expect(screen.getByText("Rowan Ashby")).toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(NO_TEAM_MEMBER)
    expect(screen.queryByText("Team Development Studio")).not.toBeInTheDocument()
  })

  it("load failure", () => {
    rosterState.isError = true
    renderStudio("practitioner")
    expect(screen.getByText("Couldn't load your client roster. Try again.")).toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(NO_TEAM_MEMBER)
  })
})

describe("roster page — manager mount is unchanged (U9)", () => {
  beforeEach(() => {
    mockRole = "manager"
  })

  it("empty roster reads the manager's lines, byte for byte", () => {
    renderStudio("manager")
    expect(screen.getByRole("heading", { name: DEV_TEXT["dev.studio.title"] })).toBeInTheDocument()
    expect(DEV_TEXT["dev.studio.title"]).toBe("Team Development Studio")
    expect(screen.getByPlaceholderText(DEV_TEXT["dev.studio.search.placeholder"])).toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.empty.title"])).toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.empty.body"])).toBeInTheDocument()
    expect(screen.queryByText(/client/i)).not.toBeInTheDocument()
  })

  it("load failure reads the manager's line", () => {
    rosterState.isError = true
    renderStudio("manager")
    expect(screen.getByText(DEV_TEXT["dev.studio.error"])).toBeInTheDocument()
  })
})

describe("person page — the words follow the audience (U9)", () => {
  it("practitioner, load failure: says client", () => {
    mockRole = "practitioner"
    renderWorkspace("practitioner")
    expect(screen.getByText("Couldn't load this client's dossier.")).toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(NO_TEAM_MEMBER)
  })

  it("practitioner, loaded: shares with the client", () => {
    mockRole = "practitioner"
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderWorkspace("practitioner")
    expect(screen.getByText("Share with client")).toBeInTheDocument()
    expect(screen.queryByText(DEV_TEXT["dev.workspace.share"])).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(NO_TEAM_MEMBER)
  })

  it("manager, load failure and loaded: the manager's lines", () => {
    mockRole = "manager"
    const { unmount } = renderWorkspace("manager")
    expect(screen.getByText(DEV_TEXT["dev.workspace.error"])).toBeInTheDocument()
    unmount()
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderWorkspace("manager")
    expect(screen.getByText(DEV_TEXT["dev.workspace.share"])).toBeInTheDocument()
    expect(DEV_TEXT["dev.workspace.share"]).toBe("Share with member")
  })
})
