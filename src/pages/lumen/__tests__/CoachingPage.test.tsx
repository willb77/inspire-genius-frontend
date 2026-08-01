import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import CoachingPage from "../CoachingPage"
import { buildScopeLine } from "../coachingScope"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import { useCoachAnswer } from "@/hooks/lumen/useCoachAnswer"
import type { SelfPortrait as Portrait } from "@/types/lumen"

jest.mock("@/hooks/lumen/useSelfPortrait")
jest.mock("@/hooks/lumen/useCoachAnswer")
// Reached via the answer window; `react-markdown` is untransformed ESM.
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const mockUseSelfPortrait = useSelfPortrait as jest.MockedFunction<typeof useSelfPortrait>
const mockUseCoachAnswer = useCoachAnswer as jest.MockedFunction<typeof useCoachAnswer>
const mockAsk = jest.fn()

function mockSources(sources: Portrait["sources"], isLoading = false) {
  mockUseSelfPortrait.mockReturnValue({
    data: sources ? ({ sources } as Portrait) : undefined,
    isLoading,
    isError: false,
  } as ReturnType<typeof useSelfPortrait>)
}

function mockCoach(overrides: Partial<ReturnType<typeof useCoachAnswer>> = {}) {
  mockUseCoachAnswer.mockReturnValue({
    answers: [],
    pendingQuestion: null,
    isPending: false,
    isError: false,
    ask: mockAsk,
    clear: jest.fn(),
    ...overrides,
  })
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoachingPage />
    </MemoryRouter>
  )

/** The prompt handed to the coach for the first (only) question asked. */
const firstPrompt = () => mockAsk.mock.calls[0][0].prompt

describe("buildScopeLine", () => {
  test("names exclusions as well as inclusions", () => {
    // A user who unticks their résumé means "don't argue from my job history".
    // A line that only lists inclusions never says that, and the coach will
    // happily reach for the résumé anyway.
    const line = buildScopeLine(["prism"], ["prism", "resume"], "")
    expect(line).toContain("my PRISM scores")
    expect(line).toMatch(/Leave my résumé out/)
  })

  test("says nothing about sources the user doesn't have", () => {
    const line = buildScopeLine(["prism"], ["prism"], "")
    expect(line).not.toMatch(/Leave/)
  })

  test("falls back to the typed question when everything is unticked", () => {
    const line = buildScopeLine([], ["prism", "bio"], "")
    expect(line).toMatch(/Answer from what I tell you here/)
  })

  test("appends free-text context", () => {
    const line = buildScopeLine(["bio"], ["bio"], "  three weeks into a new role  ")
    expect(line).toContain("Also relevant: three weeks into a new role")
  })
})

