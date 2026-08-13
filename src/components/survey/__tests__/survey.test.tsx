/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"

import SurveyBuilder from "@/components/survey/SurveyBuilder"
import SurveyTaker from "@/components/survey/SurveyTaker"
import SurveySelector from "@/components/survey/SurveySelector"
import type { Survey } from "@/types/survey"

// Keep the page test light: stub the heavy role-adaptive layout + auth so we
// exercise the survey surface, not the whole app chrome.
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))
jest.mock("@/context/useAuth", () => ({
  __esModule: true,
  useAuth: () => ({ user: { role: "manager" } }),
}))

// Imported after the mocks above so the page picks up the stubbed layout/auth.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SurveysPage = require("@/pages/user/SurveysPage").default

beforeEach(() => {
  localStorage.clear()
})

function makeSurvey(): Survey {
  const ts = new Date().toISOString()
  return {
    id: "sv1",
    title: "Feedback",
    description: "Tell us",
    createdAt: ts,
    updatedAt: ts,
    questions: [
      { id: "q1", prompt: "Your name?", type: "text", required: true },
      { id: "q2", prompt: "Rate us", type: "rating", scaleMax: 5 },
    ],
  }
}

describe("SurveyBuilder", () => {
  it("adds a question and saves a survey", () => {
    const onSave = jest.fn()
    render(<SurveyBuilder onSave={onSave} />)

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Survey" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add question/i }))
    fireEvent.change(screen.getByLabelText("Question text"), {
      target: { value: "How are you?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save survey/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0] as Survey
    expect(saved.title).toBe("My Survey")
    expect(saved.questions).toHaveLength(1)
    expect(saved.questions[0].prompt).toBe("How are you?")
  })

  it("blocks saving with no title", () => {
    const onSave = jest.fn()
    render(<SurveyBuilder onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: /save survey/i }))
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe("SurveyTaker", () => {
  it("enforces required questions then submits answers", () => {
    const onSubmit = jest.fn()
    render(<SurveyTaker survey={makeSurvey()} onSubmit={onSubmit} />)

    // Required 'Your name?' is blank → submit is rejected.
    fireEvent.click(screen.getByRole("button", { name: /submit response/i }))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Your name?"), {
      target: { value: "Ada" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Rating 4" }))
    fireEvent.click(screen.getByRole("button", { name: /submit response/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ q1: "Ada", q2: 4 })
    // Thank-you state.
    expect(screen.getByText(/response recorded/i)).toBeInTheDocument()
  })
})

describe("SurveySelector", () => {
  it("shows an empty hint when there are no surveys", () => {
    render(<SurveySelector surveys={[]} value={null} onChange={() => {}} />)
    expect(screen.getByText(/no surveys yet/i)).toBeInTheDocument()
  })

  it("renders the selector label when surveys exist", () => {
    render(
      <SurveySelector
        surveys={[makeSurvey()]}
        value={null}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText(/select a survey to take/i)).toBeInTheDocument()
  })
})

describe("SurveysPage", () => {
  it("renders the surface with both tabs and the take-a-survey selector", () => {
    render(<SurveysPage />)
    expect(
      screen.getByRole("heading", { name: "Surveys", level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: /take a survey/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: /build surveys/i }),
    ).toBeInTheDocument()
    // Default Take tab shows the selector; seeded example surveys make it live.
    expect(screen.getByText(/select a survey to take/i)).toBeInTheDocument()
  })
})
