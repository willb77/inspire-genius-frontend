/**
 * D-16 — the goal interview saves every discovery answer as it is given.
 *
 * Before this, answers were held in the tab until the area closed, so a reload
 * or a second tab lost them silently. What is pinned here:
 *
 *  - one answer → one save of that one answer, always with `expected_rev`,
 *    with the question thread on the thread's first answer only;
 *  - the next question waits for the save;
 *  - closing or skipping an area re-sends nothing (that would duplicate);
 *  - a reload resumes at `answers.length - thread.start` with no `/ask`;
 *  - a 409 from our own retry that already landed counts as saved;
 *  - a 409 from another window is NEVER re-sent: a note, the position
 *    re-derived from the stored session, and the text handed back;
 *  - at area level, a 409 moves on to the next area;
 *  - a save that fails any other way does not advance and keeps the text.
 */
import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { SummitCategory, SummitSession } from "@/types/summit"

const mockGetGoalSession = jest.fn()
const mockAskCategory = jest.fn()
const mockSaveDiscovery = jest.fn()
const mockScreenAnswer = jest.fn()

jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  askCategory: (...a: unknown[]) => mockAskCategory(...a),
  saveDiscovery: (...a: unknown[]) => mockSaveDiscovery(...a),
  screenAnswer: (...a: unknown[]) => mockScreenAnswer(...a),
  whyLadder: jest.fn(),
  synthesizeGoals: jest.fn(),
}))

import {
  ANSWER_NOT_SAVED_ERROR,
  MAX_THREAD_QUESTIONS,
  SESSION_CHANGED_AGAIN_ERROR,
  SESSION_CHANGED_NOTE,
  categoryUnchanged,
  isSessionConflict,
  resumePoint,
  useSummitInterview,
} from "@/hooks/summit/useSummitInterview"

const Q = ["Q1 — how did you get here?", "Q2 — what changed?", "Q3 — what next?"]
const OTHER = ["Other Q1", "Other Q2", "Other Q3"]

function cat(
  label: string,
  status: SummitCategory["status"],
  extra: Partial<SummitCategory> = {}
): SummitCategory {
  return { label, status, answers: [], summary: "", ...extra }
}

/** `history` is the first area; everything after it is still to do. */
function session(
  rev: number,
  history: SummitCategory = cat("Career History", "todo"),
  job: SummitCategory = cat("Current Job Situation", "todo")
): SummitSession {
  return {
    version: 1,
    rev,
    categories: {
      history,
      job,
      workplace: cat("Workplace Situation", "todo"),
      ambitions: cat("Career Ambitions", "todo"),
      personal: cat("Personal Goals", "todo"),
    },
    goals: [],
    why_roots: [],
  }
}

function conflict(rev: number) {
  return Object.assign(new Error("Request failed with status code 409"), {
    response: { status: 409, data: { detail: { code: "goal_session_conflict", rev } } },
  })
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function setup(initial: SummitSession | undefined) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onRestoreAnswer = jest.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    ({ s }: { s: SummitSession | undefined }) =>
      useSummitInterview({ session: s, onRestoreAnswer }),
    { wrapper, initialProps: { s: initial } }
  )
  return { ...hook, onRestoreAnswer, qc }
}

type Hook = ReturnType<typeof setup>["result"]

const texts = (r: Hook) => r.current.turns.map((t) => t.text)
const lastSummit = (r: Hook) =>
  [...r.current.turns].reverse().find((t) => t.role === "summit")

async function startAndWait(r: Hook) {
  await act(async () => {
    r.current.start()
  })
  await waitFor(() => expect(r.current.phase).toBe("question"))
}

