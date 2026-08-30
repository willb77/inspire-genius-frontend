/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  BlueprintGenerateResponse,
  JobDnaTaxonomySeed,
  SavedRole,
  SavedRoleBlueprint,
} from "@/types/knowledge-continuity"

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

const jobDnaListData = [{ id: "jd-1", roleTitle: "Field Service Technician" }]
jest.mock("@/hooks/job-blueprint", () => ({
  useJobDnaList: () => ({ data: jobDnaListData, isLoading: false }),
}))

const seedMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useJobDnaSeed", () => ({
  useJobDnaSeed: () => ({ mutate: seedMutate, isPending: false }),
}))

let savedRolesData: SavedRole[] = []
jest.mock("@/hooks/knowledge-continuity/useSavedRoles", () => ({
  useSavedRoles: () => ({ data: savedRolesData, isLoading: false }),
}))

const savedRoleMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useSavedRoleBlueprint", () => ({
  useSavedRoleBlueprint: () => ({ mutate: savedRoleMutate, isPending: false }),
}))

const mockExtract = jest.fn()
jest.mock("@/lib/extractRoleText", () => ({
  ACCEPTED_ROLE_FILE_TYPES: ".txt,.pdf,.docx",
  extractRoleText: (file: File) => mockExtract(file),
}))

import KceBlueprintPage from "../KceBlueprintPage"

const FAKE_SEED: JobDnaTaxonomySeed = {
  blueprintId: "jd-1",
  roleTitle: "Field Service Technician",
  archetype: "operational",
  archetypeRationale: "hands-on field role",
  sections: ["Procedures"],
  nodes: [
    { ref: "s1", parent_ref: null, name: "Pump maintenance", node_type: "responsibility_area", section: "Procedures", depth: 0, rationale: "seed node" },
  ],
}

const FAKE_BLUEPRINT: BlueprintGenerateResponse = {
  role_title: "Chief Information Officer",
  archetype: "executive",
  archetype_rationale: "matched executive signal 'cio'",
  sections: ["Decision Heuristics"],
  nodes: [
    { ref: "n1", parent_ref: null, name: "Cyber-risk posture", node_type: "responsibility_area", section: "Decision Heuristics", depth: 0, rationale: "core call area" },
    { ref: "n2", parent_ref: "n1", name: "When a breach goes to the board", node_type: "decision", section: "Decision Heuristics", depth: 1, rationale: null },
  ],
}

const FAKE_SAVED: SavedRoleBlueprint = {
  role_title: "Senior Operator",
  nodes: [
    { ref: "db1", parent_ref: null, name: "Night-shift recovery", node_type: "responsibility_area", section: "Failure Modes", depth: 0, rationale: null },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  savedRolesData = []
  generateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(FAKE_BLUEPRINT))
  persistMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.({ created: 2, rootId: "tax-root" }))
  seedMutate.mockImplementation((_id, opts) => opts?.onSuccess?.(FAKE_SEED))
  savedRoleMutate.mockImplementation((_role, opts) => opts?.onSuccess?.(FAKE_SAVED))
})

async function draft(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/role title/i), "Chief Information Officer")
  await user.click(screen.getByRole("button", { name: /draft the blueprint/i }))
}

describe("KceBlueprintPage", () => {
  test("renders the generate form", () => {
    render(<KceBlueprintPage />)
    expect(screen.getByRole("heading", { name: /blueprint a role/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/role title/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /upload a role/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /draft the blueprint/i })).toBeInTheDocument()
  })

  test("drafting calls generate then shows the drafted summary + review tree", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)

    expect(generateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role_title: "Chief Information Officer" }),
      expect.any(Object)
    )
    expect(await screen.findByText(/blueprint drafted/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue("Cyber-risk posture")).toBeInTheDocument()
    expect(screen.getByDisplayValue("When a breach goes to the board")).toBeInTheDocument()
  })

  test("saving persists the tree then shows the done step with next steps (no auto-navigate)", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)
    await screen.findByText(/blueprint drafted/i)

    await user.click(screen.getByRole("button", { name: /save role/i }))

    expect(persistMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "kce-capture",
        role_title: "Chief Information Officer",
        nodes: expect.arrayContaining([expect.objectContaining({ ref: "n1" })]),
      }),
      expect.any(Object)
    )
    // done step — not an auto-navigate
    expect(await screen.findByText(/saved “Chief Information Officer”/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()

    // the recommended next step navigates to capture, carrying the role
    await user.click(screen.getByRole("button", { name: /start a capture/i }))
    expect(navigateMock).toHaveBeenCalledWith(
      "/vertical/knowledge-continuity/capture?role=Chief%20Information%20Officer"
    )
  })

  test("removing a parent prunes its descendants", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)
    await screen.findByText(/blueprint drafted/i)

    await user.click(screen.getByRole("button", { name: /remove Cyber-risk posture/i }))
    expect(screen.queryByDisplayValue("Cyber-risk posture")).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue("When a breach goes to the board")).not.toBeInTheDocument()
  })

  test("seeding from a Job Blueprint prefills the role and passes seed_nodes", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)

    await user.selectOptions(screen.getByLabelText(/seed from a job blueprint/i), "jd-1")
    expect(seedMutate).toHaveBeenCalledWith("jd-1", expect.any(Object))
    expect(screen.getByLabelText(/role title/i)).toHaveValue("Field Service Technician")

    await user.click(screen.getByRole("button", { name: /draft the blueprint/i }))
    expect(generateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Field Service Technician",
        seed_nodes: expect.arrayContaining([expect.objectContaining({ ref: "s1", name: "Pump maintenance" })]),
      }),
      expect.any(Object)
    )
  })

  test("uploading a role extracts text into the context and fills the title", async () => {
    mockExtract.mockResolvedValue({ text: "Runs the plant at night.", suggestedTitle: "Night Operator" })
    const user = userEvent.setup()
    render(<KceBlueprintPage />)

    const file = new File(["Runs the plant at night."], "night-operator.txt", { type: "text/plain" })
    await user.upload(screen.getByLabelText(/upload a role document/i), file)

    expect(mockExtract).toHaveBeenCalledWith(file)
    expect(await screen.findByText(/night-operator\.txt/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^context/i)).toHaveValue("Runs the plant at night.")
    expect(screen.getByLabelText(/role title/i)).toHaveValue("Night Operator")
  })

  test("picking a saved role loads it read-only with a Start-a-capture CTA", async () => {
    savedRolesData = [{ role_title: "Senior Operator", node_count: 5, taxonomy_id: "t1", created_at: null }]
    const user = userEvent.setup()
    render(<KceBlueprintPage />)

    await user.selectOptions(screen.getByLabelText(/^Role$/i), "Senior Operator")
    expect(savedRoleMutate).toHaveBeenCalledWith("Senior Operator", expect.any(Object))

    expect(await screen.findByText("Night-shift recovery")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /start a capture/i }))
    expect(navigateMock).toHaveBeenCalledWith(
      "/vertical/knowledge-continuity/capture?role=Senior%20Operator"
    )
  })

  test("drafting without a Job Blueprint sends no seed_nodes", async () => {
    const user = userEvent.setup()
    render(<KceBlueprintPage />)
    await draft(user)
    expect(seedMutate).not.toHaveBeenCalled()
    expect(generateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role_title: "Chief Information Officer", seed_nodes: undefined }),
      expect.any(Object)
    )
  })
})
