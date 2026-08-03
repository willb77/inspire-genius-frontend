/**
 * The Summit interview — the loop, end to end.
 *
 * What these pin is the thing that was actually broken: the three structured
 * routes existed and worked, and nothing called them. So the central assertion
 * is not "the panel renders" — it is that answering questions reaches
 * `/ask`, `/why-ladder`, `/discovery/{category}` and `/synthesize`, in that
 * order, and that free-text chat is not used to do it.
 */
import { render, screen, waitFor } from "@testing-library/react"
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

// The old free-text path. Kept mocked so the test can assert it stays unused:
// a panel that quietly fell back to chat would look identical from the outside.
const mockSendSummitMessage = jest.fn()
jest.mock("@/services/summit/summitChat", () => ({
  sendSummitMessage: (...a: unknown[]) => mockSendSummitMessage(...a),
}))

// react-markdown ships ESM that Jest does not transform; the platform's other
// chat tests stub it the same way.
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

import SummitInterviewPanel from "@/components/summit/SummitInterviewPanel"

/** Four categories done, `personal` outstanding — a short but complete run. */
function session(overrides: Partial<SummitSession> = {}): SummitSession {
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
      personal: {
        label: "Personal Goals",
        status: "todo",
        answers: [],
        summary: "",
      },
    },
    goals: [],
    why_roots: [],
    ...overrides,
  }
}

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <SummitInterviewPanel />
    </QueryClientProvider>
  )
}

// jsdom doesn't implement Element.scrollTo — the panel autoscrolls on new turns.
beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
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

async function startInterview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /the conversation/i }))
  await screen.findByText("Let's talk about you outside work.")
}

async function answerWith(
  user: ReturnType<typeof userEvent.setup>,
  text: string
) {
  const box = screen.getByLabelText("Your answer")
  await user.type(box, text)
  await user.click(screen.getByRole("button", { name: "Send" }))
}

describe("the interview drives the structured routes", () => {
  it("asks the first unexplored category, not the first category", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    expect(mockAskCategory).toHaveBeenCalledWith("personal")
  })

  it("puts the questions one at a time and banks the category when done", async () => {
    mockAskCategory.mockResolvedValue({
      category: "personal",
      label: "Personal Goals",
      intro: "Let's talk about you outside work.",
      questions: ["First question?", "Second question?"],
    })
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)

    expect(screen.getByText("First question?")).toBeInTheDocument()
    expect(screen.queryByText("Second question?")).not.toBeInTheDocument()

    await answerWith(user, "I play chess")
    await screen.findByText("Second question?")
    // Not saved until the category is finished — a partial save would append
    // the same answers again on the next pass.
    expect(mockSaveDiscovery).not.toHaveBeenCalled()

    await answerWith(user, "Badly")
    await waitFor(() => expect(mockSaveDiscovery).toHaveBeenCalledTimes(1))
    expect(mockSaveDiscovery).toHaveBeenCalledWith("personal", {
      answers: [
        { question: "First question?", answer: "I play chess" },
        { question: "Second question?", answer: "Badly" },
      ],
      status: "explored",
    })
  })

  it("asks for a stated goal once discovery is finished, then ladders it", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")

    // Discovery over → our own one-sentence question, not the model's.
    await screen.findByText(/in one sentence, what do you actually want to change/i)

    await answerWith(user, "I want to run my own team")
    await waitFor(() =>
      expect(mockWhyLadder).toHaveBeenCalledWith("I want to run my own team", [])
    )
    await screen.findByText("And why does that matter to you?")
  })

  it("climbs the ladder, echoing the trail back each rung", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")
    await screen.findByText(/in one sentence/i)
    await answerWith(user, "I want to run my own team")
    await screen.findByText("And why does that matter to you?")

    mockWhyLadder.mockResolvedValue({
      is_root: true,
      question: "",
      root: "being trusted with the hard calls",
    })
    await answerWith(user, "Because I'm tired of being overruled")

    await waitFor(() =>
      expect(mockWhyLadder).toHaveBeenLastCalledWith("I want to run my own team", [
        {
          question: "And why does that matter to you?",
          answer: "Because I'm tired of being overruled",
        },
      ])
    )
    await screen.findByText(/being trusted with the hard calls/i)
  })

  it("synthesises once the root is reached", async () => {
    mockSynthesizeGoals.mockResolvedValue({
      goals: [
        { goal_id: "g1", title: "Lead the incident review", status: "proposed" },
        { goal_id: "g2", title: "Run a weekly one-to-one", status: "proposed" },
      ],
      session: session(),
    })
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")
    await screen.findByText(/in one sentence/i)

    mockWhyLadder.mockResolvedValue({
      is_root: true,
      question: "",
      root: "being trusted with the hard calls",
    })
    await answerWith(user, "I want to run my own team")

    await waitFor(() => expect(mockSynthesizeGoals).toHaveBeenCalledTimes(1))
    await screen.findByText(/drafted 2 goals/i)
  })

  it("never falls back to free-text chat", async () => {
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")
    await screen.findByText(/in one sentence/i)
    expect(mockSendSummitMessage).not.toHaveBeenCalled()
  })
})

