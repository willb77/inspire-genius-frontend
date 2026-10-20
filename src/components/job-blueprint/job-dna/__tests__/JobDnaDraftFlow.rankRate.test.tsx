/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { JobDnaDraftFlow } from "../JobDnaDraftFlow"
import { calculateBenchmark } from "@/lib/job-blueprint/scoring"
import type { DimensionBenchmark, DraftBenchmarkResponse } from "@/types/job-blueprint"

/*
 * The review screen under Rank-then-Rate (drafter method "rank-then-rate",
 * 2026-10-20): each dimension's rate is an AI proposal the reviewer can change
 * within the range that keeps its tier; the target is computed live by the
 * authoritative scoring.ts; nothing saves until the reviewer confirms.
 *
 * BLOCKS below is verbatim output of the agent-engine drafter's repair_block
 * for one set of model scores, so the fixture is the real wire shape.
 */

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

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

const BLOCKS = {"behaviors": [{"dimension_id": 1, "dimension_name": "Innovating", "category": "behavior", "rank_position": 5, "rank_percent": 48, "rate_value": 5, "final_benchmark_percent": 55, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 58.0, "ai_rate": 5, "rate_min": 2, "rate_max": 6, "max_rate": 8}, {"dimension_id": 2, "dimension_name": "Initiating", "category": "behavior", "rank_position": 1, "rank_percent": 96, "rate_value": 7, "final_benchmark_percent": 92, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 92.0, "ai_rate": 7, "rate_min": 3, "rate_max": 8, "max_rate": 8}, {"dimension_id": 3, "dimension_name": "Supporting", "category": "behavior", "rank_position": 6, "rank_percent": 36, "rate_value": 4, "final_benchmark_percent": 43, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 45.0, "ai_rate": 4, "rate_min": 3, "rate_max": 7, "max_rate": 8}, {"dimension_id": 4, "dimension_name": "Coordinating", "category": "behavior", "rank_position": 4, "rank_percent": 60, "rate_value": 5, "final_benchmark_percent": 61, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 62.0, "ai_rate": 5, "rate_min": 1, "rate_max": 5, "max_rate": 8}, {"dimension_id": 5, "dimension_name": "Focusing", "category": "behavior", "rank_position": 2, "rank_percent": 84, "rate_value": 7, "final_benchmark_percent": 86, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 85.0, "ai_rate": 7, "rate_min": 4, "rate_max": 8, "max_rate": 8}, {"dimension_id": 6, "dimension_name": "Delivering", "category": "behavior", "rank_position": 3, "rank_percent": 72, "rate_value": 6, "final_benchmark_percent": 74, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 74.0, "ai_rate": 6, "rate_min": 5, "rate_max": 8, "max_rate": 8}, {"dimension_id": 7, "dimension_name": "Finishing", "category": "behavior", "rank_position": 8, "rank_percent": 12, "rate_value": 2, "final_benchmark_percent": 19, "interpretation": "counter-productive", "rate_source": "ai-proposed", "ai_score": 22.0, "ai_rate": 2, "rate_min": 1, "rate_max": 4, "max_rate": 8}, {"dimension_id": 8, "dimension_name": "Evaluating", "category": "behavior", "rank_position": 7, "rank_percent": 24, "rate_value": 2, "final_benchmark_percent": 25, "interpretation": "counter-productive", "rate_source": "ai-proposed", "ai_score": 30.0, "ai_rate": 2, "rate_min": 1, "rate_max": 3, "max_rate": 8}], "aptitudes": [{"dimension_id": 1, "dimension_name": "Practical & Mechanical", "category": "aptitude", "rank_position": 6, "rank_percent": 37, "rate_value": 3, "final_benchmark_percent": 37, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 40.0, "ai_rate": 3, "rate_min": 3, "rate_max": 7, "max_rate": 8}, {"dimension_id": 2, "dimension_name": "Investigative & Analytical", "category": "aptitude", "rank_position": 4, "rank_percent": 62, "rate_value": 4, "final_benchmark_percent": 56, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 52.0, "ai_rate": 4, "rate_min": 1, "rate_max": 5, "max_rate": 8}, {"dimension_id": 3, "dimension_name": "Creative & Artistic", "category": "aptitude", "rank_position": 5, "rank_percent": 50, "rate_value": 4, "final_benchmark_percent": 50, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 44.0, "ai_rate": 4, "rate_min": 2, "rate_max": 6, "max_rate": 8}, {"dimension_id": 4, "dimension_name": "Social & Empathetic", "category": "aptitude", "rank_position": 3, "rank_percent": 75, "rate_value": 6, "final_benchmark_percent": 75, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 78.0, "ai_rate": 6, "rate_min": 5, "rate_max": 8, "max_rate": 8}, {"dimension_id": 5, "dimension_name": "Competitive & Entrepreneurial", "category": "aptitude", "rank_position": 2, "rank_percent": 88, "rate_value": 7, "final_benchmark_percent": 88, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 90.0, "ai_rate": 7, "rate_min": 4, "rate_max": 8, "max_rate": 8}, {"dimension_id": 6, "dimension_name": "Orderly & Efficient", "category": "aptitude", "rank_position": 7, "rank_percent": 25, "rate_value": 4, "final_benchmark_percent": 38, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 35.0, "ai_rate": 3, "rate_min": 4, "rate_max": 8, "max_rate": 8}, {"dimension_id": 7, "dimension_name": "Mathematical & Logical", "category": "aptitude", "rank_position": 8, "rank_percent": 13, "rate_value": 5, "final_benchmark_percent": 38, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 30.0, "ai_rate": 2, "rate_min": 5, "rate_max": 8, "max_rate": 8}, {"dimension_id": 8, "dimension_name": "Outgoing & Expressive", "category": "aptitude", "rank_position": 1, "rank_percent": 100, "rate_value": 8, "final_benchmark_percent": 100, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 95.0, "ai_rate": 8, "rate_min": 3, "rate_max": 8, "max_rate": 8}], "core_traits": [{"dimension_id": 1, "dimension_name": "Relationship Management", "category": "core-trait", "rank_position": 2, "rank_percent": 83, "rate_value": 5, "final_benchmark_percent": 83, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 82.0, "ai_rate": 5, "rate_min": 3, "rate_max": 6, "max_rate": 6}, {"dimension_id": 2, "dimension_name": "Emotional Stability", "category": "core-trait", "rank_position": 4, "rank_percent": 50, "rate_value": 3, "final_benchmark_percent": 50, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 55.0, "ai_rate": 3, "rate_min": 2, "rate_max": 4, "max_rate": 6}, {"dimension_id": 3, "dimension_name": "Decisiveness", "category": "core-trait", "rank_position": 3, "rank_percent": 67, "rate_value": 4, "final_benchmark_percent": 67, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 70.0, "ai_rate": 4, "rate_min": 4, "rate_max": 6, "max_rate": 6}, {"dimension_id": 4, "dimension_name": "Self-Motivation", "category": "core-trait", "rank_position": 1, "rank_percent": 100, "rate_value": 6, "final_benchmark_percent": 100, "interpretation": "critical", "rate_source": "ai-proposed", "ai_score": 94.0, "ai_rate": 6, "rate_min": 2, "rate_max": 6, "max_rate": 6}, {"dimension_id": 5, "dimension_name": "Conscientiousness", "category": "core-trait", "rank_position": 6, "rank_percent": 17, "rate_value": 4, "final_benchmark_percent": 42, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 38.0, "ai_rate": 2, "rate_min": 4, "rate_max": 6, "max_rate": 6}, {"dimension_id": 6, "dimension_name": "Flexibility", "category": "core-trait", "rank_position": 5, "rank_percent": 33, "rate_value": 3, "final_benchmark_percent": 42, "interpretation": "unimportant", "rate_source": "ai-proposed", "ai_score": 50.0, "ai_rate": 3, "rate_min": 3, "rate_max": 5, "max_rate": 6}]} as Pick<DraftBenchmarkResponse, "behaviors" | "aptitudes" | "core_traits">

