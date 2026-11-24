/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { MemberDossier } from "@/types/development"

// The workspace is a shell: it loads the dossier, picks a tab from `?tab=`,
// and hands each panel what it needs. The panels are probes here — what they
// RECEIVE is the contract, and for TDS-1b that contract is that the member's
// not-shared decision reaches every consumer, and that the ask goes out over
// the one consent endpoint with the member's id and the PRISM category.

/* ---- chrome ---- */
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

/* ---- the Studio tabs are ON for this suite (build-time flag, default off) ---- */
/* ---- 3.3a: the fit-engine matches flag is driven per test (default off) ---- */
let mockFitEngineFlag = false
jest.mock("@/constants/development", () => ({
  ...jest.requireActual("@/constants/development"),
  TDS_STUDIO_ENABLED: true,
  get FIT_ENGINE_MATCHES_ENABLED() {
    return mockFitEngineFlag
  },
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
const refreshMutate = jest.fn()
const shareMutate = jest.fn()
const sessionMutate = jest.fn()
const mockFitCalls: Array<[string | undefined, boolean]> = []
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useMemberDossier: () => dossierState,
    useMemberFitMatches: (id: string | undefined, enabled: boolean) => {
      mockFitCalls.push([id, enabled])
      return {
        data: enabled ? { state: "no_snapshot", matches: [], asOf: null, ageDays: null } : undefined,
        isLoading: false,
        isError: false,
      }
    },
    useRefreshDossier: () => ({ mutate: refreshMutate, isPending: false }),
    useSharePlan: () => ({ mutate: shareMutate, isPending: false }),
    useGoalSession: () => ({ mutate: sessionMutate, isPending: false }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
  }
})

/* ---- the consent ask ---- */
const requestStudentAccess = jest.fn()
jest.mock("@/services/manager/studentRoster.service", () => ({
  requestStudentAccess: (input: unknown) => requestStudentAccess(input),
}))

jest.mock("@/lib/dossierPdf", () => ({ exportDossierPdf: jest.fn() }))
import { exportDossierPdf } from "@/lib/dossierPdf"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))
import { toast } from "sonner"

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
import { ROUTES } from "@/constants/routes"

function dossier(over: Partial<MemberDossier> = {}): MemberDossier {
  return {
    memberId: "m-1",
    member: { name: "Gary Burnette", title: "CSM", department: "Success" },
    reconciledHeadline: "Structured innovator",
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
    ...over,
  }
}

/** What the page wrote to the URL: `?tab=` must stay one of the eleven section values. */
function LocationProbe() {
  return <span data-testid="location-search">{useLocation().search}</span>
}

function renderAt(
  path: string,
  props: { audience?: "manager" | "practitioner" } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/manager/development/:memberId" element={<MemberDevelopmentWorkspace {...props} />} />
          <Route path={ROUTES.MANAGER.DEVELOPMENT} element={<div>manager roster</div>} />
          <Route path={ROUTES.PRACTITIONER.DEVELOPMENT} element={<div>practitioner roster</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  received.profile = undefined
  received.studio = undefined
  received.meridian = undefined
  received.notes = undefined
  dossierState = { data: undefined, isLoading: true, isError: false }
  mockFitEngineFlag = false
  mockFitCalls.length = 0
  // jsdom has no layout and no scrollIntoView; the page guards for that, and
  // this stands in so a test can see WHICH section was scrolled to.
  Element.prototype.scrollIntoView = scrollIntoView
})

const scrollIntoView = jest.fn()
/** The ids of the elements scrolled to, in order. */
const scrolledTo = () => scrollIntoView.mock.contexts.map((el) => (el as Element).id)

