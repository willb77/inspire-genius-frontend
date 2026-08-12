/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import StudioQuestionBuilder from "../StudioQuestionBuilder"
import type { GeneratedQuestionSet } from "@/services/interview/studio.service"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() },
}))

const generateQuestions = jest.fn()
jest.mock("@/services/interview/studio.service", () => {
  const actual = jest.requireActual("@/services/interview/studio.service")
  return {
    ...actual,
    studioInterviewService: { generateQuestions: (...a: unknown[]) => generateQuestions(...a) },
  }
})

function renderBuilder(onConfirm = jest.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <StudioQuestionBuilder onConfirm={onConfirm} />
    </QueryClientProvider>,
  )
  return { onConfirm }
}

const GENERATED: GeneratedQuestionSet = {
  generated: true,
  topic: "student discovery",
  sections: [
    {
      key: "warm_up",
      title: "Warm-up",
      competencies: [
        { id: "warm_up.q1", competency: "Background", question: "Tell me about your interests.", starProbes: [] },
      ],
    },
  ],
  totalQuestions: 1,
}

describe("StudioQuestionBuilder", () => {
  beforeEach(() => generateQuestions.mockReset())

  it("shows the empty state until a question is added", () => {
    renderBuilder()
    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start the interview/i })).toBeDisabled()
  })

  it("adds a manual question and confirms a custom-mode frame", async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Career discovery")
    await user.click(screen.getByRole("tab", { name: /add manually/i }))
    await user.click(screen.getByRole("button", { name: /add a question/i }))
    await user.type(screen.getByPlaceholderText(/question text/i), "What subjects excite you?")

    await user.click(screen.getByRole("button", { name: /start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const frame = onConfirm.mock.calls[0][0]
    expect(frame.mode).toBe("custom")
    expect(frame.kind).toBe("general")
    expect(frame.questions).toHaveLength(1)
    expect(frame.questions[0].text).toBe("What subjects excite you?")
  })

  it("generates questions from the topic and appends them to the list", async () => {
    const user = userEvent.setup()
    generateQuestions.mockResolvedValue(GENERATED)
    renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Student discovery")
    await user.click(screen.getByRole("button", { name: /generate questions/i }))

    await waitFor(() =>
      expect(screen.getByDisplayValue("Tell me about your interests.")).toBeInTheDocument(),
    )
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "Student discovery" }),
    )
  })

  it("switches to the hiring style and carries roleTitle through", async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Sales Manager")
    await user.click(screen.getByRole("button", { name: /hiring \/ evaluation/i }))
    await user.click(screen.getByRole("tab", { name: /add manually/i }))
    await user.click(screen.getByRole("button", { name: /add a question/i }))
    await user.type(screen.getByPlaceholderText(/question text/i), "Describe a deal you closed.")
    await user.click(screen.getByRole("button", { name: /start the interview/i }))

    const frame = onConfirm.mock.calls[0][0]
    expect(frame.kind).toBe("hiring")
    expect(frame.roleTitle).toBe("Sales Manager")
  })
})
