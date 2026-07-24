/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { BlueprintGenerateResponse } from "@/types/knowledge-continuity"

// ── Router + toast ────────────────────────────────────────────────────────────
const navigateMock = jest.fn()
jest.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

// ── Hook mocks ────────────────────────────────────────────────────────────────
const generateMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useGenerateBlueprint", () => ({
  useGenerateBlueprint: () => ({ mutate: generateMutate, isPending: false }),
}))

const persistMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/usePersistBlueprint", () => ({
  usePersistBlueprint: () => ({ mutate: persistMutate, isPending: false }),
}))

import KceBlueprintPage from "../KceBlueprintPage"

const FAKE_BLUEPRINT: BlueprintGenerateResponse = {
  role_title: "Chief Information Officer",
  archetype: "executive",
  archetype_rationale: "matched executive signal 'cio'",
  sections: ["Decision Heuristics"],
  nodes: [
    {
      ref: "n1",
      parent_ref: null,
      name: "Cyber-risk posture",
      node_type: "responsibility_area",
      section: "Decision Heuristics",
      depth: 0,
      rationale: "core call area",
    },
    {
      ref: "n2",
      parent_ref: "n1",
      name: "When a breach goes to the board",
      node_type: "decision",
      section: "Decision Heuristics",
      depth: 1,
      rationale: null,
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  // generate resolves straight through onSuccess with a fixed blueprint.
  generateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(FAKE_BLUEPRINT))
  // persist resolves through onSuccess with a created count + root id.
  persistMutate.mockImplementation((_vars, opts) =>
    opts?.onSuccess?.({ created: 2, rootId: "tax-root" })
  )
})

async function draft(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Role$/i), "Chief Information Officer")
  await user.click(screen.getByRole("button", { name: /draft the blueprint/i }))
}

describe("KceBlueprintPage", () => {
  test("renders the generate form", () => {
    render(<KceBlueprintPage />)
    expect(screen.getByRole("heading", { name: /blueprint a role/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Role$/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /draft the blueprint/i })).toBeInTheDocument()
  })

  test("drafting calls generate then shows the review tree", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)

    expect(generateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role_title: "Chief Information Officer" }),
      expect.any(Object)
    )
    // review step
    expect(await screen.findByText(/executive shape/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue("Cyber-risk posture")).toBeInTheDocument()
    expect(screen.getByDisplayValue("When a breach goes to the board")).toBeInTheDocument()
  })

  test("approving persists the tree and navigates to capture", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)
    await screen.findByText(/executive shape/i)

    await user.click(screen.getByRole("button", { name: /approve & create/i }))

    expect(persistMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "kce-capture",
        role_title: "Chief Information Officer",
        nodes: expect.arrayContaining([expect.objectContaining({ ref: "n1" })]),
      }),
      expect.any(Object)
    )
    expect(navigateMock).toHaveBeenCalledWith("/vertical/knowledge-continuity/capture")
  })

  test("removing a parent prunes its descendants", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)
    await screen.findByText(/executive shape/i)

    await user.click(screen.getByRole("button", { name: /remove Cyber-risk posture/i }))

    expect(screen.queryByDisplayValue("Cyber-risk posture")).not.toBeInTheDocument()
    // child pruned with the parent
    expect(screen.queryByDisplayValue("When a breach goes to the board")).not.toBeInTheDocument()
  })
})