describe("MemberDevelopmentWorkspace — Careers source (3.3a)", () => {
  it("flag off (the default): the dossier's matches panel, and the fit read stays disabled", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=careers")
    expect(await screen.findByTestId("careers-panel")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-engine-careers-panel")).not.toBeInTheDocument()
    expect(mockFitCalls.length).toBeGreaterThan(0)
    expect(mockFitCalls.every(([, enabled]) => enabled === false)).toBe(true)
  })

  it("flag on: the fit-engine panel, fed the member's block", async () => {
    mockFitEngineFlag = true
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=careers")
    expect(await screen.findByTestId("fit-engine-careers-panel")).toHaveTextContent("no_snapshot")
    expect(screen.queryByTestId("careers-panel")).not.toBeInTheDocument()
    expect(mockFitCalls).toContainEqual(["m-1", true])
  })
})

describe("MemberDevelopmentWorkspace — shell states", () => {
  it("shows skeletons, not a member, while loading", () => {
    renderAt("/manager/development/m-1")
    expect(screen.queryByText("Gary Burnette")).not.toBeInTheDocument()
    expect(screen.queryByTestId("meridian-panel")).not.toBeInTheDocument()
  })

  it("says the dossier is being generated while the compute job runs", () => {
    dossierState = { data: null, isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    expect(screen.getByText(/Generating the development dossier/i)).toBeInTheDocument()
  })

  it("renders the error, not an empty workspace, and offers the way back", () => {
    dossierState = { data: undefined, isLoading: false, isError: true }
    renderAt("/manager/development/m-1")
    expect(screen.getByText("Couldn't load this member's dossier.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Back to roster" }))
    expect(screen.getByText("manager roster")).toBeInTheDocument()
  })
})

