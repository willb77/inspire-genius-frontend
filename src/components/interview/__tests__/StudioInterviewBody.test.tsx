/**
 * StudioInterviewBody — the Interview Studio's 3-phase shell.
 *
 * Package IS-9 of docs/plans/Three_Studios_Completion_Build_Plan.md. 515 lines
 * at 0% coverage, forked from LiveInterviewBody and since diverged: its own
 * participant form, the StudioQuestionBuilder setup step, `frame.kind` banding,
 * the advisory narrative from finalize, and the provenance notices.
 *
 * The shared pipeline (consent gate, submit-then-rate, guarded finish, export)
 * is covered in LiveInterviewBody.test.tsx and is not re-asserted line for line
 * here. What IS asserted here is everything the two do DIFFERENTLY — that is
 * where a fork rots, and Feeds Phase 5b/6 and package IS-2 all land on this
 * file's setup step.
 *
 * The provenance block gets the most attention on purpose. It exists so a run
 * can never hide which curated framework framed the questions, nor the fact
 * that a requested role rewrite silently did not happen — the second one used
 * to read exactly like a role that simply was not very specific.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const createMutate = jest.fn()
const submitMutate = jest.fn()
const scoreMutate = jest.fn()
const finalizeMutate = jest.fn()
const toastError = jest.fn()

// ── IS-C Lane B ──────────────────────────────────────────────────
// The setup screen now mounts PastInterviewsPanel, which reads the sessions
// list. Mocked here rather than wrapped in a QueryClientProvider: the panel has
// its own suite, and these tests are about this component.
const useLiveSessions = jest.fn()
const abandonMutate = jest.fn()
const getSession = jest.fn()

jest.mock("@/hooks/interview/useLiveSessions", () => ({
  useLiveSessions: (...a: unknown[]) => useLiveSessions(...a),
  useAbandonLiveSession: () => ({ mutateAsync: abandonMutate }),
}))

jest.mock("@/services/interview/live.service", () => {
  const actual = jest.requireActual("@/services/interview/live.service")
  return {
    ...actual,
    liveInterviewService: { ...actual.liveInterviewService, getSession: (...a: unknown[]) => getSession(...a) },
  }
})

const EMPTY_SESSIONS = {
  data: { sessions: [], total: 0, limit: 25, offset: 0, org_scope_applied: true },
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: jest.fn(),
}

jest.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: jest.fn() },
}))

jest.mock("@/hooks/interview/useLiveInterview", () => ({
  useCreateLiveSession: () => ({ mutateAsync: createMutate, isPending: false }),
  useSubmitLiveAnswer: () => ({ mutateAsync: submitMutate, isPending: false }),
  useScoreLiveAnswer: () => ({ mutateAsync: scoreMutate, isPending: false }),
  useFinalizeLiveSession: () => ({ mutateAsync: finalizeMutate, isPending: false }),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Interviewer One", email: "i@example.test" } }),
}))

jest.mock("@/components/interview/ConsentGate", () => ({
  __esModule: true,
  default: ({ onProceed }: { onProceed: (c: unknown) => void }) => (
    <button onClick={() => onProceed({ captured: true, mode: "no_audio", method: "in_app_ack" })}>
      mock-consent-proceed
    </button>
  ),
}))

/** The builder hands back a frame; `kind` decides how findings are worded. */
let builderFrame: Record<string, unknown> = { mode: "custom", kind: "hiring", roleTitle: "Ops Lead", company: "Acme" }
jest.mock("@/components/interview/StudioQuestionBuilder", () => ({
  __esModule: true,
  default: ({ onConfirm }: { onConfirm: (f: unknown) => void }) => (
    <button onClick={() => onConfirm(builderFrame)}>mock-questions-confirm</button>
  ),
}))

jest.mock("@/components/interview/AnswerScorePanel", () => ({
  __esModule: true,
  default: ({
    question,
    number,
    total,
    onSubmitAnswer,
    onSaveScore,
  }: {
    question: { question: string }
    number: number
    total: number
    onSubmitAnswer: (t: string) => void
    onSaveScore: (s: number, n: string) => void
  }) => (
    <div>
      <p>{`panel ${number}/${total}: ${question.question}`}</p>
      <button onClick={() => onSubmitAnswer("the captured answer")}>mock-submit-answer</button>
      <button onClick={() => onSaveScore(5, "excellent")}>mock-save-score</button>
    </div>
  ),
}))

