import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PrismExam from "../PrismExam"
import type { ExamAnswer, ExamRun, ExamRunDetail, QuestionSet, RunDiff } from "@/types/prism-exam"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }))

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (name: string, blob: Blob) => downloadBlob(name, blob) }))

const startMutate = jest.fn()
const cancelMutate = jest.fn()
const replaceMutate = jest.fn()
let runs: ExamRun[] = []
let runDetails: Record<string, ExamRunDetail> = {}
let answers: ExamAnswer[] = []
let activeSet: QuestionSet | undefined
let diff: RunDiff | undefined
let runError: unknown
let setError: unknown
const answersFilters = jest.fn()
const diffArgs = jest.fn()

jest.mock("@/hooks/super-admin/usePrismExam", () => {
  const actual = jest.requireActual("@/hooks/super-admin/usePrismExam")
  return {
    isRunActive: actual.isRunActive,
    useExamRuns: () => ({ data: runs, isLoading: false }),
    useExamRun: (id?: string) => ({
      data: id ? runDetails[id] : undefined,
      isError: !!runError && !!id,
      error: runError,
    }),
    useExamAnswers: (id?: string, filters?: { verdict?: string; chapter?: string }) => {
      answersFilters(filters)
      const list = id
        ? answers.filter((a) => (!filters?.verdict || a.verdict === filters.verdict) && (!filters?.chapter || a.chapter === filters.chapter))
        : []
      return { data: list, isLoading: false }
    },
    useExamDiff: (a?: string, b?: string) => {
      diffArgs(a, b)
      return { data: a && b ? diff : undefined, isError: false, error: undefined }
    },
    useActiveQuestionSet: () => ({ data: activeSet, isError: !!setError, error: setError }),
    useExamQuestionSets: () => ({ data: activeSet ? [activeSet, { ...activeSet, version: 0 }] : [] }),
    useStartExamRun: () => ({ mutate: startMutate, isPending: false }),
    useCancelExamRun: () => ({ mutate: cancelMutate, isPending: false }),
    useReplaceQuestionSet: () => ({ mutate: replaceMutate, isPending: false }),
  }
})

const BASE_RUN: ExamRun = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  tier: "dev",
  label: "after canon",
  question_set_id: "qs-1",
  question_set_version: 1,
  status: "complete",
  started_by: "sa",
  exam_user_id: "exam",
  concurrency: 2,
  engine_sha: "sha-6b985910",
  judge_model: "claude-sonnet-5",
  total: 3,
  done: 3,
  score: 0.8333,
  by_chapter: {
    welcome: { title: "Welcome to PRISM", n: 2, correct: 2, partial: 0, wrong: 0, score: 1 },
    brain: { title: "The Human Brain", n: 1, correct: 0, partial: 1, wrong: 0, score: 0.5 },
  },
  agents: { by_agent: { Aura: 2, Summit: 1 }, aura_consults: 1 },
  error: null,
  created_at: "2026-09-03T18:00:00Z",
  started_at: "2026-09-03T18:00:05Z",
  heartbeat_at: null,
  completed_at: "2026-09-03T18:11:00Z",
}
const OLD_RUN: ExamRun = { ...BASE_RUN, id: "bbbbbbbb-0000-0000-0000-000000000002", label: null, score: 0.5, created_at: "2026-09-02T18:00:00Z" }
const ACTIVE_RUN: ExamRun = { ...BASE_RUN, id: "cccccccc-0000-0000-0000-000000000003", label: "in flight", status: "running", done: 1, score: null, by_chapter: null, agents: null, completed_at: null }

function detail(r: ExamRun, over: Partial<ExamRunDetail> = {}): ExamRunDetail {
  return { ...r, pass_mark: 0.8, passed: (r.score ?? 0) >= 0.8, ...over }
}

function answer(over: Partial<ExamAnswer>): ExamAnswer {
  return {
    id: "a-1",
    run_id: BASE_RUN.id,
    question_id: "W01",
    chapter: "welcome",
    page: 5,
    question: "What are the three maps?",
    expected: "Underlying, Adapted, Consistent",
    answer: "Underlying, Adapted and Consistent.",
    agent: "Aura",
    contributing_agents: ["Aura"],
    rag_sources: null,
    verdict: "correct",
    missing: null,
    reason: null,
    elapsed_s: 12.4,
    session_id: "exam-abc-W01",
    error: null,
    created_at: "2026-09-03T18:01:00Z",
    ...over,
  }
}

