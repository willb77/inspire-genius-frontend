/**
 * LiveInterviewBody — the 3-phase shell for a REAL, scored candidate interview.
 *
 * Package IS-9 of docs/plans/Three_Studios_Completion_Build_Plan.md. This file
 * was 442 lines at 0% coverage while running scored interviews of real people
 * on both tiers.
 *
 * What is mocked and why: the four `useLiveInterview` mutations and
 * `useQuestionBank` stand in for the network, and the three heavy child forms
 * (ConsentGate, InterviewFrameForm, AnswerScorePanel) are replaced by minimal
 * stand-ins that expose their callbacks — each already has its own suite, and
 * driving their internals here would test them twice and this component not at
 * all. Everything else is the real component.
 *
 * The emphasis is deliberately on the FAILURE paths. Feeds Phase 4 and package
 * IS-4 both rewrite the scoring path through here, and the way this shape of
 * component breaks is not a crash — it is a screen that looks like it is still
 * working. One such state is pinned below and is a real defect, not a
 * preference: see "finalize failure".
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const createMutate = jest.fn()
const submitMutate = jest.fn()
const scoreMutate = jest.fn()
const finalizeMutate = jest.fn()
const toastError = jest.fn()
const toastSuccess = jest.fn()

jest.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}))

jest.mock("@/hooks/interview/useLiveInterview", () => ({
  useCreateLiveSession: () => ({ mutateAsync: createMutate, isPending: false }),
  useSubmitLiveAnswer: () => ({ mutateAsync: submitMutate, isPending: false }),
  useScoreLiveAnswer: () => ({ mutateAsync: scoreMutate, isPending: false }),
  useFinalizeLiveSession: () => ({ mutateAsync: finalizeMutate, isPending: false }),
}))

jest.mock("@/hooks/interview/useQuestionBank", () => ({
  useQuestionBank: () => ({ data: { sections: [] } }),
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

jest.mock("@/components/interview/InterviewFrameForm", () => ({
  __esModule: true,
  default: ({ onConfirm }: { onConfirm: (f: unknown) => void }) => (
    <button onClick={() => onConfirm({ roleTitle: "Regional Manager", company: "Acme" })}>
      mock-frame-confirm
    </button>
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
      <button onClick={() => onSaveScore(4, "solid result")}>mock-save-score</button>
    </div>
  ),
}))

const exportDownload = jest.fn()
const exportSave = jest.fn()
jest.mock("@/services/interview/interviewExport", () => ({
  downloadScoredInterview: (...a: unknown[]) => exportDownload(...a),
  saveScoredInterviewToDocuments: (...a: unknown[]) => exportSave(...a),
}))

import LiveInterviewBody from "../LiveInterviewBody"

const PLAN = [
  { competency_id: "c1", section: "vision", question: "Tell me about a turnaround." },
  { competency_id: "c2", section: "delivery", question: "Describe a missed deadline." },
]

const FINALIZE = {
  session: { session_id: "s1" },
  answers: [{ answer_id: "a1", competency_id: "c1", captured_answer: "the captured answer", question_text: "Tell me about a turnaround.", suggested_score: 3, star_evidence: null, final_score: 4 }],
  section_scores: { vision: { mean: 4 } },
  overall_score: 4,
  overall_mean: 4,
  recommendation: "Advance to final round",
}

/** Walk consent -> candidate -> frame, which starts the session. */
async function reachInterview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("mock-consent-proceed"))
  await user.type(screen.getByLabelText(/candidate name/i), "Candidate A")
  await user.click(screen.getByRole("button", { name: /continue/i }))
  await user.click(screen.getByText("mock-frame-confirm"))
}

beforeEach(() => {
  jest.clearAllMocks()
  createMutate.mockResolvedValue({ session_id: "s1", plan: PLAN })
  submitMutate.mockResolvedValue({ answer_id: "a1", suggested_score: 3, star_evidence: null })
  scoreMutate.mockResolvedValue({ answer_id: "a1", final_score: 4, interviewer_notes: "solid result" })
  finalizeMutate.mockResolvedValue(FINALIZE)
})

describe("setup — consent gates everything", () => {
  it("opens on the consent step, not on the candidate or frame form", () => {
    render(<LiveInterviewBody />)
    expect(screen.getByRole("heading", { name: /live scored interview/i })).toBeInTheDocument()
    expect(screen.getByText("mock-consent-proceed")).toBeInTheDocument()
    expect(screen.queryByLabelText(/candidate name/i)).not.toBeInTheDocument()
    expect(screen.queryByText("mock-frame-confirm")).not.toBeInTheDocument()
    // Nothing is created before consent: the whole point of the gate.
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("requires a candidate name before the frame step", async () => {
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await user.click(screen.getByText("mock-consent-proceed"))
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(await screen.findByText(/candidate name is required/i)).toBeInTheDocument()
    expect(screen.queryByText("mock-frame-confirm")).not.toBeInTheDocument()
  })

  it("sends the candidate and the captured consent with the session", async () => {
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: { display_name: "Candidate A", external_id: undefined },
        consent: { captured: true, mode: "no_audio", method: "in_app_ack" },
      }),
    )
  })
})

