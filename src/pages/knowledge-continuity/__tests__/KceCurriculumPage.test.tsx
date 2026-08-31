/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CurriculumDetail, CurriculumSummary } from "@/types/knowledge-continuity"

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }))

const mockUseCurricula = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useCurricula", () => ({
  useCurricula: (...a: unknown[]) => mockUseCurricula(...a),
}))

const mockUseCurriculum = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useCurriculum", () => ({
  useCurriculum: (...a: unknown[]) => mockUseCurriculum(...a),
}))

const mockMutate = jest.fn()
const mockUseRecordUsage = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useRecordUsage", () => ({
  useRecordUsage: (...a: unknown[]) => mockUseRecordUsage(...a),
}))

const mockUseSavedRoles = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useSavedRoles", () => ({
  useSavedRoles: (...a: unknown[]) => mockUseSavedRoles(...a),
}))

const mockCitableMutateAsync = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useCitableUnits", () => ({
  useCitableUnits: () => ({ mutateAsync: mockCitableMutateAsync, isPending: false }),
}))

const mockBuildMutateAsync = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useBuildCurriculum", () => ({
  useBuildCurriculum: () => ({ mutateAsync: mockBuildMutateAsync, isPending: false }),
}))

const mockPublishMutateAsync = jest.fn()
jest.mock("@/hooks/knowledge-continuity/usePublishCurriculum", () => ({
  usePublishCurriculum: () => ({ mutateAsync: mockPublishMutateAsync, isPending: false }),
}))

import KceCurriculumPage from "../KceCurriculumPage"

const CURRICULUM_SUMMARY: CurriculumSummary = {
  template_id: "tmpl-1",
  name: "Line Lead handover",
  wiring_style: "sequential",
  taxonomy_id: "tax-1",
  session_id: "session-1",
  module_count: 1,
  cited_unit_count: 2,
  published_by: "reviewer@example.com",
  created_at: "2026-07-01T00:00:00Z",
}

const CURRICULUM_DETAIL: CurriculumDetail = {
  template_id: "tmpl-1",
  name: "Line Lead handover",
  wiring_style: "sequential",
  taxonomy_id: "tax-1",
  session_id: "session-1",
  published_by: "reviewer@example.com",
  created_at: "2026-07-01T00:00:00Z",
  modules: [
    {
      title: "Shutdown basics",
      items: [
        {
          text: "Always vent the line before opening the main valve.",
          cited_unit_ids: ["unit-1", "unit-missing"],
        },
      ],
    },
  ],
  units_by_id: {
    "unit-1": {
      id: "unit-1",
      session_id: "session-1",
      taxonomy_node_id: null,
      category: "process",
      title: "Venting procedure",
      body: "Open the bleed valve and wait for the gauge to read zero.",
      structured: null,
      document_id: null,
      criticality: "high",
      kvi: 0.82,
      validity_band: "validated",
      kvi_features: null,
      captured_at: "2026-07-01T00:00:00Z",
    },
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ user: { id: "successor-1", email: "successor@example.com" } })
  mockUseRecordUsage.mockReturnValue({ mutate: mockMutate, isPending: false })
  mockUseCurricula.mockReturnValue({ data: [CURRICULUM_SUMMARY], isLoading: false, isError: false })
  mockUseCurriculum.mockReturnValue({ data: CURRICULUM_DETAIL, isLoading: false, isError: false })
  mockUseSavedRoles.mockReturnValue({ data: [], isLoading: false })
})

describe("KceCurriculumPage", () => {
  test("renders the curriculum picker", () => {
    render(<KceCurriculumPage />)
    expect(screen.getByText("Line Lead handover")).toBeInTheDocument()
    expect(screen.getByText(/1 module/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /open curriculum/i })).toBeInTheDocument()
  })

  test("shows a friendly empty state when nothing is published", () => {
    mockUseCurricula.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<KceCurriculumPage />)
    expect(screen.getByText(/No curricula have been published yet/i)).toBeInTheDocument()
  })

  test("selecting a curriculum shows the walk-through with a taught sentence and its provenance", async () => {
    const user = userEvent.setup()
    render(<KceCurriculumPage />)

    await user.click(screen.getByRole("button", { name: /open curriculum/i }))

    expect(screen.getByText("Shutdown basics")).toBeInTheDocument()
    expect(
      screen.getByText("Always vent the line before opening the main valve.")
    ).toBeInTheDocument()

    // Provenance is behind a disclosure — expand it.
    await user.click(screen.getByRole("button", { name: /where this comes from/i }))
    expect(screen.getByText("Venting procedure")).toBeInTheDocument()
    expect(screen.getByText("Validated")).toBeInTheDocument()
    // A purged citation renders as an unresolved chip rather than crashing.
    expect(screen.getByText(/Source no longer available/i)).toBeInTheDocument()
  })

  test("clicking Still accurate fires the usage mutation for the current user", async () => {
    const user = userEvent.setup()
    render(<KceCurriculumPage />)

    await user.click(screen.getByRole("button", { name: /open curriculum/i }))
    await user.click(screen.getByRole("button", { name: /where this comes from/i }))
    await user.click(screen.getByRole("button", { name: /still accurate/i }))

    expect(mockMutate).toHaveBeenCalledWith({
      unitId: "unit-1",
      templateId: "tmpl-1",
      body: { signal_type: "still_true", value: 1.0, successor_user_id: "successor-1" },
    })
  })

  test("Build a curriculum: fetch citable units -> build -> publish -> open it", async () => {
    mockUseSavedRoles.mockReturnValue({
      data: [{ role_title: "Line Lead", node_count: 5, taxonomy_id: "tax-1", created_at: null }],
      isLoading: false,
    })
    mockCitableMutateAsync.mockResolvedValue({
      taxonomy_id: "tax-1",
      bands: ["validated", "provisional"],
      units: [{ id: "u1", category: "procedure", title: "T", body: "B", taxonomy_node_id: "n1" }],
    })
    mockBuildMutateAsync.mockResolvedValue({
      taxonomy_id: "tax-1",
      wiring_style: "sequential",
      modules: [{ title: "M1", ordered_unit_ids: ["u1"], items: [{ text: "Do X", cited_unit_ids: ["u1"] }] }],
      cited_unit_ids: ["u1"],
      module_count: 1,
      quarantined_count: 0,
    })
    mockPublishMutateAsync.mockResolvedValue({ template_id: "tmpl-new", module_count: 1, cited_unit_count: 1 })

    const user = userEvent.setup()
    render(<KceCurriculumPage />)

    await user.selectOptions(screen.getByLabelText(/^Role$/i), "Line Lead")
    await user.click(screen.getByRole("button", { name: /build & publish/i }))

    expect(mockCitableMutateAsync).toHaveBeenCalledWith("tax-1")
    expect(mockBuildMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ taxonomy_id: "tax-1", units: [expect.objectContaining({ id: "u1" })] })
    )
    expect(mockPublishMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ taxonomy_id: "tax-1", wiring_style: "sequential" })
    )
    // publishing opens the new curriculum (walk-through loads tmpl-new via useCurriculum)
    expect(mockUseCurriculum).toHaveBeenCalledWith("tmpl-new")
  })
})