describe("MemberDevelopmentWorkspace — not shared reaches every consumer (TDS-1b)", () => {
  it("the Behavioral Profile tab is told, by name, with the ask wired", async () => {
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    await screen.findByTestId("profile-panel")
    expect(received.profile).toMatchObject({ notShared: true, memberName: "Gary Burnette", requestSent: false })
    expect(received.profile?.noAccount).toBeUndefined()
    expect(typeof received.profile?.onRequestAccess).toBe("function")
  })

  it("the write-up tab is told, so it refuses before it reads the empty scores", async () => {
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile-studio")
    await screen.findByTestId("studio-panel")
    expect(received.studio).toMatchObject({ memberId: "m-1", memberName: "Gary Burnette", notShared: true })
  })

  it("Meridian is told, so it does not answer about scores it cannot see", async () => {
    dossierState = { data: dossier({ prismNotShared: true, goalsNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    await screen.findByTestId("profile-panel")
    expect(received.meridian).toMatchObject({
      memberId: "m-1",
      memberName: "Gary Burnette",
      prismNotShared: true,
      goalsNotShared: true,
      tab: "profile",
    })
  })

  it("no-account rides alongside, so the profile tab offers no ask to nobody", async () => {
    dossierState = { data: dossier({ prismNotShared: true, prismNoAccount: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    await screen.findByTestId("profile-panel")
    expect(received.profile).toMatchObject({ notShared: true, noAccount: true })
  })

  it("a shared dossier passes nothing of the sort", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile-studio")
    await screen.findByTestId("studio-panel")
    expect(received.studio?.notShared).toBeUndefined()
    expect(received.meridian?.prismNotShared).toBeUndefined()
  })
})

describe("MemberDevelopmentWorkspace — the ask", () => {
  it("goes out over the consent endpoint with the member's id and the PRISM category", async () => {
    requestStudentAccess.mockResolvedValue(undefined)
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(requestStudentAccess).toHaveBeenCalledTimes(1))
    expect(requestStudentAccess).toHaveBeenCalledWith({
      studentUserId: "m-1",
      categories: { prism: true },
      reason: expect.stringMatching(/Team Development Studio/),
    })
    await waitFor(() => expect(received.profile?.requestSent).toBe(true))
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/They decide/))
  })

  it("reports pending while the ask is in flight, and asking grants nothing", async () => {
    let settle: () => void = () => {}
    requestStudentAccess.mockReturnValue(new Promise<void>((r) => (settle = r)))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(received.profile?.requestPending).toBe(true))
    // Still withheld: the ask changes nothing about what the manager can see.
    expect(received.profile?.notShared).toBe(true)
    settle()
    await waitFor(() => expect(received.profile?.requestSent).toBe(true))
    expect(received.profile?.notShared).toBe(true)
  })

  it("a failed ask is not reported as sent", async () => {
    requestStudentAccess.mockRejectedValue(new Error("503"))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(requestStudentAccess).toHaveBeenCalled())
    await waitFor(() => expect(received.profile?.requestPending).toBe(false))
    expect(received.profile?.requestSent).toBe(false)
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("MemberDevelopmentWorkspace — tabs and header", () => {
  it("offers five groups plus the two Studio tabs when the flag is on, and an unknown ?tab= falls back to the profile", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=nonsense")
    await screen.findByTestId("profile-panel")
    expect(screen.getAllByRole("tab").map((x) => x.textContent)).toEqual([
      "Profile",
      "Goals & Roadmap",
      "Gaps & Learning",
      "Career matches",
      "Conversations",
      "Compare",
      "Scenarios",
    ])
    // The Write-up is a section of Profile now, not a tab of its own.
    expect(screen.queryByRole("tab", { name: "Write-up" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Write-up" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true")
    expect(received.meridian?.tab).toBe("profile")
  })

  it("renders the identity header from the dossier", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    expect(await screen.findByRole("heading", { name: "Gary Burnette" })).toBeInTheDocument()
    expect(screen.getByText("CSM · Success")).toBeInTheDocument()
    expect(screen.getByText("Structured innovator")).toBeInTheDocument()
    // The badge and the dot's screen-reader label both say it.
    expect(screen.getAllByText("High confidence").length).toBeGreaterThan(0)
  })

  // 2026-10-29: "+ Clifton" / "+ DISC" and the profile tab's "Send invite"
  // filed a Summit goals invite whichever framework was clicked, and nothing
  // reached the member. There is no Clifton or DISC invite, so none is offered.
  it("offers no framework invite: missing assessments say they are not on file", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    await screen.findByTestId("profile-panel")
    expect(received.profile?.onInvite).toBeUndefined()
    expect(screen.queryByTestId(/^coverage-.*-invite$/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "invite" }))
    expect(sessionMutate).not.toHaveBeenCalled()
  })

  it("a failed dossier job says so and offers a retry, instead of polling forever", async () => {
    const { DossierJobFailedError } = jest.requireActual("@/hooks/manager/development/useMemberDossier")
    const refetch = jest.fn()
    dossierState = {
      data: null, isLoading: false, isError: true,
      error: new DossierJobFailedError("Dossier generation failed — please retry."), refetch,
    }
    renderAt("/manager/development/m-1")
    expect(await screen.findByRole("alert")).toHaveTextContent("Dossier generation failed — please retry.")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalled()
  })

  it("renders the Meridian rail at every width, so a started conversation is visible", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByTestId("meridian-panel")
    expect(screen.getByTestId("meridian-rail").className).not.toMatch(/\bhidden\b/)
  })

  it("Refresh recomputes, Share reports, Export builds the PDF from the dossier", async () => {
    const d = dossier()
    dossierState = { data: d, isLoading: false, isError: false }
    shareMutate.mockImplementation((_v: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Gary Burnette" })
    fireEvent.click(screen.getByRole("button", { name: "Update" }))
    expect(refreshMutate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Share with member" }))
    expect(toast.success).toHaveBeenCalledWith("Development plan shared with Gary Burnette.")
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    expect(exportDossierPdf).toHaveBeenCalledWith(d)
    expect(toast.success).toHaveBeenCalledWith("Dossier exported as PDF.")
  })

  // OM-F3: the share toasts name the member from the same fixture the
  // heading uses, so no new literal name is added to this public repo.
  it.each([
    [{ notified: true, alreadySent: false }, "success", (n: string) => `Sent to ${n}'s notifications.`],
    [{ notified: false, alreadySent: true }, "success", (n: string) => `Already sent to ${n} today.`],
    [
      { notified: false, alreadySent: false },
      "warning",
      (n: string) => `Couldn't notify ${n}; their plan is still on their My Development page.`,
    ],
  ] as const)("Share says what the server did: %j", async (result, kind, text) => {
    const d = dossier()
    const who = d.member.name
    dossierState = { data: d, isLoading: false, isError: false }
    shareMutate.mockImplementation((_v: unknown, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(result),
    )
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: who })
    fireEvent.click(screen.getByRole("button", { name: "Share with member" }))
    expect(toast[kind]).toHaveBeenCalledWith(text(who))
    expect(toast.success).not.toHaveBeenCalledWith(`Development plan shared with ${who}.`)
  })

  it("a failed share says so", async () => {
    const d = dossier()
    dossierState = { data: d, isLoading: false, isError: false }
    shareMutate.mockImplementation((_v: unknown, opts: { onError: () => void }) => opts.onError())
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: d.member.name })
    fireEvent.click(screen.getByRole("button", { name: "Share with member" }))
    expect(toast.error).toHaveBeenCalledWith("Couldn't share the plan. Try again.")
  })

  it("a practitioner gets the practitioner chrome and a back-link they can reach", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1", { audience: "practitioner" })
    expect(await screen.findByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.queryByTestId("manager-layout")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Back to roster/i }))
    expect(screen.getByText("practitioner roster")).toBeInTheDocument()
  })
})

