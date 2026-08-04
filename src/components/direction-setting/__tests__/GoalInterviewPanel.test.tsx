/**
 * The goal interview, run in Direction Setting as a spoken conversation.
 *
 * What matters here is not that a chat panel renders. It is that:
 *
 *  - it drives the **same** structured routes as the Summit panel, so there is
 *    still one goal store and one list of goals;
 *  - voice is the default, because a goal interview is a conversation;
 *  - text is a complete alternative, not a degraded one;
 *  - a spoken answer does not commit itself before the person can catch a
 *    mis-transcription.
 */
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { SummitSession } from "@/types/summit"

const mockGetGoalSession = jest.fn()
const mockAskCategory = jest.fn()
const mockWhyLadder = jest.fn()
const mockSaveDiscovery = jest.fn()
const mockSynthesizeGoals = jest.fn()

jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  askCategory: (...a: unknown[]) => mockAskCategory(...a),
  whyLadder: (...a: unknown[]) => mockWhyLadder(...a),
  saveDiscovery: (...a: unknown[]) => mockSaveDiscovery(...a),
  synthesizeGoals: () => mockSynthesizeGoals(),
}))

// Voice. Captured rather than stubbed away, so the tests can assert that
// Summit actually speaks and actually listens.
const mockSpeak = jest.fn().mockResolvedValue(undefined)
const mockStopSpeaking = jest.fn()
jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: mockSpeak,
    stop: mockStopSpeaking,
    pause: jest.fn(),
    resume: jest.fn(),
    isOnline: true,
    activeProvider: null,
    speaking: false,
  }),
}))

let dictationOnFinal: ((chunk: string) => void) | null = null
const mockStartListening = jest.fn()
const mockStopListening = jest.fn()
let dictationSupported = true
jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: (opts: { onFinal?: (c: string) => void }) => {
    dictationOnFinal = opts?.onFinal ?? null
    return {
      supported: dictationSupported,
      listening: false,
      start: mockStartListening,
      stop: mockStopListening,
      toggle: jest.fn(),
    }
  },
}))

import GoalInterviewPanel, {
  AUTO_SEND_DELAY_MS,
} from "@/components/direction-setting/GoalInterviewPanel"

function session(): SummitSession {
  const explored = (label: string) => ({
    label,
    status: "explored" as const,
    answers: [],
    summary: "",
  })
  return {
    version: 1,
    categories: {
      history: explored("Career History"),
      job: explored("Current Job Situation"),
      workplace: explored("Workplace Situation"),
      ambitions: explored("Career Ambitions"),
      personal: { label: "Personal Goals", status: "todo", answers: [], summary: "" },
    },
    goals: [],
    why_roots: [],
  }
}

function renderPanel(props = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <GoalInterviewPanel {...props} />
    </QueryClientProvider>
  )
}

beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  dictationSupported = true
  dictationOnFinal = null
  mockGetGoalSession.mockResolvedValue(session())
  mockAskCategory.mockResolvedValue({
    category: "personal",
    label: "Personal Goals",
    intro: "Let's talk about you outside work.",
    questions: ["What do you do that has nothing to do with your job?"],
  })
  mockSaveDiscovery.mockResolvedValue(session())
  mockWhyLadder.mockResolvedValue({
    is_root: false,
    question: "And why does that matter to you?",
    root: "",
  })
  mockSynthesizeGoals.mockResolvedValue({ goals: [], session: session() })
})

async function startIt(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /the conversation/i }))
  await screen.findByText("Let's talk about you outside work.")
}

describe("it is the same interview, not a second one", () => {
  it("drives the structured goal routes", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    // Same endpoint the Summit panel calls, against the same store — which is
    // what stops this becoming a rival list of goals.
    expect(mockAskCategory).toHaveBeenCalledWith("personal")
  })

  it("resumes at the first unexplored category", async () => {
    const user = userEvent.setup()
    renderPanel()
    expect(
      await screen.findByRole("button", { name: /continue the conversation/i })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(mockAskCategory).toHaveBeenCalledWith("personal")
  })

  it("tells the caller when goals were synthesised so the stage can advance", async () => {
    mockSynthesizeGoals.mockResolvedValue({
      goals: [{ goal_id: "g1", title: "Lead the review", status: "proposed" }],
      session: session(),
    })
    const onGoalsSynthesised = jest.fn()
    const user = userEvent.setup()
    renderPanel({ onGoalsSynthesised })
    await user.click(
      await screen.findByRole("button", { name: /continue the conversation/i })
    )
    await screen.findByText("Let's talk about you outside work.")
    await user.click(screen.getByRole("button", { name: /draft my goals now/i }))
    await waitFor(() => expect(onGoalsSynthesised).toHaveBeenCalledWith(1))
  })
})

