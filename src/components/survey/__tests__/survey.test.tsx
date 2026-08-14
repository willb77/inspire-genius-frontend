/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import SurveyBuilder from "@/components/survey/SurveyBuilder"
import SurveyTaker from "@/components/survey/SurveyTaker"
import SurveySelector from "@/components/survey/SurveySelector"
import type { Survey } from "@/types/survey"

// Stub the heavy role-adaptive layout so we exercise the survey surface only.
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// Mock the auth context: super-admin => author (Build/Results tabs shown).
const mockUseAuth = jest.fn(() => ({
  user: { role: "super-admin" } as { role: string },
  isAtLeast: (): boolean => true,
}))
jest.mock("@/context/useAuth", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}))

// Mock the service so no real network happens.
jest.mock("@/services/survey/survey.service", () => ({
  __esModule: true,
  surveyService: {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submitResponse: jest.fn(),
    listResponses: jest.fn().mockResolvedValue([]),
    summary: jest.fn(),
    parse: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SurveysPage = require("@/pages/user/SurveysPage").default

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function makeSurvey(): Survey {
  return {
    id: "sv1",
    title: "Feedback",
    description: "Tell us",
    orgId: "org-1",
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
  })

  it("carries the org exposure field", () => {
    const onSave = jest.fn()
    render(<SurveyBuilder onSave={onSave} />)
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "S" } })
    fireEvent.change(screen.getByLabelText("Expose to organization"), {
      target: { value: "org-42" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add question/i }))
    fireEvent.change(screen.getByLabelText("Question text"), {
      target: { value: "Q?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save survey/i }))
    expect((onSave.mock.calls[0][0] as Survey).orgId).toBe("org-42")
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

    fireEvent.click(screen.getByRole("button", { name: /submit response/i }))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Your name?"), {
      target: { value: "Ada" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Rating 4" }))
    fireEvent.click(screen.getByRole("button", { name: /submit response/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ q1: "Ada", q2: 4 })
    expect(screen.getByText(/response recorded/i)).toBeInTheDocument()
  })
})

describe("SurveySelector", () => {
  it("shows an empty hint when there are no surveys", () => {
    render(<SurveySelector surveys={[]} value={null} onChange={() => {}} />)
    expect(screen.getByText(/no surveys yet/i)).toBeInTheDocument()
  })
})

describe("SurveysPage", () => {
  // Authoring moved from "manager and above" to super-admin ONLY (2026-08-13);
  // manager now sees the no-access card. Role-set coverage for every role lives
  // in src/pages/user/__tests__/SurveysPage.roles.test.tsx.
  it("renders author tabs (Take / Build / Results) for a super-admin", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "super-admin" }, isAtLeast: () => true })
    renderWithProviders(<SurveysPage />)
    expect(
      screen.getByRole("heading", { name: "Surveys", level: 1 }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /take a survey/i })).toBeInTheDocument(),
    )
    expect(screen.getByRole("tab", { name: /build surveys/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /results/i })).toBeInTheDocument()
  })

  it("hides Build/Results for a plain user", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "user" }, isAtLeast: () => false })
    renderWithProviders(<SurveysPage />)
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /take a survey/i })).toBeInTheDocument(),
    )
    expect(screen.queryByRole("tab", { name: /build surveys/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /results/i })).not.toBeInTheDocument()
  })
})