describe("MemberDevelopmentWorkspace — the ask that cannot succeed (TDS-1c part B)", () => {
  // `ux_svg_live_pair` is UNIQUE (student, grantee) WHERE status IN
  // ('pending','granted') and request_access INSERTs a pending row, so ANY live
  // grant for the pair rejects a PRISM ask. Measured 2026-09-16: 8/8 live grants
  // on staging-b and 7/7 on dev are goals-without-prism. The 409 is the NORMAL
  // path for every existing relationship, not a rare one — and until part B this
  // mutation had onSuccess alone, so all of it was silent.
  const conflict = (detail: unknown) =>
    Object.assign(new Error("Request failed with status code 409"), {
      response: { status: 409, data: { detail, code: "grant_live" } },
    })

  it("renders the server's reason instead of saying nothing", async () => {
    const primary =
      "They already share their goals with you. Ask them to turn on PRISM profile on their Sharing page — a new request cannot be opened while a grant is live."
    requestStudentAccess.mockRejectedValue(conflict(primary))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(primary))
    // and it must NOT claim the ask went out
    expect(toast.success).not.toHaveBeenCalled()
    expect(received.profile?.requestSent).not.toBe(true)
  })

  it("never claims the ask was sent when it was refused", async () => {
    requestStudentAccess.mockRejectedValue(conflict("You have already asked; they have not answered yet."))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
  })

  // The trap apiErrorMessage exists for: FastAPI sends `detail` as a STRING for a
  // raised HTTPException and an ARRAY OF OBJECTS for a 422. Handing that array to
  // sonner renders an object as a React child — React #31 — which once took the
  // whole page down on a failed save. A toast must always receive a string.
  it("renders a STRING when the server sends a 422 validation list, never an object", async () => {
    requestStudentAccess.mockRejectedValue(
      Object.assign(new Error("Unprocessable"), {
        response: {
          status: 422,
          data: { detail: [{ type: "string_type", loc: ["body", "categories"], msg: "Input should be a valid string" }] },
        },
      }),
    )
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const arg = (toast.error as jest.Mock).mock.calls[0][0]
    expect(typeof arg).toBe("string")
    expect(arg).toMatch(/categories/)
  })

  it("falls back to honest copy when the error carries no detail at all", async () => {
    requestStudentAccess.mockRejectedValue(Object.assign(new Error(""), { response: { status: 500, data: {} } }))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const arg = (toast.error as jest.Mock).mock.calls[0][0]
    expect(typeof arg).toBe("string")
    expect(arg).toMatch(/nothing was asked/i)
  })
})