const SET: QuestionSet = {
  id: "qs-1",
  version: 1,
  name: "Handbook default set",
  count: 2,
  pass_mark: 0.8,
  is_active: true,
  chapters: { welcome: "Welcome to PRISM", brain: "The Human Brain" },
  questions: [
    { id: "W01", chapter: "welcome", page: 5, q: "What are the three maps?", expected: "Underlying, Adapted, Consistent" },
    { id: "B01", chapter: "brain", page: 12, q: "What does the cerebellum do?", expected: "Balance, coordination, learning" },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  runs = [BASE_RUN, OLD_RUN]
  runDetails = { [BASE_RUN.id]: detail(BASE_RUN), [OLD_RUN.id]: detail(OLD_RUN) }
  answers = [
    answer({}),
    answer({ id: "a-2", question_id: "W02", question: "Which map is used for external recruitment?" }),
    answer({
      id: "a-3",
      question_id: "B01",
      chapter: "brain",
      page: 12,
      question: "What does the cerebellum do?",
      agent: "Summit",
      contributing_agents: ["Summit", "Aura"],
      verdict: "partial",
      missing: ["learning and memory"],
      reason: "Omits the cerebellum's role in learning and memory.",
      answer: "Balance and coordination.",
    }),
  ]
  activeSet = SET
  diff = undefined
  runError = undefined
  setError = undefined
})