describe("CoachingPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockAsk.mockClear()
    mockCoach()
  })
  afterEach(() => jest.resetAllMocks())

  test("defaults to every source on file", () => {
    // Lumen's proposition is that the coach already knows you, so opting OUT
    // should be the deliberate act.
    mockSources({ prism: true, assessments: false, resume: true, bio: false })
    renderPage()
    expect(screen.getByLabelText(/My PRISM scores/)).toBeChecked()
    expect(screen.getByLabelText(/My résumé/)).toBeChecked()
  })

  test("disables sources the user doesn't have rather than hiding them", () => {
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    expect(screen.getByLabelText(/My bio/)).toBeDisabled()
    expect(screen.getByLabelText(/My bio/)).not.toBeChecked()
  })

  test("picking a question answers it on the page, without navigating away", () => {
    // The whole point of "Answer it here": asking must not throw the person out
    // of Lumen and lose the context they just assembled with the checkboxes.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    const question = "Help me set a goal that actually fits how I'm wired."
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: question } })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockAsk).toHaveBeenCalledTimes(1)
    expect(firstPrompt()).toContain(question)
    expect(firstPrompt()).toContain("my PRISM scores")
  })

  test("the answer label is the question alone, without the scope preamble", () => {
    // The scope line is an instruction to the coach, not part of what was
    // asked — it must not end up as the heading on the card or in the export.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    const question = "Help me set a goal that actually fits how I'm wired."
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: question } })

    expect(mockAsk.mock.calls[0][0].question).toBe(question)
    expect(mockAsk.mock.calls[0][0].question).not.toContain("Draw on")
  })

  test("unticking a source changes what the coach is told to use", () => {
    mockSources({ prism: true, assessments: false, resume: true, bio: false })
    renderPage()
    fireEvent.click(screen.getByLabelText(/My résumé/))
    // Must be a question from the default (Goals) group — a value with no
    // matching <option> silently doesn't change the select.
    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "Which of my current goals should I drop?" },
    })
    expect(firstPrompt()).toMatch(/Leave my résumé out/)
  })

  test("an older backend hides the picker instead of claiming you have nothing", () => {
    // A portrait with no `sources` field came from an agent-engine that
    // predates the four-source composer. "No sources field" is not "no
    // sources" — telling someone with a full PRISM profile that we have
    // nothing to read about them would be a lie. The frontend deploys to dev
    // and staging-B on merge while the backend is promoted separately, so
    // this state is real, not hypothetical.
    mockSources(undefined)
    renderPage()
    expect(screen.queryByLabelText(/My PRISM scores/)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing to read about you yet/)).not.toBeInTheDocument()
    expect(screen.getByText(/draws on everything on your profile/)).toBeInTheDocument()
  })

  test("an older backend writes no scope line", () => {
    // Claiming a scope the coach was never told about is worse than silence.
    mockSources(undefined)
    renderPage()
    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "Which of my current goals should I drop?" },
    })
    expect(firstPrompt()).toBe("Which of my current goals should I drop?")
  })

  test("works with nothing on file", () => {
    // A brand-new B2C user has no portrait yet; the page must still be usable.
    mockSources({ prism: false, assessments: false, resume: false, bio: false })
    renderPage()
    expect(screen.getByText(/nothing to read about you yet/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Ask your own question"), {
      target: { value: "Where do I start?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Answer it here/ }))
    expect(mockAsk).toHaveBeenCalledTimes(1)
  })

  test("Open in Meridian is still there for a longer conversation", () => {
    // Inline answers are for one question. Anyone who wants to keep talking
    // should still be able to hand the whole thing to the chat surface.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    fireEvent.change(screen.getByLabelText("Ask your own question"), {
      target: { value: "Where do I start?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Open in Meridian/ }))

    expect(mockAsk).not.toHaveBeenCalled()
    const [path, opts] = mockNavigate.mock.calls[0]
    expect(path).toBe("/meridian/chat")
    expect(opts.state.autoSubmit).toBe(true)
    expect(opts.state.prefillPrompt).toContain("Where do I start?")
  })

  // 2026-07-31 — "Ask Your Own Question", reachable from the Meridian header's
  // Coaching link. Distinct from "Open in Meridian" below it, which is disabled
  // until the textarea has content — that leaves anyone who has not yet decided
  // what to ask with no route into the full conversation, which is exactly the
  // person most likely to want one.
  test("Ask Your Own Question opens Meridian even with nothing typed", () => {
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    const btn = screen.getByTestId("lumen-ask-your-own-question")
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)

    expect(mockAsk).not.toHaveBeenCalled()
    const [path, opts] = mockNavigate.mock.calls[0]
    expect(path).toBe("/meridian/chat")
    // No question yet, so nothing to prefill or auto-send — just the surface.
    expect(opts).toBeUndefined()
  })

  test("Ask Your Own Question carries a typed question through", () => {
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    fireEvent.change(screen.getByLabelText("Ask your own question"), {
      target: { value: "What should I focus on?" },
    })
    fireEvent.click(screen.getByTestId("lumen-ask-your-own-question"))

    const [path, opts] = mockNavigate.mock.calls[0]
    expect(path).toBe("/meridian/chat")
    expect(opts.state.autoSubmit).toBe(true)
    expect(opts.state.prefillPrompt).toContain("What should I focus on?")
  })

  test("the same question can be asked twice", () => {
    // A select that keeps its value can never fire onChange for that value
    // again. Someone who changes which sources to draw on and re-asks the same
    // question would otherwise find the control silently dead.
    mockSources({ prism: true, assessments: false, resume: true, bio: false })
    renderPage()
    const q = "Which of my current goals should I drop?"
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: q } })
    fireEvent.click(screen.getByLabelText(/My résumé/))
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: q } })

    expect(mockAsk).toHaveBeenCalledTimes(2)
    expect(mockAsk.mock.calls[1][0].prompt).toMatch(/Leave my résumé out/)
  })

  test("picking a canned question doesn't wipe what you typed below", () => {
    // The custom box is the person's own draft — a dropdown pick must not
    // silently discard it.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    const box = screen.getByLabelText("Ask your own question")
    fireEvent.change(box, { target: { value: "half-written thought" } })
    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "Which of my current goals should I drop?" },
    })
    expect(box).toHaveValue("half-written thought")
  })

  test("a question in flight locks the controls so two can't overlap", () => {
    // One session id, one job at a time — a second question fired while the
    // first is still running would land out of order.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    mockCoach({ pendingQuestion: "Working on it", isPending: true })
    renderPage()
    expect(screen.getByLabelText("Question")).toBeDisabled()
  })
})