describe("voice", () => {
  it("is on by default — this is meant to be a conversation", async () => {
    renderPanel()
    const toggle = await screen.findByRole("switch", { name: /voice mode/i })
    expect(toggle).toBeChecked()
  })

  it("speaks Summit's questions aloud", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    await waitFor(() =>
      expect(mockSpeak).toHaveBeenCalledWith("Let's talk about you outside work.")
    )
  })

  it("opens the mic once a question has been read", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    await waitFor(() => expect(mockStartListening).toHaveBeenCalled())
  })

  it("stops speaking and listening when voice is switched off", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    await user.click(screen.getByRole("switch", { name: /voice mode/i }))
    expect(mockStopSpeaking).toHaveBeenCalled()
    expect(mockStopListening).toHaveBeenCalled()
  })

  it("does not read the same turn twice", async () => {
    // The platform has shipped a double-read before; a re-render must not
    // re-speak a turn that has already been read.
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    await waitFor(() => expect(mockSpeak).toHaveBeenCalled())
    const callsForIntro = mockSpeak.mock.calls.filter(
      (c) => c[0] === "Let's talk about you outside work."
    ).length
    expect(callsForIntro).toBe(1)
  })

  it("disables the mic with an explanation when the browser can't do speech", async () => {
    dictationSupported = false
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    const mic = screen.getByRole("button", {
      name: /voice input isn't supported/i,
    })
    expect(mic).toBeDisabled()
    // Typing must still work — an unsupported browser is not a dead end.
    expect(screen.getByLabelText("Your answer")).toBeEnabled()
  })
})

describe("a spoken answer is recoverable", () => {
  it("waits before sending, so a mis-transcription can be caught", async () => {
    jest.useFakeTimers({ doNotFake: ["performance"] })
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      renderPanel()
      await user.click(await screen.findByRole("button", { name: /the conversation/i }))
      await screen.findByText("Let's talk about you outside work.")

      act(() => {
        dictationOnFinal?.("I read a lot")
      })
      // Not sent yet — the beat is the whole point.
      expect(mockSaveDiscovery).not.toHaveBeenCalled()
      // The cancel affordance is the unambiguous proof the beat is showing —
      // "sending your answer" appears in both the banner and the sr-only live
      // region, so a text query matches two nodes.
      expect(screen.getByRole("button", { name: /hold on/i })).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(AUTO_SEND_DELAY_MS + 50)
      })
      await waitFor(() => expect(mockSaveDiscovery).toHaveBeenCalled())
    } finally {
      jest.useRealTimers()
    }
  })

  it("cancelling holds the answer in the box instead of sending it", async () => {
    jest.useFakeTimers({ doNotFake: ["performance"] })
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      renderPanel()
      await user.click(await screen.findByRole("button", { name: /the conversation/i }))
      await screen.findByText("Let's talk about you outside work.")

      act(() => {
        dictationOnFinal?.("I raed a lot")
      })
      await user.click(screen.getByRole("button", { name: /hold on/i }))

      act(() => {
        jest.advanceTimersByTime(AUTO_SEND_DELAY_MS * 3)
      })
      expect(mockSaveDiscovery).not.toHaveBeenCalled()
      expect(screen.getByLabelText("Your answer")).toHaveValue("I raed a lot")
    } finally {
      jest.useRealTimers()
    }
  })
})

describe("text mode is a complete alternative", () => {
  it("answers by typing when voice is off", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startIt(user)
    await user.click(screen.getByRole("switch", { name: /voice mode/i }))

    await user.type(screen.getByLabelText("Your answer"), "I read a lot")
    await user.click(screen.getByRole("button", { name: "Send" }))
    await waitFor(() => expect(mockSaveDiscovery).toHaveBeenCalled())
  })

  it("does not speak when voice is off", async () => {
    const user = userEvent.setup()
    renderPanel()
    // Turn voice off BEFORE anything is asked.
    await user.click(await screen.findByRole("switch", { name: /voice mode/i }))
    await startIt(user)
    expect(mockSpeak).not.toHaveBeenCalled()
  })
})