describe("PrismExam page", () => {
  it("renders the header, the question set summary and recent runs", () => {
    render(<PrismExam />)
    expect(screen.getByRole("heading", { name: /PRISM Practitioner Exam/ })).toBeInTheDocument()
    expect(screen.getByText(/2 questions · Handbook default set \(v1\) · pass mark 80%/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "after canon" })).toBeInTheDocument()
    expect(screen.getByText("83.3%")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start exam" })).toBeEnabled()
  })

  it("starts a run with the label and concurrency, then opens the results", async () => {
    const user = userEvent.setup()
    startMutate.mockImplementation((_input, opts) => opts.onSuccess({ run_id: BASE_RUN.id, status: "queued", total: 91 }))
    render(<PrismExam />)
    await user.type(screen.getByLabelText("Label (optional)"), "smoke")
    await user.click(screen.getByRole("button", { name: "1 at a time" }))
    await user.click(screen.getByRole("button", { name: "Start exam" }))
    expect(startMutate).toHaveBeenCalledWith({ label: "smoke", concurrency: 1 }, expect.any(Object))
    expect(toastSuccess).toHaveBeenCalledWith("Exam started — 91 questions")
    await waitFor(() => expect(screen.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true"))
  })

  it("surfaces a start failure as a toast, not a crash", async () => {
    const user = userEvent.setup()
    startMutate.mockImplementation((_input, opts) =>
      opts.onError({ response: { data: { detail: { message: "a run is already active on this tier", active_run_id: "x" } } } }),
    )
    render(<PrismExam />)
    await user.click(screen.getByRole("button", { name: "Start exam" }))
    expect(toastError).toHaveBeenCalledWith("Could not start the exam")
  })

  it("shows the active run with progress, blocks a second start, and can cancel", async () => {
    const user = userEvent.setup()
    runs = [ACTIVE_RUN, BASE_RUN]
    runDetails[ACTIVE_RUN.id] = detail(ACTIVE_RUN, { passed: false })
    cancelMutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<PrismExam />)
    expect(screen.getByRole("button", { name: "Start exam" })).toBeDisabled()
    expect(screen.getByText("1 / 3 answered")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "run progress" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Cancel run/ }))
    expect(cancelMutate).toHaveBeenCalledWith(ACTIVE_RUN.id, expect.any(Object))
    expect(toastSuccess).toHaveBeenCalledWith("Run cancelled")
  })

  it("shows a run's score, chapters and answers, filters by verdict and chapter, and exports", async () => {
    const user = userEvent.setup()
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "Results" }))
    expect(screen.getByText("83.3%")).toBeInTheDocument()
    expect(screen.getByText(/PASS · pass mark 80%/)).toBeInTheDocument()
    expect(screen.getByText(/2 correct · 1 partial · 0 wrong · answered by Aura 2, Summit 1 · Aura consulted 1×/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "The Human Brain" })).toBeInTheDocument()
    expect(screen.getByText("3 shown")).toBeInTheDocument()

    // The partial answer opens by default and carries the judge's reason; a correct one is folded.
    expect(screen.getByText(/Omits the cerebellum's role/)).toBeInTheDocument()
    expect(screen.queryByText("Underlying, Adapted and Consistent.")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /W01/ }))
    expect(screen.getByText("Underlying, Adapted and Consistent.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "partial" }))
    expect(answersFilters).toHaveBeenLastCalledWith({ verdict: "partial", chapter: undefined })
    expect(screen.getByText("1 shown")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "all" }))
    await user.click(screen.getByRole("button", { name: "The Human Brain" }))
    expect(answersFilters).toHaveBeenLastCalledWith({ verdict: undefined, chapter: "brain" })
    expect(screen.getByRole("button", { name: /chapter: The Human Brain/ })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /CSV/ }))
    await user.click(screen.getByRole("button", { name: /Markdown/ }))
    expect(downloadBlob).toHaveBeenCalledTimes(2)
    expect(downloadBlob.mock.calls[0][0]).toBe("prism-exam-dev-aaaaaaaa.csv")
    expect(downloadBlob.mock.calls[1][0]).toBe("prism-exam-dev-aaaaaaaa.md")
  })

  it("switches runs from the selector and reports a run that cannot be loaded", async () => {
    const user = userEvent.setup()
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "Results" }))
    await user.selectOptions(screen.getByRole("combobox", { name: "Run" }), OLD_RUN.id)
    expect(screen.getByText("50.0%")).toBeInTheDocument()
    expect(screen.getByText(/FAIL · pass mark 80%/)).toBeInTheDocument()
  })

  it("shows the load error for a run", async () => {
    const user = userEvent.setup()
    runError = { response: { data: { detail: "run not found" } } }
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "Results" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load that run: run not found")
  })

  it("says so when there is nothing to show", async () => {
    const user = userEvent.setup()
    runs = []
    render(<PrismExam />)
    expect(screen.getByText("No runs on this tier yet.")).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Results" }))
    expect(screen.getByText(/No run selected/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "History" }))
    expect(screen.getByText("No runs on this tier yet.")).toBeInTheDocument()
  })

  it("lists history, opens a run from it, and compares two ticked runs", async () => {
    const user = userEvent.setup()
    diff = {
      improved: [{ question_id: "B01", chapter: "brain", question: "Cerebellum?", before: "wrong", after: "partial", agent_before: "Aura", agent_after: "Summit" }],
      regressed: [],
      unchanged_count: 2,
      routing_changes: [{ question_id: "B01", chapter: "brain", question: "Cerebellum?", before: "wrong", after: "partial", agent_before: "Aura", agent_after: "Summit" }],
      by_chapter: [{ chapter: "brain", title: "The Human Brain", before: 0, after: 0.5, delta: 0.5 }],
      run_a: { id: OLD_RUN.id, label: null, score: 0.5, engine_sha: null, created_at: OLD_RUN.created_at },
      run_b: { id: BASE_RUN.id, label: "after canon", score: 0.8333, engine_sha: "sha-6b985910", created_at: BASE_RUN.created_at },
    }
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "History" }))
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(3)
    expect(within(table).getAllByText("6b985910")).toHaveLength(2)

    await user.click(screen.getByRole("checkbox", { name: /compare Run .* · bbbbbbbb/ }))
    await user.click(screen.getByRole("checkbox", { name: "compare after canon" }))
    expect(diffArgs).toHaveBeenLastCalledWith(OLD_RUN.id, BASE_RUN.id)
    expect(screen.getByText("1 improved")).toBeInTheDocument()
    expect(screen.getByText("0 regressed")).toBeInTheDocument()
    expect(screen.getByText("2 unchanged")).toBeInTheDocument()
    expect(screen.getByText("1 routing changes")).toBeInTheDocument()
    expect(screen.getByText("+50 pts")).toBeInTheDocument()
    expect(screen.getByText("Aura → Summit")).toBeInTheDocument()

    await user.click(within(table).getByRole("button", { name: "after canon" }))
    await waitFor(() => expect(screen.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true"))
  })

  it("shows the question set grouped by chapter and saves an edited version", async () => {
    const user = userEvent.setup()
    replaceMutate.mockImplementation((_input, opts) => opts.onSuccess({ id: "qs-2", version: 2, count: 2 }))
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "Questions" }))
    expect(screen.getByText(/2 questions across 2 chapters · pass mark 80% · 2 versions on file/)).toBeInTheDocument()
    expect(screen.getByText("What does the cerebellum do?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit question set" }))
    const box = screen.getByLabelText("question set JSON") as HTMLTextAreaElement
    expect(JSON.parse(box.value).questions).toHaveLength(2)

    // Invalid JSON is rejected client-side with a readable reason.
    await user.clear(box)
    await user.type(box, "{{")
    await user.click(screen.getByRole("button", { name: /Save as new version/ }))
    expect(toastError).toHaveBeenCalledWith("Not valid JSON.")
    expect(replaceMutate).not.toHaveBeenCalled()

    // A valid edit is sent and reported.
    const edited = { ...SET, name: "Edited set", questions: SET.questions.slice(0, 1) }
    await user.clear(box)
    await user.paste(JSON.stringify({ name: edited.name, pass_mark: 0.75, chapters: edited.chapters, questions: edited.questions }))
    await user.click(screen.getByRole("button", { name: /Save as new version/ }))
    expect(replaceMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Edited set", pass_mark: 0.75, questions: [expect.objectContaining({ id: "W01" })] }),
      expect.any(Object),
    )
    expect(toastSuccess).toHaveBeenCalledWith("Question set saved as v2 (2 questions) and made active")
    expect(screen.queryByLabelText("question set JSON")).not.toBeInTheDocument()
  })

  it("reports a question set that cannot be loaded", async () => {
    const user = userEvent.setup()
    activeSet = undefined
    setError = { response: { data: { detail: "exam user missing" } } }
    render(<PrismExam />)
    await user.click(screen.getByRole("tab", { name: "Questions" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the question set: exam user missing")
  })
})