describe("MemberDevelopmentWorkspace — the 409 contract, and what it does NOT depend on", () => {
  // Contract (TDS-1c part B, final 2026-09-16): a 409 over a live pair carries
  // {detail, code, live, asked, grantId}. The pre-existing GENERIC 409 — the race
  // fallback — carries `detail` only, with NO `code`. This client therefore reads
  // `detail` and nothing else: every coded reason and the uncoded fallback render
  // identically, and a change to code/live/asked/grantId cannot break it.
  const conflict409 = (data: Record<string, unknown>) =>
    Object.assign(new Error("Request failed with status code 409"), {
      response: { status: 409, data },
    })

  it.each([
    ["grant_live", "They already share their goals with you. Ask them to turn on PRISM profile on their Sharing page - a new request cannot be opened while a grant is live."],
    ["request_open", "You have already asked to see their PRISM profile; they have not answered yet. Asking again would not reach them sooner."],
    ["already_granted", "They already share their PRISM profile with you - there is nothing to ask for."],
  ])("renders the server's sentence for code %s", async (code, detail) => {
    requestStudentAccess.mockRejectedValue(
      conflict409({ detail, code, live: { goals: true }, asked: { prism: true }, grantId: "g-1" }),
    )
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(detail))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("renders the uncoded race fallback too — `code` is optional, and is never read", async () => {
    const detail = "There is already an open request or an active grant for this student."
    requestStudentAccess.mockRejectedValue(conflict409({ detail }))
    dossierState = { data: dossier({ prismNotShared: true }), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "ask" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(detail))
  })
})

describe('MemberDevelopmentWorkspace — the "ask Meridian" header button (TDS-4b)', () => {
  // It was `setTab("goals")` and nothing else, so the one thing the label
  // promised was the one thing it did not do. The shell's job is to ask the rail
  // for an opening turn; the rail owns the send, and the grounding lives in one
  // server module, not here.
  it("asks the Meridian rail for an opening turn, and opens the goals tab", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Gary Burnette" })
    expect(received.meridian?.seedRequest).toBe(0)
    fireEvent.click(screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" }))
    await waitFor(() => expect(received.meridian?.seedRequest).toBe(1))
    expect(received.meridian?.tab).toBe("goals")
  })

  it("asks again on a second press — one request per press", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Gary Burnette" })
    const button = screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" })
    fireEvent.click(button)
    await waitFor(() => expect(received.meridian?.seedRequest).toBe(1))
    fireEvent.click(button)
    await waitFor(() => expect(received.meridian?.seedRequest).toBe(2))
  })

  it("still hands the rail the member it must be grounded in", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Gary Burnette" })
    fireEvent.click(screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" }))
    await waitFor(() => expect(received.meridian?.seedRequest).toBe(1))
    expect(received.meridian).toMatchObject({ memberId: "m-1", memberName: "Gary Burnette" })
  })
})

describe("MemberDevelopmentWorkspace — plain wording in the header (U1)", () => {
  // Each test pins one renamed label on the page that shows it, and that the
  // old wording is gone. Wording only: what each button does is covered above.
  // An invented person — this repo is public.
  const invented = { member: { name: "Dana Whitfield", title: "Service Designer", department: "Experience" } }
  const withEvents = () =>
    dossier({ ...invented, events: [{ agent: "Example agent", eventType: "plan shared" }] })

  it('the recompute button reads "Update", not "Refresh dossier"', async () => {
    dossierState = { data: dossier(invented), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Dana Whitfield" })
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /refresh dossier/i })).not.toBeInTheDocument()
  })

  it('the activity popover opens from "Recent activity", not "Provenance"', async () => {
    dossierState = { data: withEvents(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Dana Whitfield" })
    expect(screen.getByRole("button", { name: "Recent activity" })).toBeInTheDocument()
    expect(screen.queryByText(/provenance/i)).not.toBeInTheDocument()
  })

  it("the conversation button says it opens Goals and asks Meridian about this person", async () => {
    dossierState = { data: dossier(invented), isLoading: false, isError: false }
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Dana Whitfield" })
    const button = screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" })
    expect(button.textContent).toMatch(/Goals/)
    expect(button.textContent).toMatch(/Meridian/)
    expect(screen.queryByRole("button", { name: /start growth conversation/i })).not.toBeInTheDocument()
  })

  it("reads the same on the practitioner mount", async () => {
    dossierState = { data: withEvents(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1", { audience: "practitioner" })
    await screen.findByRole("heading", { name: "Dana Whitfield" })
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Recent activity" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" }),
    ).toBeInTheDocument()
  })
})