jest.mock("@/services/interview/interviewExport", () => ({
  downloadScoredInterview: jest.fn(),
  saveScoredInterviewToDocuments: jest.fn(),
}))

import StudioInterviewBody from "../StudioInterviewBody"

const PLAN = [{ competency_id: "q1", section: "warm_up", question: "What drew you here?" }]

const BASE_FINALIZE = {
  session: { session_id: "s1" },
  answers: [],
  section_scores: { warm_up: { mean: 5 } },
  overall_score: 5,
  overall_mean: 5,
  recommendation: "Advance",
}

async function reachInterview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("mock-consent-proceed"))
  await user.type(screen.getByLabelText(/^name$/i), "Participant A")
  await user.click(screen.getByRole("button", { name: /continue/i }))
  await user.click(screen.getByText("mock-questions-confirm"))
}

beforeEach(() => {
  jest.clearAllMocks()
  builderFrame = { mode: "custom", kind: "hiring", roleTitle: "Ops Lead", company: "Acme" }
  createMutate.mockResolvedValue({ session_id: "s1", plan: PLAN })
  submitMutate.mockResolvedValue({ answer_id: "a1", suggested_score: 4, star_evidence: null })
  scoreMutate.mockResolvedValue({ answer_id: "a1", final_score: 5, interviewer_notes: "excellent" })
  useLiveSessions.mockReturnValue(EMPTY_SESSIONS)
  finalizeMutate.mockResolvedValue(BASE_FINALIZE)
})

describe("setup — its own participant step, not the live candidate form", () => {
  it("gates on consent, then asks who the interview is with", async () => {
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    expect(screen.getByRole("heading", { name: /interview studio/i })).toBeInTheDocument()
    expect(screen.queryByText("mock-questions-confirm")).not.toBeInTheDocument()

    await user.click(screen.getByText("mock-consent-proceed"))
    expect(screen.getByText(/who is this interview with\?/i)).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("refuses an empty name with the Studio's own message", async () => {
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await user.click(screen.getByText("mock-consent-proceed"))
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(await screen.findByText(/a name is required/i)).toBeInTheDocument()
  })

  it("trims the reference id away when it is blank rather than sending an empty string", async () => {
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: { display_name: "Participant A", external_id: undefined },
      }),
    )
  })

  it("stays on the builder when the session cannot be created", async () => {
    createMutate.mockRejectedValue(new Error("nope"))
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not start/i)))
    expect(screen.getByText("mock-questions-confirm")).toBeInTheDocument()
  })
})

