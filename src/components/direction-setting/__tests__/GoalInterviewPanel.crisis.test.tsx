/**
 * D-08 — the goal interview screens every answer, and pauses on a crisis reply.
 *
 * The questions in a category are fetched up front, so before this an answer of
 * any kind was followed by the next question with nothing having read it. What
 * is pinned here:
 *
 *  - a discovery answer is screened BEFORE the next question appears;
 *  - if the server returns its crisis reply, that reply is rendered as an
 *    alert, the next question is not shown, the answer is not banked, and the
 *    interview waits for the person to choose to carry on;
 *  - an ordinary answer behaves exactly as it did;
 *  - a screen that cannot be reached does not hold the interview;
 *  - the stated goal and ladder answers are screened by /why-ladder itself, so
 *    the separate screen call is NOT made for them (one screen per answer);
 *  - the one ladder answer that never reaches /why-ladder — the last, at the
 *    client-side rung cap — is screened by its own call.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { SummitCrisis, SummitSession } from "@/types/summit"
import {
  MAX_LADDER_RUNGS,
  STATED_GOAL_PROMPT,
} from "@/hooks/summit/useSummitInterview"

const mockGetGoalSession = jest.fn()
const mockAskCategory = jest.fn()
const mockWhyLadder = jest.fn()
const mockSaveDiscovery = jest.fn()
const mockSynthesizeGoals = jest.fn()
const mockScreenAnswer = jest.fn()

jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  askCategory: (...a: unknown[]) => mockAskCategory(...a),
  whyLadder: (...a: unknown[]) => mockWhyLadder(...a),
  saveDiscovery: (...a: unknown[]) => mockSaveDiscovery(...a),
  synthesizeGoals: () => mockSynthesizeGoals(),
  screenAnswer: (...a: unknown[]) => mockScreenAnswer(...a),
}))

jest.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    isOnline: true,
    activeProvider: null,
    speaking: false,
  }),
}))

jest.mock("@/hooks/interview/useSpeechDictation", () => ({
  useSpeechDictation: () => ({
    supported: false,
    listening: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: jest.fn(),
  }),
}))

import GoalInterviewPanel from "@/components/direction-setting/GoalInterviewPanel"

const DISTRESS = "honestly I do not see the point of being here any more"
const CRISIS: SummitCrisis = {
  content: "You matter, and you do not have to carry this alone.\n- A helpline: call it.",
  tier: "t1_imminent_self",
  event_id: "evt-1",
  copy_status: "draft",
}
const Q1 = "What do you do that has nothing to do with your job?"
const Q2 = "Who do you spend that time with?"
const WHY1 = "And why does that matter to you?"

function session(personal: "todo" | "explored"): SummitSession {
  const cat = (label: string, status: "todo" | "explored") => ({
    label,
    status,
    answers: [],
    summary: "",
  })
  return {
    version: 1,
    categories: {
      history: cat("Career History", "explored"),
      job: cat("Current Job Situation", "explored"),
      workplace: cat("Workplace Situation", "explored"),
      ambitions: cat("Career Ambitions", "explored"),
      personal: cat("Personal Goals", personal),
    },
    goals: [],
    why_roots: [],
  }
}

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <GoalInterviewPanel />
    </QueryClientProvider>
  )
}

beforeAll(() => {
  Element.prototype.scrollTo = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetGoalSession.mockResolvedValue(session("todo"))
  mockAskCategory.mockResolvedValue({
    category: "personal",
    label: "Personal Goals",
    intro: "Let's talk about you outside work.",
    questions: [Q1, Q2],
  })
  mockSaveDiscovery.mockResolvedValue(session("explored"))
  mockWhyLadder.mockResolvedValue({ is_root: false, question: WHY1, root: "" })
  mockSynthesizeGoals.mockResolvedValue({ goals: [], session: session("explored") })
  mockScreenAnswer.mockResolvedValue(null)
})

type User = ReturnType<typeof userEvent.setup>

/** Start in text mode, with the first question open. */
async function begin(user: User, opening: string) {
  await user.click(await screen.findByRole("button", { name: /the conversation/i }))
  await screen.findByText(opening)
  await user.click(screen.getByRole("switch", { name: /voice mode/i }))
}

async function say(user: User, text: string) {
  await user.type(screen.getByLabelText("Your answer"), text)
  await user.click(screen.getByRole("button", { name: "Send" }))
}

const carryOn = () => screen.getByRole("button", { name: /carry on with the interview/i })

