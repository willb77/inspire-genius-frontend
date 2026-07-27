import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import CoachingPage, { buildScopeLine } from "../CoachingPage"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import type { SelfPortrait as Portrait } from "@/types/lumen"

jest.mock("@/hooks/lumen/useSelfPortrait")

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const mockUseSelfPortrait = useSelfPortrait as jest.MockedFunction<typeof useSelfPortrait>

function mockSources(sources: Portrait["sources"], isLoading = false) {
  mockUseSelfPortrait.mockReturnValue({
    data: sources ? ({ sources } as Portrait) : undefined,
    isLoading,
    isError: false,
  } as ReturnType<typeof useSelfPortrait>)
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoachingPage />
    </MemoryRouter>
  )

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
  beforeEach(() => mockNavigate.mockClear())
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

  test("picking a question opens Meridian and auto-submits it", () => {
    // Reuses the existing one-shot prefill mechanism rather than a second chat.
    mockSources({ prism: true, assessments: false, resume: false, bio: false })
    renderPage()
    const select = screen.getByLabelText("Question")
    const question = "Help me set a goal that actually fits how I'm wired."
    fireEvent.change(select, { target: { value: question } })

    expect(mockNavigate).toHaveBeenCalledTimes(1)
    const [path, opts] = mockNavigate.mock.calls[0]
    expect(path).toBe("/meridian/chat")
    expect(opts.state.autoSubmit).toBe(true)
    expect(opts.state.prefillPrompt).toContain(question)
    expect(opts.state.prefillPrompt).toContain("my PRISM scores")
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
    const prompt = mockNavigate.mock.calls[0][1].state.prefillPrompt
    expect(prompt).toMatch(/Leave my résumé out/)
  })

  test("works with nothing on file", () => {
    // A brand-new B2C user has no portrait yet; the page must still be usable.
    mockSources({ prism: false, assessments: false, resume: false, bio: false })
    renderPage()
    expect(screen.getByText(/nothing to read about you yet/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Ask your own question"), {
      target: { value: "Where do I start?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Start the conversation/ }))
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })
})
