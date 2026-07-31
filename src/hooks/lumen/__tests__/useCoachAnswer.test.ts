import { act, renderHook, waitFor } from "@testing-library/react"
import { useCoachAnswer } from "../useCoachAnswer"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"

jest.mock("@/hooks/agents/useMeridianJob")

const mockUseMeridianJob = useMeridianJob as jest.MockedFunction<typeof useMeridianJob>

/** Captures the settle callback so a test can drive the job to completion. */
let settle: ((job: ChatJob) => void) | undefined
const mockStartJob = jest.fn()

function job(overrides: Partial<ChatJob> = {}): ChatJob {
  return {
    job_id: "job-1",
    session_id: "sess-1",
    status: "complete",
    message: "",
    content: "Here is what your profile suggests.",
    ...overrides,
  }
}

beforeEach(() => {
  settle = undefined
  mockStartJob.mockReset().mockResolvedValue({
    job_id: "job-1",
    session_id: "sess-1",
    status: "queued",
  })
  mockUseMeridianJob.mockImplementation((options = {}) => {
    settle = options.onJobSettled
    return {
      jobs: [],
      jobsById: {},
      startJob: mockStartJob,
      pollJob: jest.fn(),
      listActiveJobs: jest.fn(),
      notifyPushFrame: jest.fn(),
      removeJob: jest.fn(),
    }
  })
})

describe("useCoachAnswer", () => {
  test("sends the composed prompt but keeps the plain question for display", async () => {
    // Push frames drop `message`, so the question can't be recovered from the
    // settled job — the hook has to remember it across the round trip.
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({
        question: "What should I focus on?",
        prompt: "What should I focus on?\n\nDraw on my PRISM scores.",
      })
    })

    expect(mockStartJob).toHaveBeenCalledTimes(1)
    expect(mockStartJob.mock.calls[0][0].message).toContain("Draw on my PRISM scores.")

    act(() => settle?.(job()))
    await waitFor(() => expect(result.current.answers).toHaveLength(1))
    expect(result.current.answers[0].question).toBe("What should I focus on?")
    expect(result.current.answers[0].answer).toBe("Here is what your profile suggests.")
    expect(result.current.isPending).toBe(false)
  })

  test("reuses one session id so successive questions are one conversation", async () => {
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({ question: "First", prompt: "First" })
    })
    act(() => settle?.(job()))
    await waitFor(() => expect(result.current.answers).toHaveLength(1))
    await act(async () => {
      await result.current.ask({ question: "Second", prompt: "Second" })
    })

    const [first] = mockStartJob.mock.calls[0]
    const [second] = mockStartJob.mock.calls[1]
    expect(second.sessionId).toBe(first.sessionId)
    expect(first.sessionId).toMatch(/^lumen-coaching-/)
  })

  test("a second question is ignored while one is in flight", async () => {
    // One session, one job at a time — overlapping asks would land out of order
    // and the pending bubble can only represent one question.
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({ question: "First", prompt: "First" })
      await result.current.ask({ question: "Second", prompt: "Second" })
    })
    expect(mockStartJob).toHaveBeenCalledTimes(1)
  })

  test("surfaces an error when the job fails", async () => {
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({ question: "Q", prompt: "Q" })
    })
    act(() => settle?.(job({ status: "error", content: null, error: "boom" })))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.answers).toHaveLength(0)
    expect(result.current.isPending).toBe(false)
  })

  test("treats an empty body as a failure rather than showing a blank answer", async () => {
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({ question: "Q", prompt: "Q" })
    })
    act(() => settle?.(job({ content: "   " })))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.answers).toHaveLength(0)
  })

  test("clears the pending state when the job is never accepted", async () => {
    // No job means onJobSettled will never fire, so the spinner would otherwise
    // run forever.
    mockStartJob.mockRejectedValueOnce(new Error("503"))
    const { result } = renderHook(() => useCoachAnswer())
    await act(async () => {
      await result.current.ask({ question: "Q", prompt: "Q" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isPending).toBe(false)
    // ...and the page is not wedged: the next question can still be asked.
    await act(async () => {
      await result.current.ask({ question: "Q2", prompt: "Q2" })
    })
    expect(mockStartJob).toHaveBeenCalledTimes(2)
  })
})
