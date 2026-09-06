/**
 * /interview-practice — the candidate-side Interview Coach.
 *
 * Package IS-9 of docs/plans/Three_Studios_Completion_Build_Plan.md. 644 lines,
 * the largest untested file in the studio, and the one Feeds Phase 4 rewrites
 * into a scored session on the live pipeline. Tests first, rewrite after.
 *
 * The pure helpers from practice.service (buildInterviewPlan, frameQuestionCount)
 * are kept REAL — mocking them would leave the plan-building this page depends on
 * unexercised. Only the three network calls are stubbed, plus the voice and
 * dictation hooks (no Web Speech API in jsdom) and the async-job hook, whose
 * `onJobSettled` is captured so a turn can be settled on demand.
 *
 * Emphasis is on the paths that fail QUIETLY. This page has four independent
 * fallbacks — role pack, tailoring, personalization, coaching — each of which
 * degrades to something that looks exactly like a normal interview. Whether the
 * candidate is told is the whole product difference.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}))

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

jest.mock("react-router-dom", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#s">{children}</a>,
  useLocation: () => ({ state: null, pathname: "/interview-practice" }),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Candidate One", email: "c@example.test" } }),
}))

jest.mock("@/components/interview/InterviewFrameForm", () => ({
  __esModule: true,
  default: ({ onConfirm }: { onConfirm: (f: unknown) => void }) => (
    <button onClick={() => onConfirm(frameToConfirm)}>mock-frame-confirm</button>
  ),
}))

jest.mock("@/components/interview/AudioControls", () => ({
  __esModule: true,
  default: () => <div>mock-audio-controls</div>,
}))

const speak = jest.fn()
jest.mock("@/hooks/interview/useMeridianVoice", () => ({
  useMeridianVoice: () => ({ speak, stop: jest.fn(), state: "idle", supported: true }),
}))

jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: () => ({ start: jest.fn(), stop: jest.fn(), listening: false, supported: false }),
}))

const BANK = {
  guidance: "Answer in STAR form.",
  sections: [
    {
      key: "vision",
      section: "vision",
      title: "Vision",
      competencies: [
        { id: "v1", competency: "Strategy", question: "Where do you want to be?", starProbes: [] },
        { id: "v2", competency: "Judgement", question: "A call you got wrong?", starProbes: [] },
      ],
    },
    {
      key: "behavioral",
      section: "behavioral",
      title: "Behavioral",
      competencies: [
        { id: "b1", competency: "Conflict", question: "A disagreement you handled?", starProbes: [] },
      ],
    },
    {
      key: "productivity",
      section: "productivity",
      title: "Productivity",
      competencies: [
        { id: "p1", competency: "Focus", question: "How do you prioritise?", starProbes: [] },
      ],
    },
  ],
}

jest.mock("@/hooks/interview/usePracticeQuestions", () => ({
  usePracticeQuestions: () => ({ data: BANK, isLoading: false, error: null }),
}))

const getPracticeContext = jest.fn()
const getTailored = jest.fn()
const getRolePack = jest.fn()
jest.mock("@/services/interview/practice.service", () => {
  const actual = jest.requireActual("@/services/interview/practice.service")
  return {
    ...actual,
    practiceService: { getPracticeContext: (...a: unknown[]) => getPracticeContext(...a) },
    getTailoredPracticeQuestions: (...a: unknown[]) => getTailored(...a),
    getRolePackQuestions: (...a: unknown[]) => getRolePack(...a),
  }
})

const download = jest.fn()
const saveToDocs = jest.fn()
jest.mock("@/services/interview/interviewExport", () => ({
  downloadInterview: (...a: unknown[]) => download(...a),
  saveInterviewToDocuments: (...a: unknown[]) => saveToDocs(...a),
}))

/** Captured so a turn can be settled from a test. */
let settle: ((job: { status: string; content?: string; error?: string }) => void) | null = null
const startJob = jest.fn()
jest.mock("@/hooks/agents/useMeridianJob", () => ({
  useMeridianJob: ({ onJobSettled }: { onJobSettled: (j: unknown) => void }) => {
    settle = onJobSettled as typeof settle
    return { startJob }
  },
}))

import InterviewPracticePage from "../InterviewPracticePage"

let frameToConfirm: Record<string, unknown> = { numQuestions: 2, lengthMinutes: 20 }

beforeEach(() => {
  jest.clearAllMocks()
  frameToConfirm = { numQuestions: 2, lengthMinutes: 20 }
  getPracticeContext.mockResolvedValue({ enabled: true, personalContext: "PRISM: analytical." })
  getTailored.mockResolvedValue({ ...BANK, tailored: true })
  getRolePack.mockResolvedValue({ ...BANK, role: null })
  startJob.mockResolvedValue(undefined)
})

const start = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText("mock-frame-confirm"))
  await screen.findByText(/question 1 of 2/i)
}

