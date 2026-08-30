/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { KnowledgeUnit, ReviewQueue } from "@/types/knowledge-continuity"

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }))

const mockUseReviewQueue = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useReviewQueue", () => ({
  useReviewQueue: (...a: unknown[]) => mockUseReviewQueue(...a),
}))

const mockMutate = jest.fn()
const mockUseSubmitValidation = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useSubmitValidation", () => ({
  useSubmitValidation: (...a: unknown[]) => mockUseSubmitValidation(...a),
}))

const mockUseRegisterAtRiskRole = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useRegisterAtRiskRole", () => ({
  useRegisterAtRiskRole: (...a: unknown[]) => mockUseRegisterAtRiskRole(...a),
}))

const mockUseStartCaptureSession = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useStartCaptureSession", () => ({
  useStartCaptureSession: (...a: unknown[]) => mockUseStartCaptureSession(...a),
}))

const mockResolveMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useResolveContradiction", () => ({
  useResolveContradiction: () => ({ mutate: mockResolveMutate, isPending: false }),
}))

const mockUseUnitTurns = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useUnitTurns", () => ({
  useUnitTurns: (...a: unknown[]) => mockUseUnitTurns(...a),
}))

import KceReviewConsolePage from "../KceReviewConsolePage"

const UNIT: KnowledgeUnit = {
  id: "unit-1",
  session_id: "session-1",
  taxonomy_node_id: null,
  category: "process",
  title: "Shutdown sequence",
  body: "Detailed shutdown steps for the line.",
  structured: null,
  document_id: null,
  criticality: "high",
  kvi: 0.62,
  validity_band: "needs_review",
  kvi_features: null,
  captured_at: "2026-07-01T00:00:00Z",
}

const QUEUE_WITH_UNIT: ReviewQueue = {
  needs_review_units: [UNIT],
  unresolved_contradictions: [
    {
      id: "contradiction-1",
      from_unit_id: "unit-1",
      to_unit_id: "unit-2",
      relation_type: "contradicts",
      resolved: false,
      from_unit: {
        id: "unit-1",
        title: "Purge before start",
        category: "procedure",
        body: "Always purge the line before ignition.",
        validity_band: "provisional",
        kvi: 0.7,
      },
      to_unit: {
        id: "unit-2",
        title: "Skip the purge",
        category: "procedure",
        body: "Never purge; just start.",
        validity_band: "provisional",
        kvi: 0.65,
      },
    },
  ],
}

const EMPTY_QUEUE: ReviewQueue = { needs_review_units: [], unresolved_contradictions: [] }

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ user: { id: "reviewer-1", email: "reviewer@example.com" } })
  mockUseSubmitValidation.mockReturnValue({ mutate: mockMutate, isPending: false })
  mockUseRegisterAtRiskRole.mockReturnValue({ mutate: jest.fn(), isPending: false })
  mockUseStartCaptureSession.mockReturnValue({ mutate: jest.fn(), isPending: false })
  mockUseUnitTurns.mockReturnValue({
    data: { unit_id: "unit-1", session_id: "session-1", taxonomy_node_id: null, turns: [] },
    isLoading: false,
    isError: false,
  })
})

describe("KceReviewConsolePage", () => {
  test("renders a unit from the review queue", () => {
    mockUseReviewQueue.mockReturnValue({ data: QUEUE_WITH_UNIT, isLoading: false, isError: false })
    render(<KceReviewConsolePage />)

    expect(screen.getByText("Shutdown sequence")).toBeInTheDocument()
    expect(screen.getByText("process")).toBeInTheDocument()
    expect(screen.getByText("High criticality")).toBeInTheDocument()
    expect(screen.getByText("KVI 0.62")).toBeInTheDocument()
    // the contradiction shows both units' titles, side by side
    expect(screen.getByText("Purge before start")).toBeInTheDocument()
    expect(screen.getByText("Skip the purge")).toBeInTheDocument()
  })

  test("superseding a contradiction resolves it with the chosen winner", async () => {
    mockUseReviewQueue.mockReturnValue({ data: QUEUE_WITH_UNIT, isLoading: false, isError: false })
    const user = userEvent.setup()
    render(<KceReviewConsolePage />)

    const keepButtons = screen.getAllByRole("button", { name: /keep this, retire the other/i })
    await user.click(keepButtons[0]) // keep from_unit (unit-1)

    expect(mockResolveMutate).toHaveBeenCalledWith({
      relationId: "contradiction-1",
      body: { action: "supersede", winner_unit_id: "unit-1" },
    })
  })

  test("dismissing a contradiction resolves it as not-a-contradiction", async () => {
    mockUseReviewQueue.mockReturnValue({ data: QUEUE_WITH_UNIT, isLoading: false, isError: false })
    const user = userEvent.setup()
    render(<KceReviewConsolePage />)

    await user.click(screen.getByRole("button", { name: /not a contradiction/i }))

    expect(mockResolveMutate).toHaveBeenCalledWith({
      relationId: "contradiction-1",
      body: { action: "dismiss" },
    })
  })

  test("replaying the interview shows a unit's captured turns", async () => {
    mockUseReviewQueue.mockReturnValue({ data: QUEUE_WITH_UNIT, isLoading: false, isError: false })
    mockUseUnitTurns.mockReturnValue({
      data: {
        unit_id: "unit-1",
        session_id: "session-1",
        taxonomy_node_id: "node-1",
        turns: [{ id: "t1", session_id: "session-1", taxonomy_node_id: "node-1", seq: 0, question: "How do you shut down?", response: "Close the main valve first." }],
      },
      isLoading: false,
      isError: false,
    })
    const user = userEvent.setup()
    render(<KceReviewConsolePage />)

    await user.click(screen.getByRole("button", { name: /replay the interview/i }))

    expect(screen.getByText("How do you shut down?")).toBeInTheDocument()
    expect(screen.getByText("Close the main valve first.")).toBeInTheDocument()
  })

  test("clicking Approve submits a confirm verdict for the current user", async () => {
    mockUseReviewQueue.mockReturnValue({ data: QUEUE_WITH_UNIT, isLoading: false, isError: false })
    const user = userEvent.setup()
    render(<KceReviewConsolePage />)

    await user.click(screen.getByRole("button", { name: /approve/i }))

    expect(mockMutate).toHaveBeenCalledWith({
      unitId: "unit-1",
      body: { validator_user_id: "reviewer-1", method: "sme_review", verdict: "confirm" },
    })
  })

  test("renders a friendly empty state when there is nothing to review", () => {
    mockUseReviewQueue.mockReturnValue({ data: EMPTY_QUEUE, isLoading: false, isError: false })
    render(<KceReviewConsolePage />)

    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
    expect(screen.getByText(/No unresolved contradictions/)).toBeInTheDocument()
  })

  test("renders the Capture intake tab with both forms", async () => {
    mockUseReviewQueue.mockReturnValue({ data: EMPTY_QUEUE, isLoading: false, isError: false })
    const user = userEvent.setup()
    render(<KceReviewConsolePage />)

    await user.click(screen.getByRole("tab", { name: /capture intake/i }))

    const intakePanel = screen.getByRole("tabpanel", { name: /capture intake/i })
    expect(within(intakePanel).getByText(/register an at-risk role/i)).toBeInTheDocument()
    expect(within(intakePanel).getByText(/start a capture session/i)).toBeInTheDocument()
    expect(within(intakePanel).getByRole("button", { name: /register role/i })).toBeInTheDocument()
    expect(within(intakePanel).getByRole("button", { name: /start session/i })).toBeInTheDocument()
  })
})