async function say(r: Hook, text: string) {
  await act(async () => {
    await r.current.answer(text)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAskCategory.mockResolvedValue({
    category: "history",
    label: "Career History",
    intro: "",
    questions: Q,
  })
  mockScreenAnswer.mockResolvedValue(null)
})

describe("each answer is saved as it is given", () => {
  it("sends one answer with expected_rev, and the thread only with the first", async () => {
    mockSaveDiscovery
      .mockResolvedValueOnce(
        session(5, cat("Career History", "active", {
          answers: [{ question: Q[0], answer: "a1" }],
          thread: { questions: Q, start: 0 },
        }))
      )
      .mockResolvedValueOnce(session(6))
    const { result } = setup(session(4))
    await startAndWait(result)

    await say(result, "a1")
    await say(result, "a2")

    expect(mockSaveDiscovery).toHaveBeenCalledTimes(2)
    expect(mockSaveDiscovery.mock.calls[0]).toEqual([
      "history",
      {
        answers: [{ question: Q[0], answer: "a1" }],
        status: "active",
        expected_rev: 4,
        questions: Q,
      },
    ])
    // The second save is based on the rev the first one returned.
    expect(mockSaveDiscovery.mock.calls[1]).toEqual([
      "history",
      {
        answers: [{ question: Q[1], answer: "a2" }],
        status: "active",
        expected_rev: 5,
        questions: undefined,
      },
    ])
  })

  it("sends expected_rev 0 for a session with no rev yet, never nothing", async () => {
    mockSaveDiscovery.mockResolvedValue(session(1))
    const legacy = session(0)
    delete legacy.rev
    const { result } = setup(legacy)
    await startAndWait(result)
    await say(result, "a1")
    expect(mockSaveDiscovery.mock.calls[0][1].expected_rev).toBe(0)
  })

  it("trims the stored thread to the six questions the server accepts", async () => {
    const many = Array.from({ length: 8 }, (_, i) => `Question ${i + 1}`)
    mockAskCategory.mockResolvedValue({ category: "history", label: "", intro: "", questions: many })
    mockSaveDiscovery.mockResolvedValue(session(1))
    const { result } = setup(session(0))
    await startAndWait(result)
    expect(result.current.questionCount).toBe(MAX_THREAD_QUESTIONS)
    await say(result, "a1")
    expect(mockSaveDiscovery.mock.calls[0][1].questions).toEqual(many.slice(0, 6))
  })

  it("does not show the next question until the save has landed", async () => {
    const pending = deferred<SummitSession>()
    mockSaveDiscovery.mockReturnValue(pending.promise)
    const { result } = setup(session(0))
    await startAndWait(result)

    let answering!: Promise<void>
    act(() => {
      answering = result.current.answer("a1")
    })
    await waitFor(() => expect(mockSaveDiscovery).toHaveBeenCalledTimes(1))
    expect(texts(result)).not.toContain(Q[1])
    expect(result.current.busy).toBe(true)

    await act(async () => {
      pending.resolve(session(1))
      await answering
    })
    expect(texts(result)).toContain(Q[1])
  })

  it("marks the area explored with its last answer, and re-sends nothing when it closes", async () => {
    mockSaveDiscovery.mockImplementation(async (_k: string, body: { expected_rev: number }) =>
      session(body.expected_rev + 1)
    )
    mockAskCategory
      .mockResolvedValueOnce({ category: "history", label: "", intro: "", questions: Q })
      .mockResolvedValueOnce({ category: "job", label: "", intro: "", questions: ["Job Q1"] })
    const { result } = setup(session(0))
    await startAndWait(result)
    await say(result, "a1")
    await say(result, "a2")
    await say(result, "a3")

    expect(mockSaveDiscovery).toHaveBeenCalledTimes(3)
    expect(mockSaveDiscovery.mock.calls.map((c) => c[1].status)).toEqual([
      "active",
      "active",
      "explored",
    ])
    expect(mockSaveDiscovery.mock.calls.every((c) => c[1].answers.length === 1)).toBe(true)
    await waitFor(() => expect(mockAskCategory).toHaveBeenLastCalledWith("job"))
  })

  it("skipping an area sends nothing — its answers are already stored", async () => {
    mockSaveDiscovery.mockResolvedValue(session(1))
    mockAskCategory
      .mockResolvedValueOnce({ category: "history", label: "", intro: "", questions: Q })
      .mockResolvedValueOnce({ category: "job", label: "", intro: "", questions: ["Job Q1"] })
    const { result } = setup(session(0))
    await startAndWait(result)
    await say(result, "a1")
    await act(async () => {
      await result.current.skipCategory()
    })
    expect(mockSaveDiscovery).toHaveBeenCalledTimes(1)
    expect(mockAskCategory).toHaveBeenLastCalledWith("job")
  })
})

describe("a reload resumes from the stored thread", () => {
  it("asks question answers.length - thread.start, without calling /ask", async () => {
    // One answer from before the thread began, two given in it.
    const stored = session(7, cat("Career History", "active", {
      answers: [
        { question: "old", answer: "old answer" },
        { question: Q[0], answer: "a1" },
        { question: Q[1], answer: "a2" },
      ],
      thread: { questions: Q, start: 1 },
    }))
    mockSaveDiscovery.mockResolvedValue(session(8))
    const { result } = setup(stored)
    await startAndWait(result)

    expect(mockAskCategory).not.toHaveBeenCalled()
    expect(lastSummit(result)?.text).toBe(Q[2])
    expect(result.current.questionNumber).toBe(3)
    expect(result.current.questionCount).toBe(3)

    await say(result, "a3")
    expect(mockSaveDiscovery.mock.calls[0][1]).toEqual({
      answers: [{ question: Q[2], answer: "a3" }],
      status: "explored",
      expected_rev: 7,
      questions: undefined,
    })
  })

  it("a partial area saved before threads existed resumes through /ask", async () => {
    const stored = session(2, cat("Career History", "active", {
      answers: [{ question: "old", answer: "old answer" }],
    }))
    const { result } = setup(stored)
    await startAndWait(result)
    expect(mockAskCategory).toHaveBeenCalledWith("history")
    expect(lastSummit(result)?.text).toBe(Q[0])
  })

  it("resumePoint refuses an index outside the thread", () => {
    const s = session(1, cat("Career History", "active", {
      answers: [{ question: "a", answer: "b" }],
      thread: { questions: ["only"], start: 0 },
    }))
    expect(resumePoint(s, "history")).toBeNull()
    expect(resumePoint(session(1), "history")).toBeNull()
  })
})

describe("a 409", () => {
  it("from our own retry that already landed counts as saved, and is not re-sent", async () => {
    // First attempt: the request landed but the response was lost.
    mockSaveDiscovery
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(conflict(5))
    mockGetGoalSession.mockResolvedValue(
      session(5, cat("Career History", "active", {
        answers: [{ question: Q[0], answer: "a1" }],
        thread: { questions: Q, start: 0 },
      }))
    )
    const { result, onRestoreAnswer } = setup(session(4))
    await startAndWait(result)

    await say(result, "a1")
    // Not saved as far as we know: said so, text back, no advance.
    expect(lastSummit(result)?.text).toBe(ANSWER_NOT_SAVED_ERROR)
    expect(onRestoreAnswer).toHaveBeenLastCalledWith("a1")
    expect(texts(result)).not.toContain(Q[1])

    await say(result, "a1")
    // The retry carried the SAME expected_rev, so it could not append twice.
    expect(mockSaveDiscovery).toHaveBeenCalledTimes(2)
    expect(mockSaveDiscovery.mock.calls[1][1].expected_rev).toBe(4)
    // ...and its 409 is recognised as our own: no note, straight on to Q2.
    expect(texts(result)).not.toContain(SESSION_CHANGED_NOTE)
    expect(lastSummit(result)?.text).toBe(Q[1])
    // Screened once, not twice (D-08).
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)

    // The next save builds on the stored rev.
    mockSaveDiscovery.mockResolvedValueOnce(session(6))
    await say(result, "a2")
    expect(mockSaveDiscovery.mock.calls[2][1].expected_rev).toBe(5)
  })

  it("from another window is never re-sent: note, re-derived position, text back", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(conflict(5))
    // The other window answered its first question on its own thread.
    mockGetGoalSession.mockResolvedValue(
      session(5, cat("Career History", "active", {
        answers: [{ question: OTHER[0], answer: "theirs" }],
        thread: { questions: OTHER, start: 0 },
      }))
    )
    const { result, onRestoreAnswer } = setup(session(4))
    await startAndWait(result)

    await say(result, "mine")

    expect(mockSaveDiscovery).toHaveBeenCalledTimes(1)
    expect(texts(result)).toContain(SESSION_CHANGED_NOTE)
    expect(onRestoreAnswer).toHaveBeenLastCalledWith("mine")
    // Caught up onto the stored thread, at its next question — no new /ask.
    expect(mockAskCategory).toHaveBeenCalledTimes(1)
    expect(lastSummit(result)?.text).toBe(OTHER[1])
    expect(result.current.phase).toBe("question")

    // Sending the restored text saves it against the stored thread and rev,
    // without screening it a second time and without re-sending the thread.
    mockSaveDiscovery.mockResolvedValueOnce(session(6))
    await say(result, "mine")
    expect(mockSaveDiscovery).toHaveBeenCalledTimes(2)
    expect(mockSaveDiscovery.mock.calls[1][1]).toEqual({
      answers: [{ question: OTHER[1], answer: "mine" }],
      status: "active",
      expected_rev: 5,
      questions: undefined,
    })
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)
  })

  it("restored text that is edited is screened again", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(conflict(5)).mockResolvedValueOnce(session(6))
    mockGetGoalSession.mockResolvedValue(
      session(5, cat("Career History", "active", {
        answers: [{ question: OTHER[0], answer: "theirs" }],
        thread: { questions: OTHER, start: 0 },
      }))
    )
    const { result } = setup(session(4))
    await startAndWait(result)
    await say(result, "mine")
    await say(result, "mine, edited")
    expect(mockScreenAnswer.mock.calls.map((c) => c[0])).toEqual(["mine", "mine, edited"])
  })

  it("when this area was not touched, asks the same question again on the new rev", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(conflict(9)).mockResolvedValueOnce(session(10))
    // Something else moved (a goal confirmed, say) — history reads the same.
    mockGetGoalSession.mockResolvedValue(session(9))
    const { result, onRestoreAnswer } = setup(session(4))
    await startAndWait(result)
    await say(result, "mine")

    expect(texts(result)).toContain(SESSION_CHANGED_NOTE)
    expect(onRestoreAnswer).toHaveBeenLastCalledWith("mine")
    expect(mockAskCategory).toHaveBeenCalledTimes(1)
    expect(lastSummit(result)?.text).toBe(Q[0])
    expect(mockSaveDiscovery).toHaveBeenCalledTimes(1)

    await say(result, "mine")
    expect(mockSaveDiscovery.mock.calls[1][1]).toEqual({
      answers: [{ question: Q[0], answer: "mine" }],
      status: "active",
      expected_rev: 9,
      questions: Q,
    })
  })

  it("at area level moves on to the next area", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(conflict(8))
    // The other window finished this area while we were in it.
    mockGetGoalSession.mockResolvedValue(
      session(8, cat("Career History", "explored", {
        answers: OTHER.map((q) => ({ question: q, answer: "theirs" })),
        thread: { questions: OTHER, start: 0 },
      }))
    )
    mockAskCategory
      .mockResolvedValueOnce({ category: "history", label: "", intro: "", questions: Q })
      .mockResolvedValueOnce({ category: "job", label: "", intro: "", questions: ["Job Q1"] })
    const { result, onRestoreAnswer } = setup(session(4))
    await startAndWait(result)
    await say(result, "mine")

    expect(mockSaveDiscovery).toHaveBeenCalledTimes(1)
    expect(texts(result)).toContain(SESSION_CHANGED_NOTE)
    expect(onRestoreAnswer).toHaveBeenLastCalledWith("mine")
    await waitFor(() => expect(mockAskCategory).toHaveBeenLastCalledWith("job"))
    expect(result.current.categoryKey).toBe("job")
  })

  it("a second in a row shows the error turn, still without re-sending", async () => {
    const moved = (rev: number, n: number) =>
      session(rev, cat("Career History", "active", {
        answers: OTHER.slice(0, n).map((q) => ({ question: q, answer: "theirs" })),
        thread: { questions: OTHER, start: 0 },
      }))
    mockSaveDiscovery.mockRejectedValueOnce(conflict(5)).mockRejectedValueOnce(conflict(6))
    mockGetGoalSession.mockResolvedValueOnce(moved(5, 1)).mockResolvedValueOnce(moved(6, 2))
    const { result } = setup(session(4))
    await startAndWait(result)
    await say(result, "mine")
    await say(result, "mine")

    expect(mockSaveDiscovery).toHaveBeenCalledTimes(2)
    const errors = result.current.turns.filter((t) => t.kind === "error").map((t) => t.text)
    expect(errors).toEqual([SESSION_CHANGED_AGAIN_ERROR])
    expect(lastSummit(result)?.text).toBe(OTHER[2])
  })
})