describe("a discovery answer", () => {
  it("a distress answer is screened, the crisis reply is shown, and the next question is not", async () => {
    mockScreenAnswer.mockImplementation(async (t: string) => (t === DISTRESS ? CRISIS : null))
    const user = userEvent.setup()
    renderPanel()
    await begin(user, Q1)

    await say(user, DISTRESS)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("You matter, and you do not have to carry this alone.")
    expect(alert).toHaveTextContent("A helpline: call it.")
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)
    expect(mockScreenAnswer).toHaveBeenCalledWith(DISTRESS)
    // Paused: the pre-fetched next question is not shown, nothing is banked,
    // no answer can be typed, and the draft action is not on offer.
    expect(screen.queryByText(Q2)).not.toBeInTheDocument()
    expect(mockSaveDiscovery).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Your answer")).toBeDisabled()
    expect(screen.getByText("Paused")).toBeInTheDocument()
    expect(carryOn()).toBeInTheDocument()
  })

  it("carrying on reopens the same question, and the distress answer is never banked", async () => {
    mockScreenAnswer.mockImplementation(async (t: string) => (t === DISTRESS ? CRISIS : null))
    const user = userEvent.setup()
    renderPanel()
    await begin(user, Q1)
    await say(user, DISTRESS)
    await screen.findByRole("alert")

    await user.click(carryOn())
    // The interrupted question is asked again — not skipped.
    await waitFor(() => expect(screen.getAllByText(Q1)).toHaveLength(2))
    expect(screen.queryByText(Q2)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /carry on with the interview/i })).toBeNull()

    await say(user, "I row at the weekend")
    await screen.findByText(Q2)
    await say(user, "With my sister")
    // D-16: each answer is saved as it is given — the distress answer never.
    await waitFor(() => expect(mockSaveDiscovery).toHaveBeenCalledTimes(2))
    expect(mockSaveDiscovery.mock.calls.map((c) => c[1].answers)).toEqual([
      [{ question: Q1, answer: "I row at the weekend" }],
      [{ question: Q2, answer: "With my sister" }],
    ])
    // One screen per answer given, in order.
    expect(mockScreenAnswer.mock.calls.map((c) => c[0])).toEqual([
      DISTRESS,
      "I row at the weekend",
      "With my sister",
    ])
  })

  it("an ordinary answer is screened and then gets the next question, as before", async () => {
    const user = userEvent.setup()
    renderPanel()
    await begin(user, Q1)

    await say(user, "I row at the weekend")

    await screen.findByText(Q2)
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)
    expect(mockScreenAnswer).toHaveBeenCalledWith("I row at the weekend")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button", { name: /carry on with the interview/i })).toBeNull()
  })

  it("a screen that cannot be reached does not hold the interview", async () => {
    mockScreenAnswer.mockRejectedValue(new Error("timeout of 4000ms exceeded"))
    const user = userEvent.setup()
    renderPanel()
    await begin(user, Q1)

    await say(user, "I row at the weekend")

    await screen.findByText(Q2)
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("the stated goal and the why ladder", () => {
  beforeEach(() => {
    // Every category explored: the interview opens on the stated goal.
    mockGetGoalSession.mockResolvedValue(session("explored"))
  })

  it("a crisis reply to the stated goal pauses, and is not screened a second time", async () => {
    mockWhyLadder.mockResolvedValue({ is_root: false, question: "", root: "", crisis: CRISIS })
    const user = userEvent.setup()
    renderPanel()
    await begin(user, STATED_GOAL_PROMPT)

    await say(user, DISTRESS)

    expect(await screen.findByRole("alert")).toHaveTextContent("You matter")
    expect(mockWhyLadder).toHaveBeenCalledWith(DISTRESS, [])
    // /why-ladder screened it server-side. A second call would be a second
    // recorded event — and a second alert — for one disclosure.
    expect(mockScreenAnswer).not.toHaveBeenCalled()
    expect(mockSynthesizeGoals).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Your answer")).toBeDisabled()

    await user.click(carryOn())
    await waitFor(() => expect(screen.getAllByText(STATED_GOAL_PROMPT)).toHaveLength(2))
  })

  it("a crisis reply to a ladder answer pauses, and that answer is dropped from the ladder", async () => {
    mockWhyLadder.mockImplementation(async (_goal: string, exchanges: { answer: string }[]) =>
      exchanges.some((e) => e.answer === DISTRESS)
        ? { is_root: false, question: "", root: "", crisis: CRISIS }
        : { is_root: false, question: WHY1, root: "" }
    )
    const user = userEvent.setup()
    renderPanel()
    await begin(user, STATED_GOAL_PROMPT)
    await say(user, "I want to lead a team")
    await screen.findByText(WHY1)

    await say(user, DISTRESS)
    await screen.findByRole("alert")
    expect(mockScreenAnswer).not.toHaveBeenCalled()

    await user.click(carryOn())
    await waitFor(() => expect(screen.getAllByText(WHY1)).toHaveLength(2))
    await say(user, "Because I like helping people grow")
    await waitFor(() => expect(mockWhyLadder).toHaveBeenCalledTimes(3))
    expect(mockWhyLadder).toHaveBeenLastCalledWith("I want to lead a team", [
      { question: WHY1, answer: "Because I like helping people grow" },
    ])
  })

  it("the last answer at the rung cap never reaches /why-ladder, so it is screened by its own call", async () => {
    mockScreenAnswer.mockImplementation(async (t: string) => (t === DISTRESS ? CRISIS : null))
    const user = userEvent.setup()
    renderPanel()
    await begin(user, STATED_GOAL_PROMPT)
    await say(user, "I want to lead a team")
    for (let rung = 1; rung < MAX_LADDER_RUNGS; rung += 1) {
      await waitFor(() => expect(mockWhyLadder).toHaveBeenCalledTimes(rung))
      await say(user, `reason ${rung}`)
    }
    await waitFor(() => expect(mockWhyLadder).toHaveBeenCalledTimes(MAX_LADDER_RUNGS))
    expect(mockScreenAnswer).not.toHaveBeenCalled()

    await say(user, DISTRESS)

    await screen.findByRole("alert")
    expect(mockScreenAnswer).toHaveBeenCalledTimes(1)
    expect(mockScreenAnswer).toHaveBeenCalledWith(DISTRESS)
    // The cap was reached without another ladder call, and no goals were drafted.
    expect(mockWhyLadder).toHaveBeenCalledTimes(MAX_LADDER_RUNGS)
    expect(mockSynthesizeGoals).not.toHaveBeenCalled()
  })
})
