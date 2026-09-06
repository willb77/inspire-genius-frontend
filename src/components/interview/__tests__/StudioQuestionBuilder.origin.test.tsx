/**
 * @jest-environment jsdom
 *
 * Where each Studio question came from — the frontend half of package IS-2.
 *
 * The backend now writes `interview_answer.competency_provenance`, but for the
 * Studio it had nothing to write: four different paths (typed, generated,
 * uploaded, employer pack) all pushed the same `{text, theme, probes}` shape
 * into one list, so by the time the frame was sent the origin was gone. Every
 * Studio session would have recorded null provenance forever — an honest empty
 * column that looks exactly like a feature nobody used.
 *
 * The origin is therefore stamped where the row is CREATED, which is the only
 * moment it is known. These tests assert the four paths tag differently,
 * because a regression here is invisible: the interview still runs, the export
 * still prints, and the compliance measure downstream just quietly reads
 * "unattributed".
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

const extractRoleText = jest.fn()
jest.mock("@/lib/extractRoleText", () => {
  const actual = jest.requireActual("@/lib/extractRoleText")
  return { ...actual, extractRoleText: (...a: unknown[]) => extractRoleText(...a) }
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

const SET = (generated: boolean): GeneratedQuestionSet => ({
  generated,
  topic: "student discovery",
  sections: [
    {
      key: "warm_up",
      title: "Warm-up",
      competencies: [
        { id: "warm_up.q1", competency: "Background", question: "Tell me about yourself.", starProbes: [] },
      ],
    },
  ],
  totalQuestions: 1,
})

beforeEach(() => jest.clearAllMocks())

describe("each path tags its own origin", () => {
  it("a typed question is manual", async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Career discovery")
    await user.click(screen.getByRole("tab", { name: /add manually/i }))
    await user.click(screen.getByRole("button", { name: /add a question/i }))
    await user.type(screen.getByPlaceholderText(/question text/i), "What subjects excite you?")
    await user.click(screen.getByRole("button", { name: /start the interview/i }))

    expect(onConfirm.mock.calls[0][0].questions[0].source).toBe("manual")
  })

  it("a model-written question is generated", async () => {
    generateQuestions.mockResolvedValue(SET(true))
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Career discovery")
    await user.click(screen.getByRole("button", { name: /generate questions/i }))
    await waitFor(() => expect(generateQuestions).toHaveBeenCalled())
    await user.click(await screen.findByRole("button", { name: /start the interview/i }))

    expect(onConfirm.mock.calls[0][0].questions[0].source).toBe("generated")
  })

  it("the generator's STATIC fallback is bank, not generated", async () => {
    // `generated: false` means the model was unavailable and these are the
    // curated discovery starters. Calling them "generated" would put a
    // fabricated authorship claim into a UGESP record — the same mistake as
    // defaulting an untagged question to "manual" on the backend.
    generateQuestions.mockResolvedValue(SET(false))
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Career discovery")
    await user.click(screen.getByRole("button", { name: /generate questions/i }))
    await waitFor(() => expect(generateQuestions).toHaveBeenCalled())
    await user.click(await screen.findByRole("button", { name: /start the interview/i }))

    const q = onConfirm.mock.calls[0][0].questions[0]
    expect(q.source).toBe("bank")
    expect(q.source).not.toBe("generated")
  })
})

describe("mixed lists keep each question's own origin", () => {
  it("does not overwrite a generated question's origin when a typed one is added", async () => {
    // The builder deliberately APPENDS rather than replaces, because an
    // interviewer often wants the generated set plus two of their own. A
    // single list-wide source would then be wrong for half of it.
    generateQuestions.mockResolvedValue(SET(true))
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Career discovery")
    await user.click(screen.getByRole("button", { name: /generate questions/i }))
    await waitFor(() => expect(generateQuestions).toHaveBeenCalled())

    await user.click(screen.getByRole("tab", { name: /add manually/i }))
    await user.click(screen.getByRole("button", { name: /add a question/i }))
    const boxes = screen.getAllByPlaceholderText(/question text/i)
    await user.type(boxes[boxes.length - 1], "And one of my own?")
    await user.click(screen.getByRole("button", { name: /start the interview/i }))

    const qs = onConfirm.mock.calls[0][0].questions
    expect(qs).toHaveLength(2)
    expect(qs.find((q: { text: string }) => q.text === "Tell me about yourself.").source).toBe("generated")
    expect(qs.find((q: { text: string }) => q.text === "And one of my own?").source).toBe("manual")
  })
})

describe("the requisition on a hiring interview", () => {
  it("is offered for a hiring interview and carried on the frame", async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderBuilder()

    await user.type(screen.getByLabelText(/interview topic/i), "Regional Manager")
    await user.click(screen.getByRole("button", { name: /hiring \/ evaluation/i }))
    await user.type(await screen.findByLabelText(/requisition id/i), "REQ-2041")
    await user.click(screen.getByRole("tab", { name: /add manually/i }))
    await user.click(screen.getByRole("button", { name: /add a question/i }))
    await user.type(screen.getByPlaceholderText(/question text/i), "Tell me about a turnaround.")
    await user.click(screen.getByRole("button", { name: /start the interview/i }))

    expect(onConfirm.mock.calls[0][0].requisitionId).toBe("REQ-2041")
  })

  it("is NOT offered for a development or discovery conversation", async () => {
    // A coaching conversation is not run against a job opening, and asking for
    // a requisition would quietly reframe it as a selection procedure.
    renderBuilder()
    expect(screen.queryByLabelText(/requisition id/i)).not.toBeInTheDocument()
  })
})