describe("bounds and failure", () => {
  it("stops laddering at the cap even if the backend never says root", async () => {
    // A ladder that never terminates is an interrogation. The server caps too;
    // this asserts the client does not depend on it doing so.
    mockWhyLadder.mockResolvedValue({
      is_root: false,
      question: "But why?",
      root: "",
    })
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")
    await screen.findByText(/in one sentence/i)
    await answerWith(user, "I want to run my own team")

    for (let i = 0; i < 6; i += 1) {
      const box = screen.queryByLabelText("Your answer") as HTMLInputElement | null
      if (!box || box.disabled) break
      await answerWith(user, `because ${i}`)
    }

    await waitFor(() => expect(mockSynthesizeGoals).toHaveBeenCalled())
    expect(mockWhyLadder.mock.calls.length).toBeLessThanOrEqual(5)
  })

  it("says so when a category cannot be saved rather than showing it explored", async () => {
    mockSaveDiscovery.mockRejectedValue(new Error("boom"))
    const user = userEvent.setup()
    renderPanel()
    await startInterview(user)
    await answerWith(user, "I read a lot")
    expect(await screen.findByText(/couldn't save that section/i)).toBeInTheDocument()
  })

  it("recovers from a failed ask without stranding the person", async () => {
    mockAskCategory.mockRejectedValue(new Error("boom"))
    const user = userEvent.setup()
    renderPanel()
    await user.click(
      await screen.findByRole("button", { name: /the conversation/i })
    )
    expect(
      await screen.findByText(/couldn't load the next part/i)
    ).toBeInTheDocument()
    // Back to a startable state, not a dead panel. The error turn retires the
    // empty state, so the retry has to come from somewhere else.
    const retry = screen.getByRole("button", { name: /try again/i })
    expect(retry).toBeEnabled()

    mockAskCategory.mockResolvedValue({
      category: "personal",
      label: "Personal Goals",
      intro: "Let's talk about you outside work.",
      questions: ["What do you do that has nothing to do with your job?"],
    })
    await user.click(retry)
    expect(
      await screen.findByText("Let's talk about you outside work.")
    ).toBeInTheDocument()
  })
})

describe("resuming", () => {
  it("offers to continue when some areas are already explored", async () => {
    const user = userEvent.setup()
    renderPanel()
    expect(
      await screen.findByRole("button", { name: /continue the conversation/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/explored 4 of 5 areas/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(mockAskCategory).toHaveBeenCalledWith("personal")
  })

  it("starts fresh when nothing has been explored", async () => {
    const s = session()
    Object.values(s.categories).forEach((c) => {
      c.status = "todo"
    })
    mockGetGoalSession.mockResolvedValue(s)
    renderPanel()
    expect(
      await screen.findByRole("button", { name: /start the conversation/i })
    ).toBeInTheDocument()
  })

  it("can draft goals from partial discovery without finishing the run", async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(
      await screen.findByRole("button", { name: /continue the conversation/i })
    )
    await screen.findByText("Let's talk about you outside work.")
    await user.click(screen.getByRole("button", { name: /draft my goals now/i }))
    await waitFor(() => expect(mockSynthesizeGoals).toHaveBeenCalledTimes(1))
  })
})