describe("MemberDevelopmentWorkspace — the Notes tab (TDS-2)", () => {
  it("offers the tab, and hands the panel the member plus what a note may point at", async () => {
    const d = dossier()
    dossierState = { data: d, isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=notes")
    expect(await screen.findByTestId("notes-panel")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Conversations" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument()
    expect(received.notes).toMatchObject({
      memberId: "m-1",
      memberName: "Gary Burnette",
      goals: d.goals,
      milestones: d.milestones,
    })
  })

  it("tells the rail which tab is open, so its prompts are not a blank list", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=notes")
    await screen.findByTestId("notes-panel")
    expect(received.meridian?.tab).toBe("notes")
  })
})

describe("MemberDevelopmentWorkspace — while the dossier computes (TDS-P1 c)", () => {
  function renderComputing(path: string, roster?: Array<{ memberId: string; name: string }>) {
    dossierState = { data: null, isLoading: false, isError: false }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    if (roster) client.setQueryData(["development", "roster"], roster)
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/manager/development/:memberId" element={<MemberDevelopmentWorkspace />} />
            <Route path={ROUTES.MANAGER.DEVELOPMENT} element={<div>manager roster</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it("offers only the groups with a section that needs no dossier, and keeps the rail away", () => {
    renderComputing("/manager/development/m-1")
    const tabs = screen.getAllByRole("tab").map((x) => x.textContent)
    expect(tabs).toEqual(["Goals & Roadmap", "Conversations", "Compare", "Scenarios"])
    expect(screen.getByRole("status")).toHaveTextContent(/Generating the development dossier/)
    expect(screen.queryByTestId("meridian-panel")).not.toBeInTheDocument()
  })

  it("the default tab is not on offer, so it says so instead of rendering it", () => {
    renderComputing("/manager/development/m-1?tab=profile")
    expect(screen.queryByTestId("profile-panel")).not.toBeInTheDocument()
    expect(screen.getByText(/This tab needs the dossier/)).toBeInTheDocument()
  })

  // U4: Goals shares its group with Roadmap, and Notes with Interviews. The
  // half that needs the dossier says so under its own heading; the half that
  // does not is usable, which is the point of TDS-P1 (c).
  it.each([
    ["goals", "goals-panel", "Goals & Roadmap", "roadmap"],
    ["notes", "notes-panel", "Conversations", "interviews"],
    ["compare", "compare-panel", "Compare", null],
    ["scenarios", "scenarios-panel", "Scenarios", null],
  ])("?tab=%s works now", async (tab, testId, group, waiting) => {
    renderComputing(`/manager/development/m-1?tab=${tab}`)
    const panel = await screen.findByTestId(testId)
    expect(screen.getByTestId(`dev-section-${tab}`)).toContainElement(panel)
    expect(screen.getByRole("tab", { name: group })).toHaveAttribute("aria-selected", "true")
    if (waiting) {
      expect(screen.getByTestId(`dev-section-${waiting}-waiting`)).toHaveTextContent(/needs the dossier/)
      expect(screen.queryByTestId(`${waiting}-panel`)).not.toBeInTheDocument()
    } else {
      expect(screen.queryByText(/needs the dossier/)).not.toBeInTheDocument()
    }
  })

  it.each([
    ["roadmap", "Goals & Roadmap", "goals-panel"],
    ["interviews", "Conversations", "notes-panel"],
  ])("?tab=%s opens its group: the other section works, this one waits", async (tab, group, working) => {
    renderComputing(`/manager/development/m-1?tab=${tab}`)
    expect(await screen.findByTestId(working)).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: group })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId(`dev-section-${tab}-waiting`)).toBeInTheDocument()
    expect(scrolledTo()).toEqual([`dev-section-${tab}`])
  })

  it.each(["gaps", "learning", "careers", "profile-studio"])(
    "?tab=%s has no group to open yet, so it says so",
    (tab) => {
      renderComputing(`/manager/development/m-1?tab=${tab}`)
      expect(screen.getByText(/This tab needs the dossier/)).toBeInTheDocument()
      expect(screen.getAllByRole("tab").every((x) => x.getAttribute("aria-selected") === "false")).toBe(true)
    },
  )

  it("Notes gets the member and nothing to point at yet", async () => {
    renderComputing("/manager/development/m-1?tab=notes", [{ memberId: "m-1", name: "Pat Member" }])
    await screen.findByTestId("notes-panel")
    expect(received.notes).toMatchObject({ memberId: "m-1", memberName: "Pat Member" })
    expect(received.notes?.goals).toBeUndefined()
    expect(received.notes?.milestones).toBeUndefined()
  })

  it("names the member from the roster cache, and says 'This member' without one", () => {
    const { unmount } = renderComputing("/manager/development/m-1", [
      { memberId: "m-2", name: "Someone Else" },
      { memberId: "m-1", name: "Pat Member" },
    ])
    expect(screen.getByRole("heading", { name: "Pat Member" })).toBeInTheDocument()
    unmount()
    renderComputing("/manager/development/m-1")
    expect(screen.getByRole("heading", { name: "This member" })).toBeInTheDocument()
  })

  it("clicking a tab moves ?tab= so it stays open when the dossier lands", async () => {
    renderComputing("/manager/development/m-1")
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Goals & Roadmap" }))
    expect(await screen.findByTestId("goals-panel")).toBeInTheDocument()
    expect(screen.getByTestId("location-search")).toHaveTextContent("?tab=goals")
  })

  it("the way back works while it computes", () => {
    renderComputing("/manager/development/m-1")
    fireEvent.click(screen.getByRole("button", { name: "Back to roster" }))
    expect(screen.getByText("manager roster")).toBeInTheDocument()
  })
})

