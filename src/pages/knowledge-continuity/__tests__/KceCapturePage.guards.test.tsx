/**
 * @jest-environment jsdom
 *
 * D-18: the capture interview against the server's guards on next-question
 * and extract — the answer box is capped, an area that would pass the size cap
 * is stopped before it is sent (so "Save this area" still works), a too-long
 * refusal puts the answer back instead of leaving a transcript every retry
 * would resend, and a refused question says which guard refused it.
 */
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("role=Plant%20Operator"), jest.fn()],
}))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

const BLUEPRINT = {
  role_title: "Plant Operator",
  nodes: [
    { ref: "root-1", parent_ref: null, name: "Plant Operations", node_type: "responsibility_area",
      section: "Role Mastery", depth: 0, rationale: null },
    { ref: "node-2", parent_ref: "root-1", name: "Recover after a power failure", node_type: "task",
      section: "Failure Modes & Recovery", depth: 1, rationale: null },
  ],
}

jest.mock("@/hooks/knowledge-continuity/useSavedRoleBlueprint", () => ({
  useSavedRoleBlueprint: () => ({
    mutate: (_r: unknown, opts?: { onSuccess?: (b: unknown) => void }) => opts?.onSuccess?.(BLUEPRINT),
    isPending: false,
  }),
}))
jest.mock("@/hooks/knowledge-continuity/useSavedRoles", () => ({
  useSavedRoles: () => ({ data: [], isLoading: false }),
}))
jest.mock("@/hooks/knowledge-continuity/useStartCaptureSession", () => ({
  useStartCaptureSession: () => ({ mutateAsync: () => Promise.resolve({ id: "s-1" }), isPending: false }),
}))

type MutateOpts = {
  onSuccess?: (d: { question: string; coverage_note: null }) => void
  onError?: (e: unknown) => void
}
const nextQuestionMutate = jest.fn()
const mockNextQuestion: Record<string, unknown> = {
  mutate: nextQuestionMutate,
  isPending: false,
  isError: false,
  error: null,
}
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
jest.mock("@/hooks/knowledge-continuity/useSynthesizeUnits", () => ({
  useSynthesizeUnits: () => ({ mutateAsync: () => Promise.resolve({}), isPending: false }),
}))

import KceCapturePage from "../KceCapturePage"
import {
  KCE_MAX_ANSWER,
  KCE_MAX_TRANSCRIPT_CHARS,
  KCE_MAX_TRANSCRIPT_TURNS,
} from "@/services/knowledge-continuity/llmGuards"

const QUESTION = "What is the first step?"

beforeEach(() => {
  jest.clearAllMocks()
  mockNextQuestion.isError = false
  mockNextQuestion.error = null
  nextQuestionMutate.mockImplementation((_v: unknown, opts?: MutateOpts) =>
    opts?.onSuccess?.({ question: QUESTION, coverage_note: null })
  )
  extractMutateAsync.mockResolvedValue({ units: [] })
})

async function openInterview(user: UserEvent) {
  await user.type(screen.getByLabelText(/^Expert$/i), "Dana Ruiz")
  const row = screen.getByText(/recover after a power failure/i).closest("li") as HTMLElement
  await user.click(within(row).getByRole("button", { name: /^capture$/i }))
  await screen.findByText(QUESTION)
}

function answer(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/type your answer/i), { target: { value: text } })
  fireEvent.click(screen.getByRole("button", { name: /send answer/i }))
}

describe("KceCapturePage — D-18 guards", () => {
  test("the answer box is capped at the server's answer bound", async () => {
    render(<KceCapturePage />)
    await openInterview(userEvent.setup())
    expect(screen.getByPlaceholderText(/type your answer/i)).toHaveAttribute(
      "maxLength",
      String(KCE_MAX_ANSWER)
    )
  })

  test("an answer that would take the area past the size cap is not sent, and the area can still be saved", async () => {
    render(<KceCapturePage />)
    await openInterview(userEvent.setup())
    const big = "a".repeat(KCE_MAX_ANSWER)
    const fit = Math.floor(KCE_MAX_TRANSCRIPT_CHARS / (KCE_MAX_ANSWER + QUESTION.length))
    for (let i = 0; i < fit; i++) answer(big)
    expect(recordTurnMutate).toHaveBeenCalledTimes(fit)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    answer(big)
    expect(recordTurnMutate).toHaveBeenCalledTimes(fit) // nothing recorded
    expect(nextQuestionMutate).toHaveBeenCalledTimes(fit + 1) // the opener + one per kept answer
    expect(screen.getByRole("alert")).toHaveTextContent(/reached its length limit/i)
    expect(screen.getByPlaceholderText(/type your answer/i)).toHaveValue(big) // kept

    fireEvent.click(screen.getByRole("button", { name: /save this area/i }))
    expect(extractMutateAsync).toHaveBeenCalledTimes(1)
    const sent = extractMutateAsync.mock.calls[0][0].transcript as unknown[]
    expect(sent).toHaveLength(fit)
  })

  test("the turn count cap stops the area too", async () => {
    render(<KceCapturePage />)
    await openInterview(userEvent.setup())
    for (let i = 0; i < KCE_MAX_TRANSCRIPT_TURNS; i++) answer("ok")
    expect(recordTurnMutate).toHaveBeenCalledTimes(KCE_MAX_TRANSCRIPT_TURNS)
    answer("one more")
    expect(recordTurnMutate).toHaveBeenCalledTimes(KCE_MAX_TRANSCRIPT_TURNS)
    expect(screen.getByRole("alert")).toHaveTextContent(/reached its length limit/i)
  })

  test("a too-long refusal puts the answer back so it can be shortened", async () => {
    render(<KceCapturePage />)
    await openInterview(userEvent.setup())
    nextQuestionMutate.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onError?.({ response: { status: 422 } })
    )
    answer("my long answer")
    expect(screen.getByText(QUESTION)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/type your answer/i)).toHaveValue("my long answer")
    // The rolled-back transcript is what the next send carries: no duplicate turn.
    answer("shorter")
    const last = nextQuestionMutate.mock.calls.at(-1)?.[0] as { transcript: { answer: string }[] }
    expect(last.transcript.map((x) => x.answer)).toEqual(["shorter"])
  })

  test("any other failure keeps the old behaviour (no roll-back)", async () => {
    render(<KceCapturePage />)
    await openInterview(userEvent.setup())
    nextQuestionMutate.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onError?.({ response: { status: 502 } })
    )
    answer("kept in the transcript")
    expect(screen.queryByPlaceholderText(/type your answer/i)).not.toBeInTheDocument()
    expect(screen.getByText("kept in the transcript")).toBeInTheDocument()
  })

  test.each([
    [403, /don't have access to this Knowledge Continuity tool/i],
    [429, /too many requests in a short time/i],
    [422, /too long to send/i],
    [500, /something went wrong getting the next question/i],
  ])("a refused question (%s) says which guard refused it", async (status, text) => {
    nextQuestionMutate.mockImplementation(() => undefined)
    mockNextQuestion.isError = true
    mockNextQuestion.error = { response: { status } }
    render(<KceCapturePage />)
    await userEvent.setup().type(screen.getByLabelText(/^Expert$/i), "Dana Ruiz")
    const row = screen.getByText(/recover after a power failure/i).closest("li") as HTMLElement
    await userEvent.setup().click(within(row).getByRole("button", { name: /^capture$/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(text)
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })
})
