/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"

// ── Router (arrive with ?role=) + toast ───────────────────────────────────────
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [
    new URLSearchParams("role=Senior%20Water%20Treatment%20Operator"),
    jest.fn(),
  ],
}))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

// ── Blueprint: a saved role's nodes carry the REAL taxonomy id in `ref` ────────
const BLUEPRINT = {
  role_title: "Senior Water Treatment Operator",
  nodes: [
    {
      ref: "root-1",
      parent_ref: null,
      name: "Plant Operations",
      node_type: "responsibility_area",
      section: "Role Mastery",
      depth: 0,
      rationale: null,
    },
    {
      ref: "node-2",
      parent_ref: "root-1",
      name: "Recover the plant after a power failure",
      node_type: "task",
      section: "Failure Modes & Recovery",
      depth: 1,
      rationale: null,
    },
  ],
}

// ── Hook mocks ────────────────────────────────────────────────────────────────
const loadBlueprintMutate = jest.fn((_role, opts) => opts?.onSuccess?.(BLUEPRINT))
jest.mock("@/hooks/knowledge-continuity/useSavedRoleBlueprint", () => ({
  useSavedRoleBlueprint: () => ({ mutate: loadBlueprintMutate, isPending: false }),
}))
jest.mock("@/hooks/knowledge-continuity/useSavedRoles", () => ({
  useSavedRoles: () => ({ data: [], isLoading: false }),
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
  loadBlueprintMutate.mockImplementation((_role, opts) => opts?.onSuccess?.(BLUEPRINT))
  mockStartSession.mutateAsync.mockResolvedValue({ id: "session-1" })
  nextQuestionMutate.mockImplementation((_vars, opts) =>
    opts?.onSuccess?.({ question: "What is the first step?", coverage_note: null })
  )
  extractMutateAsync.mockResolvedValue({
    units: [{ category: "procedure", title: "Restart the pumps in sequence" }],
  })
  synthMutateAsync.mockResolvedValue({})
})

function captureButtonFor(name: RegExp) {
  const row = screen.getByText(name).closest("li") as HTMLElement
  return within(row).getByRole("button", { name: /^capture$/i })
}

async function captureThePowerFailureArea(user: UserEvent) {
  await user.type(screen.getByLabelText(/^Expert$/i), "Dana Ruiz")
  await user.click(captureButtonFor(/recover the plant after a power failure/i))
}

describe("KceCapturePage (blueprint-driven)", () => {
  test("loads the role's blueprint and shows the capture plan with its areas", () => {
    render(<KceCapturePage />)
    expect(loadBlueprintMutate).toHaveBeenCalledWith(
      "Senior Water Treatment Operator",
      expect.any(Object)
    )
    expect(screen.getByText(/capture plan/i)).toBeInTheDocument()
    expect(screen.getByText("Plant Operations")).toBeInTheDocument()
    expect(screen.getByText("Recover the plant after a power failure")).toBeInTheDocument()
    // Direction is present.
    expect(screen.getByText(/how a capture works/i)).toBeInTheDocument()
  })

  test("capturing an area starts one session against the root taxonomy and opens the interview", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)
    await captureThePowerFailureArea(user)

    expect(mockStartSession.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "kce-capture",
        expert_user_id: "Dana Ruiz",
        role_title: "Senior Water Treatment Operator",
        is_synthetic: true,
        taxonomy_id: "root-1",
      })
    )
    expect(await screen.findByText("What is the first step?")).toBeInTheDocument()
    expect(nextQuestionMutate).toHaveBeenCalledWith(
      expect.objectContaining({ is_first: true, transcript: [] }),
      expect.any(Object)
    )
  })

  test("answering records a turn tagged with the area's real node id", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)
    await captureThePowerFailureArea(user)
    await screen.findByText("What is the first step?")

    await user.type(screen.getByLabelText(/your answer/i), "Confirm the isolation switch is open.")
    await user.click(screen.getByRole("button", { name: /send answer/i }))

    expect(recordTurnMutate).toHaveBeenCalledWith({
      sessionId: "session-1",
      body: {
        taxonomy_node_id: "node-2",
        question: "What is the first step?",
        response: "Confirm the isolation switch is open.",
      },
    })
  })

  test("saving an area extracts + synthesizes, then finishing shows the outcome", async () => {
    const user = userEvent.setup()
    render(<KceCapturePage />)
    await captureThePowerFailureArea(user)
    await screen.findByText("What is the first step?")

    await user.type(screen.getByLabelText(/your answer/i), "Confirm the isolation switch is open.")
    await user.click(screen.getByRole("button", { name: /send answer/i }))
    await user.click(screen.getByRole("button", { name: /save this area/i }))

    expect(extractMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Senior Water Treatment Operator",
        taxonomy_node_id: "node-2",
      })
    )
    expect(synthMutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1",
      units: [{ category: "procedure", title: "Restart the pumps in sequence" }],
    })

    // Back on the plan, the area is now captured; finish to see the outcome.
    await user.click(await screen.findByRole("button", { name: /see the outcome/i }))
    expect(await screen.findByText(/capture complete/i)).toBeInTheDocument()
    expect(screen.getByText("Restart the pumps in sequence")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /review & validate/i })).toBeInTheDocument()
  })
})
