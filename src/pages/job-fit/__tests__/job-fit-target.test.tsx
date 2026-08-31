/**
 * @jest-environment jsdom
 *
 * "Fit a job description" page — the Job-Fit consumer of the neutral D7 target
 * service. Rendered against a mocked `useTargetExtract` so the page + the
 * confidenceTone helper stay covered without hitting the network.
 */
import { render, screen, fireEvent } from "@testing-library/react"

const mockMutate = jest.fn()
let mockIsPending = false
jest.mock("@/hooks/job-fit/useTargetExtract", () => ({
  useTargetExtract: () => ({ mutate: mockMutate, isPending: mockIsPending }),
}))

import TargetPreviewPage from "../TargetPreviewPage"
import { confidenceTone } from "../_fit"
import type { TargetDraft } from "@/types/targets"

const DRAFT: TargetDraft = {
  behaviors: [
    {
      dimensionId: 1,
      dimensionName: "Innovating",
      category: "behavior",
      target: 72,
      confidence: 0.82,
      evidence: "drives new initiatives",
      provenance: "measured",
      interpretation: "very-high",
    },
  ],
  aptitudes: [
    {
      dimensionId: 2,
      dimensionName: "Investigative",
      category: "aptitude",
      target: 60,
      confidence: 0.3,
      evidence: "imputed from role shape",
      provenance: "imputed",
      interpretation: "moderate",
    },
  ],
  coreTraits: [],
  measuredCount: 1,
  imputedCount: 1,
  meanConfidence: 0.6,
  provider: "stub",
  draft: true,
  warnings: [],
  methodologyNote: "Advisory only — not a hiring decision.",
}

beforeEach(() => {
  mockMutate.mockReset()
  mockIsPending = false
})

describe("TargetPreviewPage", () => {
  it("renders the header and an empty state before extraction", () => {
    render(<TargetPreviewPage />)
    expect(screen.getByRole("heading", { name: /fit a job description/i })).toBeInTheDocument()
    expect(screen.getByText(/drafted target will appear here/i)).toBeInTheDocument()
  })

  it("disables the draft button until a job description is entered", () => {
    render(<TargetPreviewPage />)
    const btn = screen.getByRole("button", { name: /draft the target/i })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "Lead a support team" },
    })
    expect(btn).toBeEnabled()
  })

  it("submits the trimmed JD text to the extract mutation", () => {
    render(<TargetPreviewPage />)
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "  Lead a support team  " },
    })
    fireEvent.click(screen.getByRole("button", { name: /draft the target/i }))
    expect(mockMutate).toHaveBeenCalledWith("Lead a support team", expect.any(Object))
  })

  it("renders the drafted dimensions, summary stats and disclaimer on success", () => {
    // Make the mocked mutate resolve by invoking the success callback.
    mockMutate.mockImplementation((_text: string, opts?: { onSuccess?: (d: TargetDraft) => void }) =>
      opts?.onSuccess?.(DRAFT),
    )
    render(<TargetPreviewPage />)
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "Lead a support team" },
    })
    fireEvent.click(screen.getByRole("button", { name: /draft the target/i }))

    // Grouped dimensions (unique)
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("Investigative")).toBeInTheDocument()
    // Provenance appears on both the summary stat and the per-dimension pill,
    // by design — assert at least one of each rather than uniqueness.
    expect(screen.getAllByText(/from the jd/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/imputed/i).length).toBeGreaterThanOrEqual(1)
    // Confidence pill on the measured dimension (0.82 → 82%)
    expect(screen.getByText(/82% confidence/i)).toBeInTheDocument()
    // Summary stats + disclaimer (unique)
    expect(screen.getByText(/mean confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/not a hiring decision/i)).toBeInTheDocument()
  })
})

describe("confidenceTone", () => {
  it("maps confidence bands to tones", () => {
    expect(confidenceTone(0.9)).toBe("green")
    expect(confidenceTone(0.6)).toBe("teal")
    expect(confidenceTone(0.3)).toBe("amber")
    expect(confidenceTone(0.1)).toBe("gray")
  })
})
