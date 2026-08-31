/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { JobDnaDraftFlow } from "../JobDnaDraftFlow"
import type { DraftDimension } from "@/types/job-blueprint"

/* ── Router ── */
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }))

/* ── Toast ── */
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/* ── Hooks ── */
const draftMutate = jest.fn()
const createMutateAsync = jest.fn()
const finalizeMutateAsync = jest.fn()

jest.mock("@/hooks/job-blueprint/useAllRoles", () => ({
  KCE_ORG_ID: "kce-capture",
  useAllRoles: () => ({ roles: [], isLoading: false }),
}))
jest.mock("@/hooks/job-blueprint/useDraftBenchmark", () => ({
  useDraftBenchmark: () => ({ mutate: draftMutate, isPending: false }),
}))
jest.mock("@/hooks/job-blueprint/useJobDna", () => ({
  useCreateJobDna: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useFinalizeBenchmark: () => ({ mutateAsync: finalizeMutateAsync, isPending: false }),
}))

const dim = (id: number, name: string, category: DraftDimension["category"], pct: number): DraftDimension => ({
  dimension_id: id,
  dimension_name: name,
  category,
  final_benchmark_percent: pct,
  rank_percent: pct,
  rate_value: 7,
  rank_position: id - 1,
  interpretation: pct >= 70 ? "critical" : pct <= 20 ? "counter-productive" : "unimportant",
})

const SAMPLE_DRAFT = {
  role_title: "Senior Engineer",
  archetype: "operational",
  rationale: "Hands-on delivery role.",
  behaviors: Array.from({ length: 8 }, (_, i) => dim(i + 1, `Beh${i + 1}`, "behavior", 80 - i * 5)),
  aptitudes: Array.from({ length: 8 }, (_, i) => dim(i + 1, `Apt${i + 1}`, "aptitude", 60 - i * 3)),
  core_traits: Array.from({ length: 6 }, (_, i) => dim(i + 1, `Trait${i + 1}`, "core-trait", 50 - i * 2)),
}

beforeEach(() => {
  jest.clearAllMocks()
  createMutateAsync.mockResolvedValue({ id: "new-id" })
  finalizeMutateAsync.mockResolvedValue({})
  // The draft mutation resolves immediately into the review step.
  draftMutate.mockImplementation((_body, opts) => opts?.onSuccess?.(SAMPLE_DRAFT))
})

describe("JobDnaDraftFlow", () => {
  it("drafts → reviews → saves, mapping the drafted benchmark into a create + finalize", async () => {
    render(<JobDnaDraftFlow />)

    // ── form step ──
    expect(screen.getByText("Draft a blueprint")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Role title"), { target: { value: "Senior Engineer" } })
    fireEvent.click(screen.getByRole("button", { name: /draft the blueprint/i }))

    // ── review step ──
    await waitFor(() => expect(screen.getByText("Blueprint drafted")).toBeInTheDocument())
    expect(draftMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role_title: "Senior Engineer", archetype: "auto" }),
      expect.any(Object),
    )
    expect(screen.getByText("Behaviors")).toBeInTheDocument()
    expect(screen.getByText("Work Aptitudes")).toBeInTheDocument()
    expect(screen.getByText("Core Traits")).toBeInTheDocument()

    // edit a benchmark percent before saving
    const beh1 = screen.getByLabelText("Beh1 benchmark percent")
    fireEvent.change(beh1, { target: { value: "95" } })

    // ── save ──
    fireEvent.click(screen.getByRole("button", { name: /save role & blueprint/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const createArg = createMutateAsync.mock.calls[0][0]
    expect(createArg.roleTitle).toBe("Senior Engineer")
    expect(createArg.behaviors).toHaveLength(8)
    expect(createArg.aptitudes).toHaveLength(8)
    expect(createArg.coreTraits).toHaveLength(6)
    // operational archetype → front-line tier
    expect(createArg.tier).toBe("front-line")
    // the edited percent survived the DraftDimension → DimensionBenchmark map
    expect(createArg.behaviors[0].finalBenchmarkPercent).toBe(95)
    // benchmark shape is camelCase with a derived interpretation band
    expect(createArg.behaviors[0]).toHaveProperty("dimensionName", "Beh1")
    expect(createArg.behaviors[0].interpretation).toBe("very-high")

    expect(finalizeMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-id", benchmark: expect.any(Object) }),
    )

    // ── done step ──
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /view the blueprint/i }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-blueprint/dna/new-id")
  })

  it("start over returns to the form", async () => {
    render(<JobDnaDraftFlow />)
    fireEvent.change(screen.getByLabelText("Role title"), { target: { value: "Analyst" } })
    fireEvent.click(screen.getByRole("button", { name: /draft the blueprint/i }))

    await waitFor(() => expect(screen.getByText("Blueprint drafted")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /start over/i }))
    expect(screen.getByText("Draft a blueprint")).toBeInTheDocument()
  })
})