describe("provenance — the two things a run must never hide", () => {
  it("names the curated framework and prints its disclaimer", async () => {
    createMutate.mockResolvedValue({
      session_id: "s1",
      plan: PLAN,
      employer: {
        kind: "employer",
        slug: "acme",
        name: "Acme",
        framework: "Leadership Principles",
        provenance: "Publicly published framework, used nominatively.",
      },
      tailoring: null,
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)

    const block = await screen.findByTestId("studio-employer-provenance")
    expect(block).toHaveTextContent("Framed on Acme — Leadership Principles")
    expect(block).toHaveTextContent("Publicly published framework, used nominatively.")
  })

  it("says out loud that a requested role rewrite did not happen", async () => {
    createMutate.mockResolvedValue({
      session_id: "s1",
      plan: PLAN,
      employer: null,
      tailoring: { requested: true, applied: false, reason: "tailoring_error" },
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)

    const notice = await screen.findByTestId("studio-tailoring-notice")
    expect(notice).toHaveTextContent(/not.*rewritten for the role/i)
    // Announced, not merely styled — this is the whole point of the notice.
    expect(notice).toHaveAttribute("role", "status")
  })

  it("stays silent when tailoring was never requested, and when it worked", async () => {
    createMutate.mockResolvedValue({
      session_id: "s1",
      plan: PLAN,
      employer: null,
      tailoring: { requested: true, applied: true, reason: null },
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    expect(screen.queryByTestId("studio-tailoring-notice")).not.toBeInTheDocument()
    expect(screen.queryByTestId("studio-employer-provenance")).not.toBeInTheDocument()
  })

  it("does not raise the notice for a deliberate custom-mode run", async () => {
    // "custom_mode_not_tailored" is a choice, not a failure — warning about it
    // would train interviewers to ignore the banner that does matter.
    createMutate.mockResolvedValue({
      session_id: "s1",
      plan: PLAN,
      employer: null,
      tailoring: { requested: true, applied: false, reason: "custom_mode_not_tailored" },
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    expect(screen.queryByTestId("studio-tailoring-notice")).not.toBeInTheDocument()
  })
})

describe("findings — banding and the advisory narrative", () => {
  async function finish(user: ReturnType<typeof userEvent.setup>) {
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalled())
    await user.click(screen.getByText("mock-save-score"))
    await user.click(await screen.findByRole("button", { name: /finish & view results/i }))
  }

  it("says 'What the evidence shows' for a selection interview", async () => {
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText("What the evidence shows")).toBeInTheDocument()
    expect(screen.queryByText("Overall assessment")).not.toBeInTheDocument()
  })

  it("says 'Overall assessment' when the interview is not a hiring decision", async () => {
    // Wording a coaching or discovery conversation as a hiring recommendation
    // is how a development session turns into a selection record.
    builderFrame = { mode: "custom", kind: "coaching", roleTitle: "Ops Lead" }
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText("Overall assessment")).toBeInTheDocument()
    expect(screen.queryByText("What the evidence shows")).not.toBeInTheDocument()
  })

  it("shows the narrative when the backend generated one", async () => {
    finalizeMutate.mockResolvedValue({
      ...BASE_FINALIZE,
      feedback: {
        generated: true,
        summary: "Clear and structured throughout.",
        strengths: ["Named the constraint"],
        development_areas: ["Quantify the result"],
        per_section: { warm_up: "Warmed up quickly" },
      },
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText("Clear and structured throughout.")).toBeInTheDocument()
    expect(screen.getByText("Named the constraint")).toBeInTheDocument()
    expect(screen.getByText("Quantify the result")).toBeInTheDocument()
    expect(screen.getByText(/warmed up quickly/i)).toBeInTheDocument()
  })

  it("omits the narrative — and still shows the score — when synthesis failed", async () => {
    // The narrative is fail-open and NEVER part of the deterministic score.
    // `generated: false` must degrade to no narrative, not to no results.
    finalizeMutate.mockResolvedValue({
      ...BASE_FINALIZE,
      feedback: { generated: false, summary: "", strengths: [], development_areas: [], per_section: {} },
    })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText("What the evidence shows")).toBeInTheDocument()
    expect(screen.getByText("Advance")).toBeInTheDocument()
    expect(screen.getByText("Section scores")).toBeInTheDocument()
  })

  it("renders section scores from the backend's OBJECT shape, humanised", async () => {
    // Two things at once: `section_scores.map is not a function` white-screened
    // the findings once, and the raw key `warm_up` is displayed as "warm up"
    // while `per_section` stays keyed on the RAW id — mixing those up silently
    // drops every per-section note.
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText("warm up")).toBeInTheDocument()
    expect(screen.queryByText("warm_up")).not.toBeInTheDocument()
  })

  it("says no section scores were recorded rather than showing an empty card", async () => {
    finalizeMutate.mockResolvedValue({ ...BASE_FINALIZE, section_scores: null })
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await finish(user)
    expect(await screen.findByText(/no section scores were recorded/i)).toBeInTheDocument()
  })
})

/**
 * The Studio is a FORK of LiveInterviewBody, so the pipeline it inherited is
 * asserted here too — not because the behaviour is novel, but because a fork
 * that is never exercised is the one that quietly drifts from its origin.
 */
describe("the inherited pipeline still works in the fork", () => {
  it("requires the rating, not just the submission, before advancing", async () => {
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")

    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: /finish & view results/i })).not.toBeInTheDocument()

    await user.click(screen.getByText("mock-save-score"))
    expect(await screen.findByRole("button", { name: /finish & view results/i })).toBeInTheDocument()
    expect(screen.getByText(/1\/1 scored · avg 5\.00/i)).toBeInTheDocument()
  })

  it("keeps the tally honest when the rating PATCH fails", async () => {
    scoreMutate.mockRejectedValue(new Error("nope"))
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalled())

    await user.click(screen.getByText("mock-save-score"))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not save that rating/i)))
    expect(screen.getByText(/0\/1 scored/i)).toBeInTheDocument()
  })

  it("confirms before ending on an unsaved answer, and does not finalize when declined", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")

    await user.click(screen.getByRole("button", { name: /end interview/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(finalizeMutate).not.toHaveBeenCalled()
    expect(screen.getByText("panel 1/1: What drew you here?")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  /**
   * IS-F13 FIXED (package IS-4). Replaces the pin that recorded the defect:
   * `finish()` set the phase to "findings" before awaiting finalize, so a
   * rejection left "Compiling the scored write-up…" spinning forever while the
   * toast that reported it vanished.
   *
   * The pin was written to FAIL when the bug was fixed, and it did — in this
   * body and the Live one together, which is what stopped a Live-only fix
   * reading as done. Keep BOTH of these; they are the only thing that catches
   * a future fix landing on one fork and not the other.
   */
  it("shows a recoverable error instead of a spinner that never resolves (IS-F13)", async () => {
    finalizeMutate.mockRejectedValueOnce(new Error("upstream exploded"))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    await user.click(screen.getByRole("button", { name: /end interview/i }))

    expect(await screen.findByText(/could not be compiled/i)).toBeInTheDocument()
    expect(screen.getByText("upstream exploded")).toBeInTheDocument()
    // The spinner must be GONE, not merely accompanied by an error.
    expect(screen.queryByText(/compiling the scored write-up/i)).not.toBeInTheDocument()
    expect(screen.getByText(/nothing was lost/i)).toBeInTheDocument()

    finalizeMutate.mockResolvedValueOnce(BASE_FINALIZE)
    await user.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText("What the evidence shows")).toBeInTheDocument()
    expect(screen.queryByText(/could not be compiled/i)).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("'New interview' clears the participant and the results", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await screen.findByText("What the evidence shows")

    await user.click(screen.getByRole("button", { name: /new interview/i }))
    expect(screen.getByText("mock-consent-proceed")).toBeInTheDocument()
    expect(screen.queryByText("What the evidence shows")).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("offers the three exports once there is a result to export", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<StudioInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/1: What drew you here?")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await screen.findByText("What the evidence shows")

    expect(screen.getByRole("button", { name: /word/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /pdf/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})

/**
 * IS-C Lane B in the fork. Same reason the IS-F13 pin lives in both files: the
 * two bodies were forked verbatim, resume and reopen were added to both in one
 * change, and only a test in each catches the next fix landing on one of them.
 */
describe("past interviews — resume and reopen (fork)", () => {
  const LIST = (over: Record<string, unknown> = {}) => ({
    data: {
      sessions: [
        {
          id: "s-old",
          interviewer_sub: "sub-1",
          candidate_ref: { display_name: "Participant A", candidate_hash: "abcdef1234567890" },
          frame: { roleTitle: "Ops Lead" },
          status: "in_progress",
          created_at: "2026-09-01T10:00:00Z",
          ...over,
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
      org_scope_applied: true,
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })

  const DETAIL = (over: Record<string, unknown> = {}) => ({
    session: {
      session_id: "s-old",
      frame: { roleTitle: "Ops Lead", company: "Acme" },
      candidate: { display_name: "Participant A" },
      consent: { captured: true, mode: "no_audio" },
      status: "in_progress",
    },
    plan: PLAN,
    answers: [],
    status: "in_progress",
    section_scores: null,
    overall_score: null,
    recommendation: null,
    candidate_ref: { display_name: "Participant A", candidate_hash: "abcdef1234567890" },
    ...over,
  })

  it("resumes an unfinished Studio interview at its first unanswered question", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST())
    getSession.mockResolvedValue(DETAIL())
    render(<StudioInterviewBody />)

    await user.click(screen.getByRole("button", { name: /resume/i }))

    expect(await screen.findByText("panel 1/1: What drew you here?")).toBeInTheDocument()
    // Resuming must not create a second session for the same interview.
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("keeps the rehydrated answer id so a resumed rating is actually saved", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST())
    getSession.mockResolvedValue(
      DETAIL({
        answers: [
          {
            answer_id: "a-old-1",
            competency_id: "q1",
            question_text: "What drew you here?",
            captured_answer: "…",
            suggested_score: 4,
            star_evidence: null,
            final_score: 4,
            final_source: null,
          },
        ],
      }),
    )
    render(<StudioInterviewBody />)
    await user.click(screen.getByRole("button", { name: /resume/i }))
    await screen.findByText("panel 1/1: What drew you here?")

    await user.click(screen.getByText("mock-save-score"))
    await waitFor(() =>
      expect(scoreMutate).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: "s-old", answerId: "a-old-1" }),
      ),
    )
  })

  it("reopens a finished Studio interview read-only and never re-finalizes it", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST({ status: "finalized" }))
    getSession.mockResolvedValue(
      DETAIL({
        status: "finalized",
        overall_score: 5,
        recommendation: "Advance",
        section_scores: { warm_up: { mean: 5 } },
      }),
    )
    render(<StudioInterviewBody />)

    await user.click(screen.getByRole("button", { name: /reopen/i }))

    expect(await screen.findByText(/reopened for review/i)).toBeInTheDocument()
    expect(screen.getByText("Advance")).toBeInTheDocument()
    expect(finalizeMutate).not.toHaveBeenCalled()
  })

  it("shows no score at all for an abandoned interview rather than 0.00", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST({ status: "abandoned" }))
    getSession.mockResolvedValue(DETAIL({ status: "abandoned" }))
    render(<StudioInterviewBody />)

    await user.click(screen.getByRole("button", { name: /reopen/i }))

    await screen.findByText(/reopened for review/i)
    // "Overall score: 0.00 / 5" on an interview nobody finished reads as a
    // candidate who scored zero.
    const scoreLine = screen.getAllByText(/Overall score:/i)[0].textContent ?? ""
    expect(scoreLine).toContain("—")
    expect(scoreLine).not.toContain("0.00")
  })
})

/**
 * Fork parity for the transcript label.
 *
 * The Live body got this with IS-C Lane B and the Studio body did not: the
 * patch carrying it also asserted a second anchor, that assert failed, and the
 * write never happened. Both suites were green — because only the LIVE suite
 * asserted the label. The Studio findings screen shipped printing a SEEDED
 * score as though an interviewer had decided it.
 *
 * This is the third time in this lane a defect has lived in exactly one fork.
 * The assertion belongs here, not only there.
 */
describe("transcript — an undecided answer never shows a decided score (fork parity)", () => {
  const LIST_FINAL = {
    data: {
      sessions: [
        {
          id: "s-old",
          interviewer_sub: "sub-1",
          candidate_ref: { display_name: "Participant A", candidate_hash: "abcdef1234567890" },
          frame: { roleTitle: "Ops Lead" },
          status: "finalized",
          created_at: "2026-09-01T10:00:00Z",
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
      org_scope_applied: true,
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }

  it("says 'Not decided' rather than printing the seeded final_score", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST_FINAL)
    getSession.mockResolvedValue({
      session: {
        session_id: "s-old",
        frame: { roleTitle: "Ops Lead", company: "Acme" },
        candidate: { display_name: "Participant A" },
        consent: { captured: true, mode: "no_audio" },
        status: "finalized",
      },
      plan: PLAN,
      answers: [
        {
          answer_id: "legacy-1",
          competency_id: "q1",
          question_text: "What drew you here?",
          captured_answer: "…",
          suggested_score: 3,
          star_evidence: null,
          // NOT NULL, seeded at insert. Nobody decided it.
          final_score: 3,
          final_source: null,
        },
      ],
      status: "finalized",
      section_scores: { warm_up: { mean: 3.5 } },
      overall_score: 3.5,
      recommendation: "Advance",
      candidate_ref: { display_name: "Participant A", candidate_hash: "abcdef1234567890" },
    })
    render(<StudioInterviewBody />)

    await user.click(screen.getByRole("button", { name: /reopen/i }))

    expect(await screen.findByText(/not decided/i)).toBeInTheDocument()
    expect(screen.queryByText(/Score: 3 \/ 5/)).not.toBeInTheDocument()
  })

  it("still shows the score when a human did decide it", async () => {
    const user = userEvent.setup()
    useLiveSessions.mockReturnValue(LIST_FINAL)
    getSession.mockResolvedValue({
      session: {
        session_id: "s-old",
        frame: { roleTitle: "Ops Lead", company: "Acme" },
        candidate: { display_name: "Participant A" },
        consent: { captured: true, mode: "no_audio" },
        status: "finalized",
      },
      plan: PLAN,
      answers: [
        {
          answer_id: "rated-1",
          competency_id: "q1",
          question_text: "What drew you here?",
          captured_answer: "…",
          suggested_score: 3,
          star_evidence: null,
          final_score: 5,
          final_source: "human",
        },
      ],
      status: "finalized",
      section_scores: { warm_up: { mean: 5 } },
      overall_score: 5,
      recommendation: "Advance",
      candidate_ref: { display_name: "Participant A", candidate_hash: "abcdef1234567890" },
    })
    render(<StudioInterviewBody />)

    await user.click(screen.getByRole("button", { name: /reopen/i }))

    expect(await screen.findByText(/Score: 5 \/ 5/)).toBeInTheDocument()
    expect(screen.queryByText(/not decided/i)).not.toBeInTheDocument()
  })
})