const DRAFT: DraftBenchmarkResponse = {
  role_title: "Sales Lead",
  archetype: "managerial",
  rationale: "Pace and initiative.",
  method: "rank-then-rate",
  rate_status: "ai-proposed",
  ...BLOCKS,
}

async function openReview() {
  render(<JobDnaDraftFlow />)
  fireEvent.change(screen.getByLabelText("Role title"), { target: { value: "Sales Lead" } })
  fireEvent.click(screen.getByRole("button", { name: /draft the blueprint/i }))
  await waitFor(() => expect(screen.getByText("Blueprint drafted")).toBeInTheDocument())
}

beforeEach(() => {
  jest.clearAllMocks()
  createMutateAsync.mockResolvedValue({ id: "new-id" })
  finalizeMutateAsync.mockResolvedValue({})
  draftMutate.mockImplementation((_body, opts) => opts?.onSuccess?.(DRAFT))
})

describe("JobDnaDraftFlow — Rank-then-Rate review", () => {
  it("shows each AI-proposed rate, offering only the rates that keep its tier", async () => {
    await openReview()
    const innovating = screen.getByLabelText("Innovating rate") as HTMLSelectElement
    // rank 5 behaviour, unimportant: rates 2..6 keep it unimportant
    expect(Array.from(innovating.options).map((o) => Number(o.value))).toEqual([2, 3, 4, 5, 6])
    expect(innovating.value).toBe("5")
    expect(within(innovating).getByRole("option", { name: "5 of 8 (AI)", selected: true })).toBeInTheDocument()
    expect(screen.getByLabelText("Innovating target")).toHaveTextContent("55%")
    // a rate the model wanted but §3 would not allow is shown, not hidden
    expect(screen.getByText(/it suggested 3; held at 4 so this stays unimportant/)).toBeInTheDocument()
    // the percent box of the legacy screen is gone: the target is not typed
    expect(screen.queryByLabelText("Innovating benchmark percent")).not.toBeInTheDocument()
  })

  it("recomputes the target live from the rank and the chosen rate", async () => {
    await openReview()
    fireEvent.change(screen.getByLabelText("Innovating rate"), { target: { value: "2" } })
    expect(screen.getByLabelText("Innovating target")).toHaveTextContent(
      `${calculateBenchmark(4, 2, "behavior")}%`,
    )
    expect(screen.getByText(/you set 2/)).toBeInTheDocument()
  })

  it("will not save until the reviewer confirms, then saves a coherent Rank-then-Rate record", async () => {
    await openReview()
    fireEvent.change(screen.getByLabelText("Innovating rate"), { target: { value: "6" } })

    const save = screen.getByRole("button", { name: /save role & blueprint/i })
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(createMutateAsync).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/I have reviewed all 22 rates \(1 changed/))
    expect(save).toBeEnabled()
    fireEvent.click(save)

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const arg = createMutateAsync.mock.calls[0][0]
    const all: DimensionBenchmark[] = [...arg.behaviors, ...arg.aptitudes, ...arg.coreTraits]
    expect(all).toHaveLength(22)
    // the guard: every saved target is the formula of its own saved inputs
    for (const b of all) {
      expect(b.finalBenchmarkPercent).toBe(calculateBenchmark(b.rankPosition - 1, b.rateValue, b.category))
    }
    const innovating = arg.behaviors.find((b: DimensionBenchmark) => b.dimensionName === "Innovating")
    expect(innovating.rateValue).toBe(6)
    expect(innovating.finalBenchmarkPercent).toBe(calculateBenchmark(4, 6, "behavior"))
    expect(arg.benchmarkSource).toBe("llm-draft")
    expect(arg.sourceRef).toMatch(/rates AI-proposed and confirmed in review \(1 of 22 changed\)/)
    // the publish is what records the reviewer (blueprint-service finalize)
    expect(finalizeMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ id: "new-id" }))
  })

  it("falls back to the percent editor for a drafter that predates Rank-then-Rate", async () => {
    const legacy = { ...DRAFT, method: undefined }
    draftMutate.mockImplementation((_body, opts) => opts?.onSuccess?.(legacy))
    await openReview()
    expect(screen.getByLabelText("Innovating benchmark percent")).toBeInTheDocument()
    expect(screen.queryByLabelText("Innovating rate")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save role & blueprint/i })).toBeEnabled()
  })
})
