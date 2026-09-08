/**
 * Past interviews panel — package IS-C Lane B.
 *
 * The panel exists because a closed tab orphaned an in-progress session no
 * surface could reach. Its failure modes are all quiet ones: a load error that
 * reads as "you have never interviewed anyone", an org-scoped list that is
 * silently only your own, an abandon that reports success without acting.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PastInterviewsPanel from "../PastInterviewsPanel"
import { candidateLabel, formatWhen } from "../pastInterviewsFormat"
import type { LiveSessionSummary } from "@/services/interview/live.service"

const useLiveSessions = jest.fn()
const abandonMutate = jest.fn()

jest.mock("@/hooks/interview/useLiveSessions", () => ({
  useLiveSessions: (...a: unknown[]) => useLiveSessions(...a),
  useAbandonLiveSession: () => ({ mutateAsync: abandonMutate }),
}))

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    info: jest.fn(),
  },
}))

const SESSION = (over: Partial<LiveSessionSummary> = {}): LiveSessionSummary => ({
  id: "s-1",
  interviewer_sub: "sub-1",
  candidate_ref: { display_name: "Dana Reyes", candidate_hash: "abcdef1234567890" },
  requisition_label: "Regional Manager — North",
  frame: { roleTitle: "Regional Manager" } as LiveSessionSummary["frame"],
  status: "finalized",
  overall_score: 4.25,
  created_at: "2026-09-01T10:00:00Z",
  finalized_at: "2026-09-01T11:00:00Z",
  ...over,
})

const result = (over: Record<string, unknown> = {}) => ({
  data: { sessions: [SESSION()], total: 1, limit: 25, offset: 0, org_scope_applied: true, ...over },
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: jest.fn(),
})

const renderPanel = (props: Partial<React.ComponentProps<typeof PastInterviewsPanel>> = {}) =>
  render(
    <PastInterviewsPanel
      surface="live"
      onResume={props.onResume ?? jest.fn()}
      onReopen={props.onReopen ?? jest.fn()}
      busySessionId={props.busySessionId ?? null}
    />,
  )

beforeEach(() => {
  jest.clearAllMocks()
  useLiveSessions.mockReturnValue(result())
})

describe("PastInterviewsPanel", () => {
  it("lists a past interview with who, when, role and status", () => {
    renderPanel()
    expect(screen.getByText("Dana Reyes")).toBeInTheDocument()
    expect(screen.getByText(/Regional Manager — North/)).toBeInTheDocument()
    expect(screen.getByText("Finalized")).toBeInTheDocument()
  })

  it("offers Reopen for a finished interview and no Resume", () => {
    renderPanel()
    expect(screen.getByRole("button", { name: /reopen/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument()
  })

  it("offers Resume and Abandon for one still in progress", () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION({ status: "in_progress", overall_score: null })] }))
    renderPanel()
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /abandon/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /reopen/i })).not.toBeInTheDocument()
  })

  it("hands the chosen session id back to the parent", async () => {
    const onReopen = jest.fn()
    renderPanel({ onReopen })
    await userEvent.click(screen.getByRole("button", { name: /reopen/i }))
    expect(onReopen).toHaveBeenCalledWith("s-1")
  })

  it("says nothing has been run yet when the list is genuinely empty", () => {
    useLiveSessions.mockReturnValue(result({ sessions: [], total: 0 }))
    renderPanel()
    expect(screen.getByText(/haven't run any interviews yet/i)).toBeInTheDocument()
  })

  it("distinguishes a load FAILURE from an empty history", () => {
    useLiveSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("boom"),
      refetch: jest.fn(),
    })
    renderPanel()
    // The whole point: an error must not render as "you have no interviews".
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    expect(screen.queryByText(/haven't run any interviews yet/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })

  it("says the list is only your own when the token carried no organisation", () => {
    useLiveSessions.mockReturnValue(result({ org_scope_applied: false }))
    renderPanel()
    expect(screen.getByText(/did not carry an organisation/i)).toBeInTheDocument()
  })

  it("does not add that caveat when an org scope was applied", () => {
    renderPanel()
    expect(screen.queryByText(/did not carry an organisation/i)).not.toBeInTheDocument()
  })

  it("confirms before abandoning, and does nothing if the interviewer declines", async () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION({ status: "in_progress" })] }))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false)
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /abandon/i }))
    expect(abandonMutate).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("abandons once confirmed", async () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION({ status: "in_progress" })] }))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    abandonMutate.mockResolvedValue({ session: SESSION({ status: "abandoned" }) })
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /abandon/i }))
    await waitFor(() => expect(abandonMutate).toHaveBeenCalledWith("s-1"))
    confirmSpy.mockRestore()
  })

  it("reports a failed abandon instead of claiming success", async () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION({ status: "in_progress" })] }))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    abandonMutate.mockRejectedValue(new Error("already finalized"))
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /abandon/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("already finalized"))
    expect(toastSuccess).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe("candidateLabel", () => {
  it("uses the recorded name when there is one", () => {
    expect(candidateLabel(SESSION())).toBe("Dana Reyes")
  })

  it("falls back to the blind hash rather than a blank", () => {
    expect(
      candidateLabel(SESSION({ candidate_ref: { candidate_hash: "abcdef1234567890" } })),
    ).toBe("Candidate abcdef12")
  })

  it("says so when neither was recorded", () => {
    expect(candidateLabel(SESSION({ candidate_ref: {} }))).toBe("Candidate not recorded")
  })
})

describe("formatWhen", () => {
  it("admits a missing date rather than printing an epoch", () => {
    expect(formatWhen(null)).toBe("date not recorded")
    expect(formatWhen("not-a-date")).toBe("date not recorded")
  })
})
