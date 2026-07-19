/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { HonorEvaluation, HonorFellow } from "@/types/honor"

/* ── mocks ── */
const evaluateFellow = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  evaluateFellow: (...a: unknown[]) => evaluateFellow(...a),
}))

const sendHonorEvaluation = jest.fn()
jest.mock("@/services/honor/honorChat", () => ({
  sendHonorEvaluation: (...a: unknown[]) => sendHonorEvaluation(...a),
}))

const initiateUpload = jest.fn()
const uploadToS3 = jest.fn()
const triggerProcessing = jest.fn()
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: (...a: unknown[]) => initiateUpload(...a),
  uploadToS3: (...a: unknown[]) => uploadToS3(...a),
  triggerProcessing: (...a: unknown[]) => triggerProcessing(...a),
}))

const useCaseload = jest.fn()
jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => useCaseload(),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import HonorEvaluate from "../HonorEvaluate"

function fellow(id: string, first: string, last: string): HonorFellow {
  return {
    id,
    firstName: first,
    lastName: last,
    email: `${first}@honor.org`,
    background: "SOF",
    target: "Program Management",
    prism: { label: "N/B", quads: ["N", "B"] },
    disc: null,
    cliftonStrengths: [],
    status: "assessed",
    cohort: "2026",
    docs: [],
  }
}

const FELLOWS = [fellow("f1", "Marcus", "Reyes"), fellow("f2", "Dana", "Cole")]

function opsEval(subjectId = "f1"): HonorEvaluation {
  return {
    subject_id: subjectId,
    objective_evaluation: [{ statement: "Strong PRISM: Coordinating", source: "PRISM: Coordinating 90" }],
    development_areas: [{ statement: "Development area: PRISM: Innovating", source: "PRISM: Innovating 25" }],
    career_fit_ranked: [
      {
        area: "operations_program_management",
        label: "Operations Program Management",
        score: 95.6,
        top_factors: [
          { feature: "prism:behaviorpreferences:coordinating", label: "PRISM: Coordinating", closeness: 1, contribution: 20, source: "PRISM: Coordinating 90" },
        ],
        top_gaps: [],
      },
      { area: "security_risk_management", label: "Security Risk Management", score: 78, top_factors: [], top_gaps: [] },
    ],
    goals_fit: [
      { goal: "Operations program management role", area: "operations_program_management", label: "Operations Program Management", score: 95.6, verdict: "supported", factors: [] },
    ],
    comparative: null,
    frameworks: ["PRISM"],
    imputed_features: [],
    notes: "Deterministic; no model call.",
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/honor/evaluate"]}>
        <HonorEvaluate />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useCaseload.mockReturnValue({ data: FELLOWS })
  evaluateFellow.mockResolvedValue({ status: true, data: opsEval() })
  sendHonorEvaluation.mockResolvedValue({ content: "Marcus is a strong operator.", trace: ["Aura", "Meridian"], sessionId: "s1" })
  initiateUpload.mockResolvedValue({ document_id: "d1", upload_url: "u", upload_fields: {} })
  uploadToS3.mockResolvedValue(undefined)
  triggerProcessing.mockResolvedValue({ id: "d1" })
})

test("selecting a fellow + Run evaluation renders the cited, ranked deterministic report", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  expect(screen.getByText("Subject")).toBeInTheDocument() // primary marker
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalledTimes(1))
  expect(evaluateFellow).toHaveBeenCalledWith("f1", expect.objectContaining({ goals: undefined, memberIds: undefined }))

  // ranked career fit + cited source render
  expect(await screen.findByText("Operations Program Management")).toBeInTheDocument()
  expect(screen.getAllByText("95.6").length).toBeGreaterThan(0)
  expect(screen.getAllByText("PRISM: Coordinating 90").length).toBeGreaterThan(0)
})

test("goals text flows into the request and renders a verdict", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.change(screen.getByPlaceholderText(/Operations program management role/i), {
    target: { value: "Operations program management role" },
  })
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  expect(evaluateFellow).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({ goals: ["Operations program management role"] }),
  )
  expect(await screen.findByText("supported")).toBeInTheDocument()
})

test("two fellows → comparative mode passes memberIds + targetArea", async () => {
  const withComparative = { ...opsEval(), comparative: {
    subjects: ["f2"], areas: ["operations_program_management", "security_risk_management"],
    per_subject_area_fit: { f2: { operations_program_management: 55, security_risk_management: 80 } },
    pairwise_similarity: { f2: { f2: 100 } },
    team_read: { target_area: "operations_program_management", label: "Operations Program Management", covered: ["prism:behaviorpreferences:coordinating"], gaps: [], redundant: [], complementary: [], best_by_feature: {} },
  } }
  evaluateFellow.mockResolvedValue({ status: true, data: withComparative })

  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByText("Dana Cole"))
  expect(screen.getByText("1:1 comparison")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  expect(evaluateFellow).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({ memberIds: ["f2"], targetArea: "operations_program_management" }),
  )
  expect(await screen.findByText("Comparative — fit by area")).toBeInTheDocument()
  expect(screen.getByText("Covered:")).toBeInTheDocument() // team read block rendered
})

test("attaching a position description uploads with doc_kind=position for the subject", async () => {
  const { container } = renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(["jd"], "pm-role.pdf", { type: "application/pdf" })
  fireEvent.change(input, { target: { files: [file] } })

  await waitFor(() => expect(initiateUpload).toHaveBeenCalledTimes(1))
  expect(initiateUpload).toHaveBeenCalledWith(
    expect.objectContaining({ doc_kind: "position", subject_user_id: "f1", filename: "pm-role.pdf" }),
  )
  expect(triggerProcessing).toHaveBeenCalledWith("d1")
})

test("Narrate with Meridian renders the synthesized prose + trace", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  fireEvent.click(screen.getByRole("button", { name: /narrate with meridian/i }))
  await waitFor(() => expect(sendHonorEvaluation).toHaveBeenCalledTimes(1))
  // narration goes to Meridian for the subject fellow, model-free summary in the prompt
  expect(sendHonorEvaluation).toHaveBeenCalledWith(
    expect.stringContaining("Do not invent or change any score"),
    expect.objectContaining({ memberId: "f1" }),
  )
  expect(await screen.findByText("Meridian narrative")).toBeInTheDocument()
  expect(screen.getByText("Marcus is a strong operator.")).toBeInTheDocument()
})

test("select all selects every fellow; no-scores fellow shows the imputed banner", async () => {
  evaluateFellow.mockResolvedValue({
    status: true,
    data: { ...opsEval(), frameworks: [], imputed_features: ["prism:behaviorpreferences:coordinating"] },
  })
  renderPage()
  fireEvent.click(screen.getByRole("button", { name: /select all/i }))
  expect(screen.getByText("Subject")).toBeInTheDocument() // first fellow is primary
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  // both other fellows passed as comparison memberIds
  expect(evaluateFellow).toHaveBeenCalledWith("f1", expect.objectContaining({ memberIds: ["f2"] }))
  expect(await screen.findByText(/imputed-neutral/i)).toBeInTheDocument()
})
