/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
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
jest.mock("@/constants/development", () => ({
  ...jest.requireActual("@/constants/development"),
  TDS_STUDIO_ENABLED: true,
}))

/* ---- data hooks ---- */
let dossierState: { data: MemberDossier | null | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
}
const refreshMutate = jest.fn()
const shareMutate = jest.fn()
const sessionMutate = jest.fn()
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useMemberDossier: () => dossierState,
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
const received: { profile?: Captured; studio?: Captured; meridian?: Captured } = {}

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
jest.mock("@/components/manager/development/tabs/RoadmapTimeline", () => ({
  RoadmapTimeline: () => <div data-testid="roadmap-panel" />,
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

function renderAt(
  path: string,
  props: { audience?: "manager" | "practitioner" } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
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
  dossierState = { data: undefined, isLoading: true, isError: false }
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
  it("offers the Studio tabs when the flag is on, and an unknown ?tab= falls back to the profile", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=nonsense")
    await screen.findByTestId("profile-panel")
    expect(screen.getByRole("tab", { name: "Write-up" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Compare" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Scenarios" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Behavioral Profile" })).toHaveAttribute("aria-selected", "true")
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

  it("the profile tab's invite starts a goal session invite", async () => {
    dossierState = { data: dossier(), isLoading: false, isError: false }
    renderAt("/manager/development/m-1?tab=profile")
    fireEvent.click(await screen.findByRole("button", { name: "invite" }))
    expect(sessionMutate).toHaveBeenCalledWith("invite")
  })

  it("Refresh recomputes, Share reports, Export builds the PDF from the dossier", async () => {
    const d = dossier()
    dossierState = { data: d, isLoading: false, isError: false }
    shareMutate.mockImplementation((_v: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderAt("/manager/development/m-1")
    await screen.findByRole("heading", { name: "Gary Burnette" })
    fireEvent.click(screen.getByRole("button", { name: "Refresh dossier" }))
    expect(refreshMutate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Share with member" }))
    expect(toast.success).toHaveBeenCalledWith("Development plan shared with Gary Burnette.")
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    expect(exportDossierPdf).toHaveBeenCalledWith(d)
    expect(toast.success).toHaveBeenCalledWith("Dossier exported as PDF.")
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