describe("setup", () => {
  it("opens on setup with personalization on by default", () => {
    render(<InterviewPracticePage />)
    expect(screen.getByRole("heading", { name: /interview practice/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/personalize coaching to my profile/i)).toBeChecked()
  })

  it("builds a plan of exactly the requested length and starts at question 1", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.getByText(/question 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByText("Where do you want to be?")).toBeInTheDocument()
  })

  it("skips the personalization fetch entirely when the switch is off", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await user.click(screen.getByLabelText(/personalize coaching to my profile/i))
    await start(user)
    expect(getPracticeContext).not.toHaveBeenCalled()
    expect(screen.queryByText(/personalized to your profile/i)).not.toBeInTheDocument()
  })
})

describe("the four quiet fallbacks — what the candidate is told", () => {
  it("claims personalization only when context actually came back", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.getByText(/personalized to your profile/i)).toBeInTheDocument()
  })

  it("does not claim personalization when the backend flag is off", async () => {
    // `enabled: false` is the flag-off shape. Showing the badge anyway would
    // tell the candidate their PRISM shaped coaching that never saw it.
    getPracticeContext.mockResolvedValue({ enabled: false, personalContext: "" })
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.queryByText(/personalized to your profile/i)).not.toBeInTheDocument()
  })

  it("still starts the interview when the personalization fetch throws", async () => {
    getPracticeContext.mockRejectedValue(new Error("500"))
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.getByText("Where do you want to be?")).toBeInTheDocument()
    expect(screen.queryByText(/personalized to your profile/i)).not.toBeInTheDocument()
  })

  it("serves a picked role pack verbatim and never runs it through tailoring", async () => {
    frameToConfirm = { numQuestions: 2, lengthMinutes: 20, rolePackSlug: "ops-lead", roleTitle: "Ops Lead" }
    getRolePack.mockResolvedValue({
      ...BANK,
      role: {
        slug: "ops-lead",
        title: "Operations Lead",
        level: "Senior",
        family: "Operations",
        competencyCount: 4,
        coachingNote: "Lead with the constraint.",
        provenance: "Curated set.",
      },
    })
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)

    expect(getRolePack).toHaveBeenCalledWith("ops-lead")
    expect(getTailored).not.toHaveBeenCalled()
    expect(screen.getByText(/senior set — 4 competencies/i)).toBeInTheDocument()
    expect(screen.getByText("Lead with the constraint.")).toBeInTheDocument()
  })

  it("shows NO pack badge when the role-pack fetch fails, rather than pretending it applied", async () => {
    // The source comment is explicit: fall back to the ordinary path, but do
    // not pretend the pack applied. A badge here would be a false provenance
    // claim on questions the candidate did not actually get.
    frameToConfirm = { numQuestions: 2, lengthMinutes: 20, rolePackSlug: "ops-lead", roleTitle: "Ops Lead" }
    getRolePack.mockRejectedValue(new Error("404"))
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)

    expect(screen.queryByText(/set — .* competencies/i)).not.toBeInTheDocument()
    expect(screen.getByText("Where do you want to be?")).toBeInTheDocument()
  })

  it("announces tailoring when the backend says it applied", async () => {
    frameToConfirm = { numQuestions: 2, lengthMinutes: 20, roleTitle: "Ops Lead" }
    getTailored.mockResolvedValue({ ...BANK, tailored: true })
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.getByText(/tailored to ops lead/i)).toBeInTheDocument()
  })

  it("stays silent about tailoring when the backend fell back to the bank", async () => {
    // `tailored: false` is the server-side fallback. Claiming a tailored
    // interview here is the same false-provenance failure as the role pack.
    frameToConfirm = { numQuestions: 2, lengthMinutes: 20, roleTitle: "Ops Lead" }
    getTailored.mockResolvedValue({ ...BANK, tailored: false })
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.queryByText(/tailored to ops lead/i)).not.toBeInTheDocument()
    expect(screen.getByText("Where do you want to be?")).toBeInTheDocument()
  })

  it("names the employer pack when one matched", async () => {
    frameToConfirm = { numQuestions: 2, lengthMinutes: 20, roleTitle: "Ops Lead", company: "Acme" }
    getTailored.mockResolvedValue({
      ...BANK,
      tailored: true,
      employer: { kind: "employer", slug: "acme", name: "Acme", questionCount: 3 },
    })
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(screen.getByText(/3 questions in acme's style/i)).toBeInTheDocument()
  })
})

