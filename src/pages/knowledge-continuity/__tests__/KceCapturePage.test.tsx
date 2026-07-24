/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"

// ── Router + toast ────────────────────────────────────────────────────────────
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

// ── Hook mocks ────────────────────────────────────────────────────────────────
const mockCreateTaxonomy = { mutateAsync: jest.fn(), isPending: false }
jest.mock("@/hooks/knowledge-continuity/useCreateTaxonomyNode", () => ({
  useCreateTaxonomyNode: () => mockCreateTaxonomy,
}))

const mockStartSession = { mutateAsync: jest.fn(), isPending: false }
jest.mock("@/hooks/knowledge-continuity/useStartCaptureSession", () => ({
  useStartCaptureSession: () => mockStartSession,
}))

const nextQuestionMutate = jest.fn()
const mockNextQuestion = { mutate: nextQuestionMutate, isPending: false, isError: false }
jest.mock("@/hooks/knowledge-continuity/useNextQuestion", () => ({
  useNextQuestion: () => mockNextQuestion,
}))

const recordTurnMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useRecordTurn", () => ({
  useRecordTurn: () => ({ mutate: recordTurnMutate }),
}))

const extractMutateAsync = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useExtractUnits", () => ({
  useExtractUnits: () => ({ mutateAsync: extractMutateAsync, isPending: false }),
}))

const synthMutateAsync = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useSynthesizeUnits", () => ({
  useSynthesizeUnits: () => ({ mutateAsync: synthMutateAsync, isPending: false }),
}))

import KceCapturePage from "../KceCapturePage"

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateTaxonomy.mutateAsync.mockResolvedValue({ id: "tax-1" })
  mockStartSession.mutateAsync.mockResolvedValue({ id: "session-1" })
  // Every next-question call resolves synchronously through its onSuccess.
  nextQuestionMutate.mockImplementation((_vars, opts) =>
    opts?.onSuccess?.({ question: "What is the first step?", coverage_note: null })
  )
  extractMutateAsync.mockResolvedValue({
    units: [{ category: "process", title: "Restart the pumps in sequence" }],
  })
  synthMutateAsync.mockResolvedValue({})
})

async function advanceToInterview(user: UserEvent) {
  await user.type(screen.getByLabelText(/^Role$/i), "Senior Water Treatment Operator")
  await user.type(
    screen.getByLabelText(/task or responsibility/i),
    "Recover the plant after a power failure"
  )
  await user.type(screen.getByLabelText(/^Expert$/i), "Dana Ruiz")
  await user.click(screen.getByRole("button", { name: /start the interview/i }))
}

describe("KceCapturePage", () => {
  test("renders step 1 — the setup form", () => {
    render(<KceCapturePage />)
    expect(screen.getByRole("heading", { name: /start a capture/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Role$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/task or responsibility/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Expert$/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start the interview/i })).toBeInTheDocument()
  })

  test("submitting setup creates a taxonomy node + session and shows Maven's first question", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)

    await advanceToInterview(user)

    expect(mockCreateTaxonomy.mutateAsync).toHaveBeenCalledWith({
      org_id: "kce-capture",
      role_title: "Senior Water Treatment Operator",
      name: "Recover the plant after a power failure",
      node_type: "task",
    })
    expect(mockStartSession.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        expert_user_id: "Dana Ruiz",
        role_title: "Senior Water Treatment Operator",
        is_synthetic: true, // real_expert unchecked → synthetic/practice
        taxonomy_id: "tax-1",
      })
    )
    expect(await screen.findByText("What is the first step?")).toBeInTheDocument()
    // First call opens the interview.
    expect(nextQuestionMutate).toHaveBeenCalledWith(
      expect.objectContaining({ is_first: true, transcript: [] }),
      expect.any(Object)
    )
  })

  test("answering records a turn and fetches the next question", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)
    await advanceToInterview(user)
    await screen.findByText("What is the first step?")

    await user.type(screen.getByLabelText(/your answer/i), "Confirm the isolation switch is open.")
    await user.click(screen.getByRole("button", { name: /send answer/i }))

    expect(recordTurnMutate).toHaveBeenCalledWith({
      sessionId: "session-1",
      body: {
        taxonomy_node_id: "tax-1",
        question: "What is the first step?",
        response: "Confirm the isolation switch is open.",
      },
    })
    // Second next-question call carries the growing transcript, no longer first.
    expect(nextQuestionMutate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        is_first: false,
        transcript: [
          { question: "What is the first step?", answer: "Confirm the isolation switch is open." },
        ],
      }),
      expect.any(Object)
    )
  })

  test("Finish capture extracts units then synthesizes them and shows completion", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)
    await advanceToInterview(user)
    await screen.findByText("What is the first step?")

    await user.type(screen.getByLabelText(/your answer/i), "Confirm the isolation switch is open.")
    await user.click(screen.getByRole("button", { name: /send answer/i }))

    await user.click(screen.getByRole("button", { name: /finish capture/i }))

    expect(extractMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Senior Water Treatment Operator",
        taxonomy_node_id: "tax-1",
        transcript: [
          { question: "What is the first step?", answer: "Confirm the isolation switch is open." },
        ],
      })
    )
    expect(synthMutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1",
      units: [{ category: "process", title: "Restart the pumps in sequence" }],
    })
    expect(await screen.findByText(/capture complete/i)).toBeInTheDocument()
    expect(screen.getByText("Restart the pumps in sequence")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /go to the reviewer console/i })
    ).toBeInTheDocument()
  })
})
