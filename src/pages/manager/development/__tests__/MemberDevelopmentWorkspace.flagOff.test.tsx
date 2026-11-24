/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { MemberDossier } from "@/types/development"

// U4 with `VITE_FEATURE_TDS_STUDIO` OFF, which is the default build. The flag is
// read once at module load, so it cannot share a file with the flag-on suite.
// Panels are probes: this file is about which group a `?tab=` value opens.

/* ---- chrome ---- */
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

/* ---- the Studio flag is OFF for this suite: what a default build offers ---- */
jest.mock("@/constants/development", () => ({
  ...jest.requireActual("@/constants/development"),
  TDS_STUDIO_ENABLED: false,
  FIT_ENGINE_MATCHES_ENABLED: false,
}))

/* ---- data hooks ---- */
let dossierState: {
  data: MemberDossier | null | undefined
  isLoading: boolean
  isError: boolean
  error?: Error | null
  refetch?: () => void
} = {
  data: undefined,
  isLoading: true,
  isError: false,
}
let mockServerText: Record<string, string> = {}
const refreshMutate = jest.fn()
const shareMutate = jest.fn()
const sessionMutate = jest.fn()
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useMemberDossier: () => dossierState,
    useMemberFitMatches: () => ({ data: undefined, isLoading: false, isError: false }),
    useRefreshDossier: () => ({ mutate: refreshMutate, isPending: false }),
    useSharePlan: () => ({ mutate: shareMutate, isPending: false }),
    useGoalSession: () => ({ mutate: sessionMutate, isPending: false }),
    // As the real hook: a server-provided `dev.*` value wins over DEV_TEXT.
    useDevelopmentText: () => ({ t: (key: string) => mockServerText[key] ?? DEV_TEXT[key] ?? key }),
  }
})

/* ---- the consent ask ---- */
jest.mock("@/services/manager/studentRoster.service", () => ({
  requestStudentAccess: jest.fn(),
}))

jest.mock("@/lib/dossierPdf", () => ({ exportDossierPdf: jest.fn() }))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))

/* ---- panels as probes ---- */
type Captured = Record<string, unknown>
const received: { profile?: Captured; studio?: Captured; meridian?: Captured; notes?: Captured } = {}

jest.mock("@/components/manager/development/tabs/BehavioralProfilePanel", () => ({
  BehavioralProfilePanel: (props: Captured) => {
    received.profile = props
    return (
      <div data-testid="profile-panel">
        <button type="button" onClick={() => (props.onRequestAccess as () => void)?.()}>
          ask
        </button>
        <button type="button" onClick={() => (props.onInvite as (f: string) => void)?.("prism")}>
          invite
        </button>
      </div>
    )
  },
}))
jest.mock("@/components/manager/development/tabs/ProfileStudioPanel", () => ({
  ProfileStudioPanel: (props: Captured) => {
    received.studio = props
    return <div data-testid="studio-panel" />
  },
}))
jest.mock("@/components/manager/development/MeridianDevelopmentPanel", () => ({
  MeridianDevelopmentPanel: (props: Captured) => {
    received.meridian = props
    return <div data-testid="meridian-panel" />
  },
}))
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({
  GoalsPanel: () => <div data-testid="goals-panel" />,
}))
jest.mock("@/components/manager/development/tabs/GapAnalysisPanel", () => ({
  GapAnalysisPanel: () => <div data-testid="gaps-panel" />,
}))
jest.mock("@/components/manager/development/tabs/LearningPlanPanel", () => ({
  LearningPlanPanel: () => <div data-testid="learning-panel" />,
}))
jest.mock("@/components/manager/development/tabs/CareerMatchPanel", () => ({
  CareerMatchPanel: () => <div data-testid="careers-panel" />,
}))
jest.mock("@/components/manager/development/tabs/FitEngineMatchPanel", () => ({
  FitEngineMatchPanel: (props: { result?: { state: string } }) => (
    <div data-testid="fit-engine-careers-panel">{props.result?.state}</div>
  ),
}))
jest.mock("@/components/manager/development/tabs/RoadmapTimeline", () => ({
  RoadmapTimeline: () => <div data-testid="roadmap-panel" />,
}))
jest.mock("@/components/manager/development/tabs/NotesPanel", () => ({
  NotesPanel: (props: Captured) => {
    received.notes = props
    return <div data-testid="notes-panel" />
  },
}))
jest.mock("@/components/manager/development/tabs/InterviewsPanel", () => ({
  InterviewsPanel: () => <div data-testid="interviews-panel" />,
}))
jest.mock("@/components/manager/development/tabs/TeamComparePanel", () => ({
  TeamComparePanel: () => <div data-testid="compare-panel" />,
}))
jest.mock("@/components/manager/development/tabs/TeamScenarioPanel", () => ({
  TeamScenarioPanel: () => <div data-testid="scenarios-panel" />,
}))

import MemberDevelopmentWorkspace from "../MemberDevelopmentWorkspace"