describe("a save that fails any other way", () => {
  it("does not advance, says so, and keeps the text", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(new Error("Network Error"))
    const { result, onRestoreAnswer } = setup(session(0))
    await startAndWait(result)
    await say(result, "a1")
    expect(lastSummit(result)?.text).toBe(ANSWER_NOT_SAVED_ERROR)
    expect(onRestoreAnswer).toHaveBeenCalledWith("a1")
    expect(texts(result)).not.toContain(Q[1])
    expect(result.current.questionNumber).toBe(1)
    expect(mockGetGoalSession).not.toHaveBeenCalled()
  })

  it("a 409 whose re-read fails also keeps the text and does not advance", async () => {
    mockSaveDiscovery.mockRejectedValueOnce(conflict(5))
    mockGetGoalSession.mockRejectedValueOnce(new Error("Network Error"))
    const { result, onRestoreAnswer } = setup(session(4))
    await startAndWait(result)
    await say(result, "a1")
    expect(lastSummit(result)?.text).toBe(ANSWER_NOT_SAVED_ERROR)
    expect(onRestoreAnswer).toHaveBeenCalledWith("a1")
    expect(mockSaveDiscovery).toHaveBeenCalledTimes(1)
  })
})

describe("helpers", () => {
  it("isSessionConflict is only the goal-session 409", () => {
    expect(isSessionConflict(conflict(1))).toBe(true)
    expect(isSessionConflict({ response: { status: 409, data: { detail: "other" } } })).toBe(false)
    expect(isSessionConflict({ response: { status: 500, data: {} } })).toBe(false)
    expect(isSessionConflict(new Error("Network Error"))).toBe(false)
    expect(isSessionConflict(null)).toBe(false)
  })

  it("categoryUnchanged compares status, answers and thread", () => {
    const a = session(1)
    expect(categoryUnchanged(a, session(2), "history")).toBe(true)
    expect(
      categoryUnchanged(a, session(2, cat("Career History", "active", {
        answers: [{ question: "q", answer: "x" }],
      })), "history")
    ).toBe(false)
    expect(categoryUnchanged(undefined, a, "history")).toBe(false)
  })
})