describe("MemberDevelopmentWorkspace — eleven sections in five groups (U4), Studio flag ON", () => {
  // `?tab=` keeps its eleven values; each names a SECTION, and the tab shown is
  // the section's group. One row per value, so a mapping that goes missing is
  // named by the row that fails.
  //   value, group tab, the panel that must be inside the section, heading, first in its group
  const ELEVEN = [
    ["profile", "Profile", "profile-panel", "Behavioral Profile", true],
    ["profile-studio", "Profile", "studio-panel", "Write-up", false],
    ["goals", "Goals & Roadmap", "goals-panel", "Goals", true],
    ["roadmap", "Goals & Roadmap", "roadmap-panel", "Roadmap", false],
    ["gaps", "Gaps & Learning", "gaps-panel", "Gap Analysis", true],
    ["learning", "Gaps & Learning", "learning-panel", "Learning & Training", false],
    ["careers", "Career matches", "careers-panel", "Career & Job Matches", true],
    ["notes", "Conversations", "notes-panel", "Notes", true],
    ["interviews", "Conversations", "interviews-panel", "Interviews", false],
    ["compare", "Compare", "compare-panel", null, true],
    ["scenarios", "Scenarios", "scenarios-panel", null, true],
  ] as const

  it.each(ELEVEN)(
    "?tab=%s opens %s and shows its section",
    async (value, group, panelId, heading, first) => {
      dossierState = { data: dossier(), isLoading: false, isError: false }
      renderAt(`/manager/development/m-1?tab=${value}`)
      const panel = await screen.findByTestId(panelId)
      // its group is the selected tab, and no other
      const selected = screen.getAllByRole("tab").filter((x) => x.getAttribute("aria-selected") === "true")
      expect(selected.map((x) => x.textContent)).toEqual([group])
      // the section exists under a stable id, inside the open group, holding its panel
      const section = screen.getByTestId(`dev-section-${value}`)
      expect(section).toHaveAttribute("id", `dev-section-${value}`)
      expect(screen.getByRole("tabpanel")).toContainElement(section)
      expect(section).toContainElement(panel)
      if (heading) expect(section).toContainElement(screen.getByRole("heading", { name: heading }))
      // a section below the top of its group is scrolled to; the top one is not
      expect(scrolledTo()).toEqual(first ? [] : [`dev-section-${value}`])
      // the URL is left alone
      expect(screen.getByTestId("location-search")).toHaveTextContent(`?tab=${value}`)
    },
  )

  it.each(ELEVEN)("?tab=%s: the Meridian rail is told the SECTION, never the group", async (value, _group, panelId) => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt(`/manager/development/m-1?tab=${value}`)
    await screen.findByTestId(panelId)
    expect(received.meridian?.tab).toBe(value)
  })

  it("covers exactly the eleven values, each once", () => {
    expect(new Set(ELEVEN.map((r) => r[0])).size).toBe(11)
  })

  it.each([
    ["Profile", ["dev-section-profile", "dev-section-profile-studio"]],
    ["Goals & Roadmap", ["dev-section-goals", "dev-section-roadmap"]],
    ["Gaps & Learning", ["dev-section-gaps", "dev-section-learning"]],
    ["Career matches", ["dev-section-careers"]],
    ["Conversations", ["dev-section-notes", "dev-section-interviews"]],
    ["Compare", ["dev-section-compare"]],
    ["Scenarios", ["dev-section-scenarios"]],
  ])("clicking %s shows its sections in order and writes its FIRST section to ?tab=", async (group, sections) => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    // start somewhere that is none of the group's own sections
    const start = group === "Career matches" ? "notes" : "careers"
    renderAt(`/manager/development/m-1?tab=${start}`)
    await screen.findByTestId(`dev-section-${start}`)
    fireEvent.mouseDown(screen.getByRole("tab", { name: group }))
    await waitFor(() => expect(screen.getByRole("tab", { name: group })).toHaveAttribute("aria-selected", "true"))
    const shown = Array.from(screen.getByRole("tabpanel").querySelectorAll('[data-testid^="dev-section-"]')).map(
      (el) => el.getAttribute("data-testid"),
    )
    expect(shown).toEqual(sections)
    const first = sections[0].replace("dev-section-", "")
    expect(screen.getByTestId("location-search")).toHaveTextContent(`?tab=${first}`)
    expect(received.meridian?.tab).toBe(first)
    // opening a group lands at its top
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("only the open group's panels are mounted", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=goals")
    await screen.findByTestId("goals-panel")
    expect(await screen.findByTestId("roadmap-panel")).toBeInTheDocument()
    for (const other of ["profile-panel", "studio-panel", "gaps-panel", "learning-panel", "careers-panel", "notes-panel", "interviews-panel"]) {
      expect(screen.queryByTestId(other)).not.toBeInTheDocument()
    }
  })

  it('the "ask Meridian" header button still writes ?tab=goals', async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=interviews")
    await screen.findByTestId("interviews-panel")
    fireEvent.click(screen.getByRole("button", { name: "Open Goals and ask Meridian about this person" }))
    await screen.findByTestId("goals-panel")
    expect(screen.getByTestId("location-search")).toHaveTextContent("?tab=goals")
    expect(screen.getByRole("tab", { name: "Goals & Roadmap" })).toHaveAttribute("aria-selected", "true")
  })
})