function dossier(): MemberDossier {
  return {
    memberId: "m-1",
    member: { name: "Pat Member", title: "Analyst", department: "Operations" },
    reconciledHeadline: "Steady finisher",
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

function LocationProbe() {
  return <span data-testid="location-search">{useLocation().search}</span>
}

function renderAt(path: string, computing = false) {
  dossierState = { data: computing ? null : dossier(), isLoading: false, isError: false }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/manager/development/:memberId" element={<MemberDevelopmentWorkspace />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const scrollIntoView = jest.fn()
const scrolledTo = () => scrollIntoView.mock.contexts.map((el) => (el as Element).id)

beforeEach(() => {
  jest.clearAllMocks()
  received.profile = undefined
  received.studio = undefined
  received.meridian = undefined
  received.notes = undefined
  Element.prototype.scrollIntoView = scrollIntoView
  mockServerText = {}
})

describe("MemberDevelopmentWorkspace — eleven sections in five groups (U4), Studio flag OFF", () => {
  it("the bar is the five groups and nothing else", async () => {
    renderAt("/manager/development/m-1")
    await screen.findByTestId("profile-panel")
    expect(screen.getAllByRole("tab").map((x) => x.textContent)).toEqual([
      "Profile",
      "Goals & Roadmap",
      "Gaps & Learning",
      "Career matches",
      "Conversations",
    ])
  })

  // The nine values every build offers. None may fall back to Profile except
  // the one that IS the profile.
  //   value, group tab, panel, first in its group
  const ALWAYS_ON = [
    ["profile", "Profile", "profile-panel", true],
    ["goals", "Goals & Roadmap", "goals-panel", true],
    ["roadmap", "Goals & Roadmap", "roadmap-panel", false],
    ["gaps", "Gaps & Learning", "gaps-panel", true],
    ["learning", "Gaps & Learning", "learning-panel", false],
    ["careers", "Career matches", "careers-panel", true],
    ["notes", "Conversations", "notes-panel", true],
    ["interviews", "Conversations", "interviews-panel", false],
  ] as const

  it.each(ALWAYS_ON)("?tab=%s opens %s at its section", async (value, group, panelId, first) => {
    renderAt(`/manager/development/m-1?tab=${value}`)
    const panel = await screen.findByTestId(panelId)
    const selected = screen.getAllByRole("tab").filter((x) => x.getAttribute("aria-selected") === "true")
    expect(selected.map((x) => x.textContent)).toEqual([group])
    expect(screen.getByTestId(`dev-section-${value}`)).toContainElement(panel)
    expect(scrolledTo()).toEqual(first ? [] : [`dev-section-${value}`])
    expect(received.meridian?.tab).toBe(value)
  })

  // The three Studio values have nothing to open in this build. `profile-studio`
  // lands on Profile, which is its group; `compare` and `scenarios` fall back to
  // it, as they did before U4. The rail is told "profile": it must never be
  // handed a section the page is not showing.
  it.each(["profile-studio", "compare", "scenarios"])("?tab=%s opens Profile", async (value) => {
    renderAt(`/manager/development/m-1?tab=${value}`)
    await screen.findByTestId("profile-panel")
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByTestId("studio-panel")).not.toBeInTheDocument()
    expect(screen.queryByTestId("compare-panel")).not.toBeInTheDocument()
    expect(screen.queryByTestId("scenarios-panel")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Write-up" })).not.toBeInTheDocument()
    expect(received.meridian?.tab).toBe("profile")
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("the eight rows above plus the three Studio values are the eleven", () => {
    const all = [...ALWAYS_ON.map((r) => r[0]), "profile-studio", "compare", "scenarios"]
    expect(new Set(all).size).toBe(11)
  })

  it("Profile holds the Behavioral Profile alone", async () => {
    renderAt("/manager/development/m-1")
    await screen.findByTestId("profile-panel")
    const shown = Array.from(screen.getByRole("tabpanel").querySelectorAll('[data-testid^="dev-section-"]')).map(
      (el) => el.getAttribute("data-testid"),
    )
    expect(shown).toEqual(["dev-section-profile"])
  })

  it("while the dossier computes: two groups, Goals and Notes usable", async () => {
    renderAt("/manager/development/m-1?tab=notes", true)
    expect(screen.getAllByRole("tab").map((x) => x.textContent)).toEqual(["Goals & Roadmap", "Conversations"])
    expect(await screen.findByTestId("notes-panel")).toBeInTheDocument()
    expect(screen.getByTestId("dev-section-interviews-waiting")).toBeInTheDocument()
    expect(screen.queryByTestId("meridian-panel")).not.toBeInTheDocument()
  })

  // Group labels are NEW keys (`dev.group.*`). A server text override written
  // for an old tab label keeps naming the section it named, and cannot rename
  // a group; a group is renamed only by its own key.
  it("a server override of an old tab label renames the section heading, not the group", async () => {
    mockServerText = { "dev.tab.profile": "PRISM overview" }
    renderAt("/manager/development/m-1")
    await screen.findByTestId("profile-panel")
    expect(screen.getByRole("heading", { name: "PRISM overview" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument()
  })

  it("a server override of a group key renames that group", async () => {
    mockServerText = { "dev.group.conversations": "Check-ins" }
    renderAt("/manager/development/m-1")
    await screen.findByTestId("profile-panel")
    expect(screen.getByRole("tab", { name: "Check-ins" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Conversations" })).not.toBeInTheDocument()
  })
})