describe("a turn", () => {
  it("will not submit an empty answer", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    expect(startJob).not.toHaveBeenCalled()
  })

  it("submits, shows the coaching when the job settles, then advances", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)

    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "I rebuilt the rota.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("button", { name: /coaching…/i })).toBeInTheDocument()

    settle?.({ status: "complete", content: "Name the result next time." })
    expect(await screen.findByText("Name the result next time.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /next question/i }))
    expect(screen.getByText(/question 2 of 2/i)).toBeInTheDocument()
  })

  it("clears the busy state and reports the error when the job fails", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "An answer.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalled())

    settle?.({ status: "error", error: "The model timed out." })
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("The model timed out."))
    // Not left spinning: the candidate can try that answer again.
    expect(await screen.findByRole("button", { name: /submit answer/i })).toBeInTheDocument()
  })

  it("reports a failure to even start the coaching job", async () => {
    startJob.mockRejectedValue(new Error("network"))
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "An answer.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not get coaching."))
  })
})

describe("findings", () => {
  it("says plainly that nothing was answered rather than asking the model", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.click(screen.getByRole("button", { name: /end interview/i }))

    expect(await screen.findByText(/ended the interview before answering any questions/i)).toBeInTheDocument()
    // No job is started for an empty interview — nothing to summarize.
    expect(startJob).not.toHaveBeenCalled()
  })

  it("compiles findings from the answered exchanges and lists the transcript", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "I rebuilt the rota.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1))
    settle?.({ status: "complete", content: "Good structure." })
    await screen.findByText("Good structure.")

    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(2))
    settle?.({ status: "complete", content: "You interview well under pressure." })

    expect(await screen.findByText("You interview well under pressure.")).toBeInTheDocument()
    expect(screen.getByText(/full transcript \(1 answered\)/i)).toBeInTheDocument()
    expect(screen.getByText("I rebuilt the rota.")).toBeInTheDocument()
  })

  it("reports a failure to compile findings", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "An answer.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1))
    settle?.({ status: "complete", content: "ok" })
    await screen.findByText("ok")

    startJob.mockRejectedValue(new Error("network"))
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not compile findings."))
  })
})

describe("export, restart and voice", () => {
  /** Answer one question, end, and settle the findings job. */
  async function reachFindings(user: ReturnType<typeof userEvent.setup>) {
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "I rebuilt the rota.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1))
    settle?.({ status: "complete", content: "Good structure." })
    await screen.findByText("Good structure.")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(2))
    settle?.({ status: "complete", content: "You interview well." })
    await screen.findByText("You interview well.")
  }

  it("exports to Word and to PDF through the same session payload", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await reachFindings(user)

    await user.click(screen.getByRole("button", { name: /word/i }))
    await waitFor(() => expect(download).toHaveBeenCalledWith(expect.anything(), "word"))
    await user.click(screen.getByRole("button", { name: /pdf/i }))
    await waitFor(() => expect(download).toHaveBeenCalledWith(expect.anything(), "pdf"))

    // The transcript and findings travel with the export, not just the summary.
    const [session] = download.mock.calls[0] as [{ exchanges: unknown[]; findings: string }]
    expect(session.exchanges).toHaveLength(1)
    expect(session.findings).toBe("You interview well.")
  })

  it("confirms a save to the Document Library", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await reachFindings(user)
    await user.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/document library/i)))
  })

  it("keeps the findings on screen when an export fails", async () => {
    download.mockRejectedValueOnce(new Error("Export failed."))
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await reachFindings(user)

    await user.click(screen.getByRole("button", { name: /word/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Export failed."))
    expect(screen.getByText("You interview well.")).toBeInTheDocument()
    // ...and the buttons come back, rather than staying disabled forever.
    expect(await screen.findByRole("button", { name: /word/i })).toBeEnabled()
  })

  it("'New' returns a clean setup, not a half-cleared session", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await reachFindings(user)

    await user.click(screen.getByRole("button", { name: /^new$/i }))
    expect(screen.getByRole("heading", { name: /interview practice/i })).toBeInTheDocument()
    expect(screen.queryByText("You interview well.")).not.toBeInTheDocument()
    expect(screen.queryByText("I rebuilt the rota.")).not.toBeInTheDocument()
    expect(screen.getByLabelText(/personalize coaching to my profile/i)).toBeChecked()
  })

  it("reads the question aloud once voice mode is on, and not before", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    expect(speak).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText(/voice mode/i))
    await waitFor(() => expect(speak).toHaveBeenCalledWith(expect.stringContaining("Where do you want to be?")))
    expect(speak).toHaveBeenCalledWith(expect.stringContaining("Question 1 of 2"))
  })

  it("reads the coaching aloud in voice mode, and stays silent otherwise", async () => {
    const user = userEvent.setup()
    render(<InterviewPracticePage />)
    await start(user)
    await user.type(screen.getByPlaceholderText(/situation, task, action, result/i), "An answer.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))
    await waitFor(() => expect(startJob).toHaveBeenCalled())

    settle?.({ status: "complete", content: "Name the result." })
    await screen.findByText("Name the result.")
    expect(speak).not.toHaveBeenCalledWith("Name the result.")
  })
})