describe("a failed start does not blank the body", () => {
  it("stays on setup and says so when createSession rejects", async () => {
    createMutate.mockRejectedValue(new Error("live_interview_scoring off"))
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not start/i)))
    // Still on the setup phase with the frame step intact — not an empty shell.
    expect(screen.getByText("mock-frame-confirm")).toBeInTheDocument()
    expect(screen.queryByText(/panel 1\/2/)).not.toBeInTheDocument()
  })
})

describe("interview phase", () => {
  it("shows the first planned question and the running tally", async () => {
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    expect(await screen.findByText("panel 1/2: Tell me about a turnaround.")).toBeInTheDocument()
    expect(screen.getByText(/question 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByText(/0\/2 scored/i)).toBeInTheDocument()
  })

  it("advances only after the answer has been rated, not merely submitted", async () => {
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")

    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1))
    // A suggestion alone must not offer "Next" — the rating is the record.
    expect(screen.queryByRole("button", { name: /next question/i })).not.toBeInTheDocument()

    await user.click(screen.getByText("mock-save-score"))
    const next = await screen.findByRole("button", { name: /next question/i })
    expect(screen.getByText(/1\/2 scored · avg 4\.00/i)).toBeInTheDocument()

    await user.click(next)
    expect(await screen.findByText("panel 2/2: Describe a missed deadline.")).toBeInTheDocument()
  })

  it("keeps the question on screen when submitting the answer fails", async () => {
    submitMutate.mockRejectedValue(new Error("nope"))
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")

    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not submit/i)))
    expect(screen.getByText("panel 1/2: Tell me about a turnaround.")).toBeInTheDocument()
    expect(screen.getByText(/0\/2 scored/i)).toBeInTheDocument()
  })

  it("does not count the answer as scored when the rating PATCH fails", async () => {
    scoreMutate.mockRejectedValue(new Error("nope"))
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalled())

    await user.click(screen.getByText("mock-save-score"))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not save that rating/i)))
    // The tally is the interviewer's record of what is saved server-side. A
    // failed PATCH that still incremented it would be a lie about the record.
    expect(screen.getByText(/0\/2 scored/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next question/i })).not.toBeInTheDocument()
  })
})

describe("ending the interview", () => {
  it("confirms before ending while the current answer is unsaved", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")

    await user.click(screen.getByRole("button", { name: /end interview/i }))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/won't be saved/i))
    expect(finalizeMutate).not.toHaveBeenCalled()
    expect(screen.getByText("panel 1/2: Tell me about a turnaround.")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("ends without confirming once the current answer is rated", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByText("mock-submit-answer"))
    await waitFor(() => expect(submitMutate).toHaveBeenCalled())
    await user.click(screen.getByText("mock-save-score"))
    await screen.findByRole("button", { name: /next question/i })

    await user.click(screen.getByRole("button", { name: /end interview/i }))
    expect(confirmSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(finalizeMutate).toHaveBeenCalledWith({ sessionId: "s1" }))
    confirmSpy.mockRestore()
  })
})

describe("findings", () => {
  it("renders the scored write-up and the export controls", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByRole("button", { name: /end interview/i }))

    expect(await screen.findByRole("heading", { name: /interview results/i })).toBeInTheDocument()
    expect(screen.getByText("Advance to final round")).toBeInTheDocument()
    expect(screen.getByText(/candidate a/i)).toBeInTheDocument()
    // section_scores arrives as an OBJECT; a raw .map() here white-screened once.
    expect(screen.getByText("vision")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /word/i })).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("exports without losing the results, and reports an export failure", async () => {
    exportDownload.mockRejectedValueOnce(new Error("Export failed."))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await screen.findByText("Advance to final round")

    await user.click(screen.getByRole("button", { name: /word/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Export failed."))
    // A failed export must not take the write-up away.
    expect(screen.getByText("Advance to final round")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/document library/i)))
    confirmSpy.mockRestore()
  })

  it("'New interview' returns to the consent step, not to a half-reset form", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await screen.findByText("Advance to final round")

    await user.click(screen.getByRole("button", { name: /new interview/i }))
    expect(screen.getByText("mock-consent-proceed")).toBeInTheDocument()
    expect(screen.queryByText("Advance to final round")).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  /**
   * PINS A DEFECT — do not read this as approval of the behaviour.
   *
   * `finish()` sets the phase to "findings" BEFORE awaiting finalize. When the
   * call rejects, the toast fires and vanishes, `finalizeResult` stays null, and
   * the render falls to the `!finalizeResult` branch: a spinner reading
   * "Compiling the scored write-up…" that never resolves. The interviewer is
   * left watching a progress indicator for work that already failed, with the
   * answers no longer on screen and no way back except "New interview".
   *
   * Filed as IS-F13. When it is fixed, this test SHOULD fail — replace it with
   * one asserting the error state and a retry.
   */
  it("finalize failure currently leaves a spinner that never resolves (IS-F13)", async () => {
    finalizeMutate.mockRejectedValue(new Error("nope"))
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<LiveInterviewBody />)
    await reachInterview(user)
    await screen.findByText("panel 1/2: Tell me about a turnaround.")
    await user.click(screen.getByRole("button", { name: /end interview/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not finalize/i)))
    expect(screen.getByText(/compiling the scored write-up/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /word/i })).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
