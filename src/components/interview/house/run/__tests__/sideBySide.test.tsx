/**
 * S4b — side by side: the one interview build against the two bodies it
 * replaces, on today's session shapes.
 *
 * The rule (from the S4b change safety assessment): scoring and the write-up
 * must not change in any way. Interview sessions feed Team Development's
 * Interviews tab and Job Blueprint scorecards, and a finished write-up is the
 * record of a decision about a real person.
 *
 * So every case renders the OLD body (LiveInterviewBody or StudioInterviewBody,
 * untouched) and the NEW one (InterviewRunBody) on the same data, and asserts:
 *   - the findings screen's HTML is identical, character for character;
 *   - every request body (create, answer, rate, finalize) is deep-equal;
 *   - the export payload is deep-equal;
 *   - the Job Blueprint pipeline-step writes are deep-equal.
 * The children both bodies share are mocked identically, so a difference can
 * only come from the body under test.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import type { ReactElement, ReactNode } from "react"

const createMutate = jest.fn()
const submitMutate = jest.fn()
const scoreMutate = jest.fn()
const finalizeMutate = jest.fn()
const getSession = jest.fn()
const stepMutate = jest.fn()
const exportDownload = jest.fn()
const exportSave = jest.fn()

const toastError = jest.fn()
jest.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: jest.fn(), info: jest.fn() },
}))
const bankParams = jest.fn()
const builderProps = jest.fn()
jest.mock("@/hooks/interview/useLiveSessions", () => ({
  useLiveSessions: () => ({
    data: { sessions: [], total: 0, limit: 25, offset: 0, org_scope_applied: true },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  useAbandonLiveSession: () => ({ mutateAsync: jest.fn() }),
}))
jest.mock("@/services/interview/live.service", () => {
  const actual = jest.requireActual("@/services/interview/live.service")
  return {
    ...actual,
    liveInterviewService: { ...actual.liveInterviewService, getSession: (...a: unknown[]) => getSession(...a) },
  }
})
jest.mock("@/hooks/interview/useLiveInterview", () => ({
  useCreateLiveSession: () => ({ mutateAsync: createMutate, isPending: false }),
  useSubmitLiveAnswer: () => ({ mutateAsync: submitMutate, isPending: false }),
  useScoreLiveAnswer: () => ({ mutateAsync: scoreMutate, isPending: false }),
  useFinalizeLiveSession: () => ({ mutateAsync: finalizeMutate, isPending: false }),
}))
jest.mock("@/hooks/interview/useQuestionBank", () => ({
  useQuestionBank: (p?: { enabled?: boolean }) => (bankParams(p), {
    data:
      p?.enabled === false
        ? undefined
        : { sections: [{ competencies: [{ id: "c1", name: "Vision" }] }] },
  }),
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Interviewer One" } }),
}))
jest.mock("@/hooks/interview/useDeepLinkedCandidate", () => ({
  useDeepLinkedCandidate: () => ({ link: null, state: "idle" }),
}))
jest.mock("@/hooks/job-blueprint/useTriage", () => ({
  useSetInterviewStep: () => ({ mutateAsync: stepMutate, isPending: false }),
}))
jest.mock("@/services/interview/interviewExport", () => ({
  downloadScoredInterview: (...a: unknown[]) => exportDownload(...a),
  saveScoredInterviewToDocuments: (...a: unknown[]) => exportSave(...a),
}))
jest.mock("@/components/interview/JobDnaCandidatePicker", () => ({
  __esModule: true,
  default: ({ value, onPick }: { value: unknown; onPick: (l: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onPick({ blueprint_id: "bp-1", candidate_id: "cand-1", display_name: "Linked Person", external_id: "REQ-9" })}
    >
      {value ? "mock-linked" : "mock-link-candidate"}
    </button>
  ),
}))
jest.mock("@/components/interview/ConsentGate", () => ({
  __esModule: true,
  default: ({ onProceed }: { onProceed: (c: unknown) => void }) => (
    <button onClick={() => onProceed({ captured: true, mode: "no_audio", method: "in_app_ack" })}>mock-consent</button>
  ),
}))
jest.mock("@/components/interview/InterviewFrameForm", () => ({
  __esModule: true,
  default: ({ onConfirm }: { onConfirm: (f: unknown) => void }) => (
    <button
      onClick={() =>
        onConfirm({ roleTitle: "Regional Manager", company: "Acme", requisitionId: "r-1", requisitionLabel: "North" })
      }
    >
      mock-frame-confirm
    </button>
  ),
}))
let builderKind: "general" | "hiring" = "general"
jest.mock("@/components/interview/StudioQuestionBuilder", () => ({
  __esModule: true,
  default: ({
    onConfirm,
    developmentOnly,
    initialKind,
    onKindChange,
  }: {
    onConfirm: (f: unknown) => void
    developmentOnly?: ReactNode
    initialKind?: string
    onKindChange?: (k: "general" | "hiring") => void
  }) => (
    builderProps({ initialKind }),
    <div>
      {developmentOnly}
      <button onClick={() => onKindChange?.("hiring")}>mock-style-selection</button>
      <button onClick={() => onKindChange?.("general")}>mock-style-development</button>
      <button
        onClick={() =>
          onConfirm({
            mode: "custom",
            kind: builderKind,
            topic: "Career discovery",
            roleTitle: builderKind === "hiring" ? "Ops Lead" : "",
            questions: [{ text: "What drew you here?", theme: "warm_up" }],
          })
        }
      >
        mock-builder-confirm
      </button>
    </div>
  ),
}))
jest.mock("@/components/interview/InterviewSubjectPicker", () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (s: string) => void }) => (
    <button onClick={() => onChange("member-sub-1")}>mock-pick-subject</button>
  ),
}))
jest.mock("@/components/interview/AnswerScorePanel", () => ({
  __esModule: true,
  default: (p: {
    question: { question: string }
    number: number
    total: number
    consentMode: string
    developmentMode?: boolean
    bankEntry?: unknown
    onSubmitAnswer: (t: string) => void
    onSaveScore: (s: number, n: string) => void
  }) => (
    <div data-testid="panel" data-dev={String(p.developmentMode)} data-bank={p.bankEntry ? "yes" : "no"} data-consent={p.consentMode}>
      <p>{`panel ${p.number}/${p.total}: ${p.question.question}`}</p>
      <button onClick={() => p.onSubmitAnswer("the captured answer")}>mock-submit</button>
      <button onClick={() => p.onSaveScore(4, "solid result")}>mock-save</button>
    </div>
  ),
}))

import LiveInterviewBody from "../../../LiveInterviewBody"
import StudioInterviewBody from "../../../StudioInterviewBody"
import InterviewRunBody from "../InterviewRunBody"

// ── Today's session shapes ─────────────────────────────────────────

const answer = (over: Record<string, unknown>) => ({
  answer_id: "a1",
  competency_id: "c1",
  question_text: "Tell me about a turnaround.",
  captured_answer: "I rebuilt the rota.",
  suggested_score: 3,
  star_evidence: null,
  final_score: 4,
  final_source: "human",
  interviewer_notes: "clear result",
  ...over,
})

const FEEDBACK = {
  generated: true,
  summary: "Thoughtful and specific.",
  strengths: ["Owns outcomes"],
  development_areas: ["Say more about your own part"],
  per_section: { warm_up: "Opened well" },
}

type Shape = { name: string; source: "star" | "custom"; detail: Record<string, unknown> }

const SHAPES: Shape[] = [
  {
    name: "hiring, finalized, linked candidate, mixed human / model / undecided answers",
    source: "star",
    detail: {
      session: {
        session_id: "s-star",
        frame: { roleTitle: "Ops Supervisor", company: "Acme", mode: "star" },
        candidate: { display_name: "Candidate A", candidate_id: "cand-1", blueprint_id: "bp-1" },
        consent: { captured: true, mode: "no_audio" },
        status: "finalized",
      },
      plan: [{ competency_id: "c1", section: "vision", question: "Tell me about a turnaround." }],
      answers: [
        answer({}),
        answer({ answer_id: "a2", competency_id: "c2", final_source: "model", final_score: 3, interviewer_notes: "" }),
        answer({ answer_id: "a3", competency_id: "c3", final_source: null, final_score: 3, question_text: "" }),
      ],
      status: "finalized",
      section_scores: { vision: { mean: 4 }, delivery: { mean: 3 } },
      overall_score: 3.67,
      recommendation: "Strong alignment",
      candidate_ref: { display_name: "Candidate A" },
    },
  },
  {
    name: "hiring, legacy session with no mode on the frame, abandoned, no roll-up",
    source: "star",
    detail: {
      session: { session_id: "s-legacy", frame: { roleTitle: "Lead", company: "Acme" }, status: "abandoned" },
      plan: [],
      answers: [answer({ final_source: null })],
      status: "abandoned",
      section_scores: {},
      overall_score: null,
      recommendation: null,
      candidate_ref: { candidate_hash: "abcdef0123456789" },
    },
  },
  {
    name: "own questions (selection style), finalized, with feedback and per-section notes",
    source: "custom",
    detail: {
      session: {
        session_id: "s-own",
        frame: { mode: "custom", kind: "hiring", topic: "Ops Lead screen", roleTitle: "Ops Lead" },
        candidate: { display_name: "Participant B" },
        consent: { captured: true, mode: "no_audio" },
        status: "finalized",
      },
      plan: [{ competency_id: "q1", section: "warm_up", question: "What drew you here?" }],
      answers: [answer({ competency_id: "q1", question_text: "What drew you here?" })],
      status: "finalized",
      section_scores: { warm_up: { mean: 4 } },
      overall_score: 4,
      recommendation: "strong alignment",
      feedback: FEEDBACK,
      candidate_ref: { display_name: "Participant B" },
    },
  },
  {
    name: "development conversation, finalized, feedback, one unrated answer",
    source: "custom",
    detail: {
      session: {
        session_id: "s-dev",
        frame: { mode: "custom", kind: "general", topic: "Career discovery" },
        candidate: { display_name: "Participant C" },
        consent: { captured: true, mode: "no_audio" },
        status: "finalized",
      },
      plan: [{ competency_id: "q1", section: "warm_up", question: "What drew you here?" }],
      answers: [
        answer({ competency_id: "q1" }),
        answer({ answer_id: "a9", competency_id: "q2", final_source: null, suggested_score: null }),
      ],
      status: "finalized",
      section_scores: { warm_up: { mean: 4 }, values_and_goals: { mean: 3.5 } },
      overall_score: 3.75,
      recommendation: "developing",
      feedback: FEEDBACK,
      candidate_ref: { display_name: "Participant C" },
    },
  },
]

const sessionUrl = (id: string) => `/manager/interview-live?session=${id}`

function renderAt(ui: ReactElement, path: string) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

beforeEach(() => {
  jest.clearAllMocks()
  builderKind = "general"
})

describe("reopened write-ups are identical, HTML for HTML", () => {
  it.each(SHAPES)("$name", async ({ source, detail }) => {
    const sid = (detail.session as { session_id: string }).session_id
    getSession.mockResolvedValue(detail)

    const old =
      source === "star"
        ? renderAt(<LiveInterviewBody />, sessionUrl(sid))
        : renderAt(<StudioInterviewBody openSessionId={sid} />, "/manager/interview-studio")
    await screen.findByText(/reopened for review/i)
    const oldHtml = old.container.innerHTML
    // Not vacuous: the old write-up is really on screen.
    expect(oldHtml).toContain("Overall score:")
    expect(oldHtml).toContain("Answer-by-answer")
    cleanup()

    const fresh = renderAt(
      <InterviewRunBody initialKind={source === "star" ? "hiring" : "own"} />,
      `/manager/interview-studio?session=${sid}`,
    )
    await screen.findByText(/reopened for review/i)
    expect(fresh.container.innerHTML).toBe(oldHtml)
    // Never re-scored.
    expect(finalizeMutate).not.toHaveBeenCalled()
  })

  it("a session opens in the kind it was run as, whichever address it arrives on", async () => {
    const custom = SHAPES[3].detail
    getSession.mockResolvedValue(custom)
    renderAt(<StudioInterviewBody openSessionId="s-dev" />, "/")
    await screen.findByText(/reopened for review/i)
    const studioHtml = document.body.innerHTML
    cleanup()
    // Arriving on Live's address (initial kind Hiring) still renders Studio's write-up.
    renderAt(<InterviewRunBody initialKind="hiring" />, sessionUrl("s-dev"))
    await screen.findByText(/reopened for review/i)
    expect(document.body.innerHTML).toBe(studioHtml)
  })
})

// ── A full run, old against new ────────────────────────────────────

const PLAN_STAR = [
  { competency_id: "c1", section: "vision", question: "Tell me about a turnaround." },
  { competency_id: "c2", section: "delivery", question: "Describe a missed deadline." },
]
const PLAN_CUSTOM = [{ competency_id: "q1", section: "warm_up", question: "What drew you here?" }]

const FINALIZE = (over: Record<string, unknown> = {}) => ({
  session: { session_id: "s1" },
  answers: [answer({ answer_id: "a1" })],
  unrated: [{ answer_id: "a7", competency_id: "c2", question_text: "Describe a missed deadline." }],
  answer_count: 2,
  section_scores: { vision: { mean: 4 }, warm_up: { mean: 4 } },
  overall_score: 4,
  overall_mean: 4,
  recommendation: "Strong alignment",
  feedback: FEEDBACK,
  scorecard_draft: { written: true, dimensions_scored: 5 },
  ...over,
})

type Captured = {
  create: unknown[]
  submit: unknown[]
  score: unknown[]
  finalize: unknown[]
  steps: unknown[]
  exportArgs: unknown[]
  html: string
  panel: string
}

async function runThrough(
  ui: ReactElement,
  path: string,
  opts: { who: "candidate" | "participant"; link: boolean; questions: "frame" | "builder"; pickSubject: boolean; answers: number },
): Promise<Captured> {
  const user = userEvent.setup()
  const view = renderAt(ui, path)
  await user.click(screen.getByText("mock-consent"))
  if (opts.link) await user.click(screen.getByText("mock-link-candidate"))
  else await user.type(screen.getByLabelText(opts.who === "candidate" ? /candidate name/i : /^name$/i), "Person A")
  await user.click(screen.getByRole("button", { name: /continue/i }))
  if (opts.questions === "frame") {
    await user.click(screen.getByText("mock-frame-confirm"))
  } else {
    if (opts.pickSubject) await user.click(screen.getByText("mock-pick-subject"))
    await user.click(screen.getByText("mock-builder-confirm"))
  }
  await screen.findByTestId("panel")
  const panel = screen.getByTestId("panel").outerHTML
  for (let i = 0; i < opts.answers; i++) {
    await user.click(screen.getByText("mock-submit"))
    await user.click(screen.getByText("mock-save"))
    await user.click(await screen.findByRole("button", { name: /next question|finish & view results/i }))
  }
  await screen.findByText("What the evidence shows", undefined, { timeout: 2000 }).catch(() =>
    screen.findByText("Overall assessment"),
  )
  await user.click(screen.getByRole("button", { name: /word/i }))
  await waitFor(() => expect(exportDownload).toHaveBeenCalled())
  const captured: Captured = {
    create: createMutate.mock.calls.map((c) => c[0]),
    submit: submitMutate.mock.calls.map((c) => c[0]),
    score: scoreMutate.mock.calls.map((c) => c[0]),
    finalize: finalizeMutate.mock.calls.map((c) => c[0]),
    steps: stepMutate.mock.calls.map((c) => c[0]),
    exportArgs: exportDownload.mock.calls.map((c) => c),
    html: view.container.innerHTML,
    panel,
  }
  cleanup()
  jest.clearAllMocks()
  return captured
}

function primeServer(plan: unknown[], finalize: Record<string, unknown>) {
  createMutate.mockResolvedValue({ session_id: "s1", plan })
  submitMutate.mockResolvedValue({ answer_id: "a1", suggested_score: 4, star_evidence: null })
  scoreMutate.mockResolvedValue({ answer_id: "a1", final_score: 4, interviewer_notes: "solid result" })
  finalizeMutate.mockResolvedValue(finalize)
  stepMutate.mockImplementation(async ({ step }: { step: string }) => ({ status: step }))
  exportDownload.mockResolvedValue(undefined)
}

function expectSame(a: Captured, b: Captured) {
  // Not vacuous: the old run really created, answered, rated, finished and exported.
  expect(a.create).toHaveLength(1)
  expect(a.score.length).toBeGreaterThan(0)
  expect(a.finalize).toHaveLength(1)
  expect(a.exportArgs).toHaveLength(1)
  expect(a.html).toContain("Overall score:")
  expect(b.create).toEqual(a.create)
  expect(b.submit).toEqual(a.submit)
  expect(b.score).toEqual(a.score)
  expect(b.finalize).toEqual(a.finalize)
  expect(b.steps).toEqual(a.steps)
  expect(b.exportArgs).toEqual(a.exportArgs)
  expect(b.panel).toBe(a.panel)
  expect(b.html).toBe(a.html)
}

describe("a full run sends the same requests and writes up the same", () => {
  it("Hiring, with a linked candidate (pipeline steps, scorecard line)", async () => {
    primeServer(PLAN_STAR, FINALIZE())
    const old = await runThrough(<LiveInterviewBody />, "/manager/interview-live", {
      who: "candidate", link: true, questions: "frame", pickSubject: false, answers: 2,
    })
    primeServer(PLAN_STAR, FINALIZE())
    const fresh = await runThrough(<InterviewRunBody initialKind="hiring" />, "/manager/interview-live", {
      who: "candidate", link: true, questions: "frame", pickSubject: false, answers: 2,
    })
    expectSame(old, fresh)
    // The facts this rests on, stated rather than only compared:
    expect(fresh.create[0]).not.toHaveProperty("subject_sub")
    expect(fresh.steps).toEqual([
      { candidateId: "cand-1", step: "interview-scheduled", interviewSessionId: "s1" },
      { candidateId: "cand-1", step: "interview-completed", interviewSessionId: "s1" },
    ])
    expect(fresh.panel).toContain('data-bank="yes"')
    expect(fresh.panel).toContain('data-dev="false"')
  })

  it("Hiring, without a link, and a failed scorecard write", async () => {
    primeServer(PLAN_STAR, FINALIZE({ scorecard_draft: { written: false, reason: "no blueprint" }, feedback: undefined }))
    const old = await runThrough(<LiveInterviewBody />, "/x", {
      who: "candidate", link: false, questions: "frame", pickSubject: false, answers: 2,
    })
    primeServer(PLAN_STAR, FINALIZE({ scorecard_draft: { written: false, reason: "no blueprint" }, feedback: undefined }))
    const fresh = await runThrough(<InterviewRunBody initialKind="hiring" />, "/x", {
      who: "candidate", link: false, questions: "frame", pickSubject: false, answers: 2,
    })
    expectSame(old, fresh)
    expect(fresh.steps).toEqual([])
  })

  it("Development conversation with a subject: subject_sub is sent, exactly as Studio sends it", async () => {
    builderKind = "general"
    primeServer(PLAN_CUSTOM, FINALIZE({ recommendation: "developing" }))
    const old = await runThrough(<StudioInterviewBody />, "/x", {
      who: "participant", link: false, questions: "builder", pickSubject: true, answers: 1,
    })
    builderKind = "general"
    primeServer(PLAN_CUSTOM, FINALIZE({ recommendation: "developing" }))
    const fresh = await runThrough(<InterviewRunBody initialKind="development" />, "/x", {
      who: "participant", link: false, questions: "builder", pickSubject: true, answers: 1,
    })
    expectSame(old, fresh)
    expect(fresh.create[0]).toMatchObject({ subject_sub: "member-sub-1" })
    expect(fresh.panel).toContain('data-dev="true"')
    expect(fresh.panel).toContain('data-bank="no"')
  })

  it("Your own questions (selection style): a chosen subject is NEVER sent (S-3 / D3)", async () => {
    builderKind = "hiring"
    primeServer(PLAN_CUSTOM, FINALIZE())
    const old = await runThrough(<StudioInterviewBody />, "/x", {
      who: "participant", link: true, questions: "builder", pickSubject: true, answers: 1,
    })
    builderKind = "hiring"
    primeServer(PLAN_CUSTOM, FINALIZE())
    const fresh = await runThrough(<InterviewRunBody initialKind="own" />, "/x", {
      who: "participant", link: true, questions: "builder", pickSubject: true, answers: 1,
    })
    expectSame(old, fresh)
    expect(fresh.create[0]).not.toHaveProperty("subject_sub")
    // Studio never wrote pipeline steps; the one build does not start to.
    expect(fresh.steps).toEqual([])
  })
})

// ── The one build's own behaviour (new; nothing to compare against) ──

describe("the one build — kinds and setup", () => {
  it("starts on the kind the page names and offers all three", () => {
    renderAt(<InterviewRunBody initialKind="own" />, "/x")
    expect(screen.getByRole("button", { name: /your own questions/i })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /^hiring/i })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: /development conversation/i })).toBeInTheDocument()
  })

  it("a hiring interview asks for the candidate; the others for the person", async () => {
    const user = userEvent.setup()
    renderAt(<InterviewRunBody initialKind="own" />, "/x")
    await user.click(screen.getByRole("button", { name: /^hiring/i }))
    await user.click(screen.getByText("mock-consent"))
    expect(screen.getByText("Who are you interviewing?")).toBeInTheDocument()
    expect(screen.getByTestId("run-kind")).toHaveTextContent("Hiring")
    await user.click(screen.getByRole("button", { name: "Change" }))
    await user.click(screen.getByRole("button", { name: /development conversation/i }))
    await user.click(screen.getByText("mock-consent"))
    expect(screen.getByText("Who is this interview with?")).toBeInTheDocument()
  })

  it.each([
    ["own", "hiring"],
    ["development", "general"],
  ] as const)("hands the question builder the style for %s", async (kind, style) => {
    const user = userEvent.setup()
    renderAt(<InterviewRunBody initialKind={kind} />, "/x")
    await user.click(screen.getByText("mock-consent"))
    await user.type(screen.getByLabelText(/^name$/i), "Person A")
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(builderProps).toHaveBeenLastCalledWith({ initialKind: style })
  })

  it("follows a style change made inside the builder", async () => {
    const user = userEvent.setup()
    renderAt(<InterviewRunBody initialKind="development" />, "/x")
    await user.click(screen.getByText("mock-consent"))
    await user.type(screen.getByLabelText(/^name$/i), "Person A")
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(screen.getByTestId("run-kind")).toHaveTextContent("Development conversation")
    await user.click(screen.getByText("mock-style-selection"))
    expect(screen.getByTestId("run-kind")).toHaveTextContent("Your own questions")
  })

  it("fetches the standard question bank for a hiring interview only, as before", async () => {
    const user = userEvent.setup()
    renderAt(<InterviewRunBody initialKind="own" />, "/x")
    expect(bankParams).toHaveBeenLastCalledWith({ includeExemplars: true, enabled: false })
    await user.click(screen.getByRole("button", { name: /^hiring/i }))
    expect(bankParams).toHaveBeenLastCalledWith({ includeExemplars: true, enabled: true })
  })

  it("a candidate named in the address makes it a hiring interview", () => {
    renderAt(<InterviewRunBody initialKind="own" />, "/x?blueprintId=bp-1&candidateId=cand-1")
    expect(screen.getByRole("button", { name: /^hiring/i })).toHaveAttribute("aria-pressed", "true")
  })
})

describe("the one build — the development subject", () => {
  it("is dropped the moment the style leaves development, as in Studio, old and new alike", async () => {
    const drive = async (ui: ReactElement) => {
      const user = userEvent.setup()
      primeServer(PLAN_CUSTOM, FINALIZE())
      renderAt(ui, "/x")
      await user.click(screen.getByText("mock-consent"))
      await user.type(screen.getByLabelText(/^name$/i), "Person A")
      await user.click(screen.getByRole("button", { name: /continue/i }))
      await user.click(screen.getByText("mock-pick-subject"))
      await user.click(screen.getByText("mock-style-selection"))
      await user.click(screen.getByText("mock-style-development"))
      await user.click(screen.getByText("mock-builder-confirm"))
      await screen.findByTestId("panel")
      const body = createMutate.mock.calls[0][0]
      cleanup()
      jest.clearAllMocks()
      return body
    }
    builderKind = "general"
    const old = await drive(<StudioInterviewBody />)
    const fresh = await drive(<InterviewRunBody initialKind="development" />)
    expect(old).not.toHaveProperty("subject_sub")
    expect(fresh).toEqual(old)
  })
})

describe("the one build — failure states", () => {
  it("says so when the interview cannot start", async () => {
    const user = userEvent.setup()
    createMutate.mockRejectedValue(new Error("boom"))
    renderAt(<InterviewRunBody initialKind="hiring" />, "/x")
    await user.click(screen.getByText("mock-consent"))
    await user.type(screen.getByLabelText(/candidate name/i), "Person A")
    await user.click(screen.getByRole("button", { name: /continue/i }))
    await user.click(screen.getByText("mock-frame-confirm"))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not start the interview. Please try again."))
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument()
  })

  it("a failed finish is a state with Try again, never a forever-spinner", async () => {
    const user = userEvent.setup()
    primeServer(PLAN_CUSTOM, FINALIZE())
    finalizeMutate.mockRejectedValueOnce(new Error("finalize down"))
    renderAt(<InterviewRunBody initialKind="own" />, "/x")
    await user.click(screen.getByText("mock-consent"))
    await user.type(screen.getByLabelText(/^name$/i), "Person A")
    await user.click(screen.getByRole("button", { name: /continue/i }))
    await user.click(screen.getByText("mock-builder-confirm"))
    await user.click(await screen.findByText("mock-submit"))
    await user.click(screen.getByText("mock-save"))
    await user.click(await screen.findByRole("button", { name: /finish & view results/i }))
    expect(await screen.findByText("finalize down")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText("Overall assessment")).toBeInTheDocument()
  })

  it("ending with the current answer unsaved asks first, and keeps going on No", async () => {
    const user = userEvent.setup()
    primeServer(PLAN_STAR, FINALIZE())
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false)
    renderAt(<InterviewRunBody initialKind="hiring" />, "/x")
    await user.click(screen.getByText("mock-consent"))
    await user.type(screen.getByLabelText(/candidate name/i), "Person A")
    await user.click(screen.getByRole("button", { name: /continue/i }))
    await user.click(screen.getByText("mock-frame-confirm"))
    await screen.findByTestId("panel")
    await user.click(screen.getByRole("button", { name: /end interview/i }))
    expect(confirm).toHaveBeenCalled()
    expect(finalizeMutate).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it("resumes an unfinished development conversation in its own kind", async () => {
    getSession.mockResolvedValue({
      ...SHAPES[3].detail,
      status: "in_progress",
      answers: [],
      session: { ...(SHAPES[3].detail.session as object), status: "in_progress" },
    })
    renderAt(<InterviewRunBody initialKind="hiring" />, "/x?session=s-dev")
    const panel = await screen.findByTestId("panel")
    expect(panel).toHaveAttribute("data-dev", "true")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Development conversation")
    expect(createMutate).not.toHaveBeenCalled()
  })
})
