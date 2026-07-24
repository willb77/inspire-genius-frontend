/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { HonorEvaluation, HonorFellow } from "@/types/honor"

/* ── mocks ── */
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const evaluateFellow = jest.fn()
const getFellowSources = jest.fn()
const recordReportExport = jest.fn()
const emailReport = jest.fn()
const generateReportDocument = jest.fn()
const saveEvaluation = jest.fn()
const listEvaluations = jest.fn()
const getEvaluation = jest.fn()
const deleteEvaluation = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  evaluateFellow: (...a: unknown[]) => evaluateFellow(...a),
  getFellowSources: (...a: unknown[]) => getFellowSources(...a),
  recordReportExport: (...a: unknown[]) => recordReportExport(...a),
  emailReport: (...a: unknown[]) => emailReport(...a),
  generateReportDocument: (...a: unknown[]) => generateReportDocument(...a),
  saveEvaluation: (...a: unknown[]) => saveEvaluation(...a),
  listEvaluations: (...a: unknown[]) => listEvaluations(...a),
  getEvaluation: (...a: unknown[]) => getEvaluation(...a),
  deleteEvaluation: (...a: unknown[]) => deleteEvaluation(...a),
}))

const sendHonorEvaluation = jest.fn()
jest.mock("@/services/honor/honorChat", () => ({
  sendHonorEvaluation: (...a: unknown[]) => sendHonorEvaluation(...a),
}))

// react-markdown is ESM; jest can't transform it. Mock the renderer (same
// pattern as AlexChatPanel.test) — it just needs to surface the text.
jest.mock("@/components/user/chat/AssistantMarkdown", () => {
  return function AssistantMarkdown({ text }: { text: string }) {
    return <div data-testid="assistant-markdown">{text}</div>
  }
})

const initiateUpload = jest.fn()
const uploadToS3 = jest.fn()
const triggerProcessing = jest.fn()
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: (...a: unknown[]) => initiateUpload(...a),
  uploadToS3: (...a: unknown[]) => uploadToS3(...a),
  triggerProcessing: (...a: unknown[]) => triggerProcessing(...a),
}))

const useCaseload = jest.fn()
const useCoachHome = jest.fn()
jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => useCaseload(),
  useCoachHome: () => useCoachHome(),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "S. Carter", email: "coach@honor.org", name: "S. Carter" } }),
}))

// html2canvas/jsPDF can't run under jsdom — mock the PDF renderer.
const renderHonorReportPdf = jest.fn()
jest.mock("@/lib/honor/exportHonorReport", () => ({
  renderHonorReportPdf: (...a: unknown[]) => renderHonorReportPdf(...a),
  formatReportDate: () => "July 19, 2026",
}))

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (...a: unknown[]) => downloadBlob(...a),
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
    confidence: {
      score: 60,
      band: "moderate",
      behavioralBasis: true,
      present: ["prism", "resume"],
      missing: ["other_assessment", "bio"],
      breakdown: [
        { source: "prism", label: "PRISM behavioral profile", weight: 40, present: true, contribution: 40 },
        { source: "other_assessment", label: "Another behavioral assessment", weight: 25, present: false, contribution: 0 },
        { source: "resume", label: "Résumé / CV", weight: 20, present: true, contribution: 20 },
        { source: "bio", label: "Bio / personal narrative", weight: 15, present: false, contribution: 0 },
      ],
      note: "Confidence reflects which sources backed this evaluation.",
    },
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
  useCoachHome.mockReturnValue({ data: { coachName: "S. Carter", coachTitle: "Transition Mentor" } })
  evaluateFellow.mockResolvedValue({ status: true, data: opsEval() })
  getFellowSources.mockResolvedValue({
    status: true,
    data: { fellowId: "f1", managed: false, assessments: [{ framework: "PRISM", scoreCount: 102 }], resume: true, bio: false },
  })
  sendHonorEvaluation.mockResolvedValue({ content: "Marcus is a strong operator.", trace: ["Aura", "Meridian"], sessionId: "s1" })
  initiateUpload.mockResolvedValue({ document_id: "d1", upload_url: "u", upload_fields: {} })
  uploadToS3.mockResolvedValue(undefined)
  triggerProcessing.mockResolvedValue({ id: "d1" })
  renderHonorReportPdf.mockResolvedValue({ fileName: "honor-evaluation-marcus-reyes.pdf", blob: new Blob(["pdf"]) })
  recordReportExport.mockResolvedValue({ status: true, data: { recorded: true } })
  emailReport.mockResolvedValue({ status: true, data: { sent: true, messageId: "m1" } })
  generateReportDocument.mockResolvedValue({
    status: true,
    data: { downloadUrl: "https://s3/honor.docx", filename: "honor-evaluation-marcus-reyes.docx", format: "docx" },
  })
  saveEvaluation.mockResolvedValue({
    status: true,
    data: { id: "ev1", fellowId: "f1", title: "Ops fit", criteria: "", dimensions: ["career"], hasNarrative: true, createdAt: "2026-07-23T00:00:00Z" },
  })
  listEvaluations.mockResolvedValue({ status: true, data: { evaluations: [] } })
  getEvaluation.mockResolvedValue({
    status: true,
    data: {
      id: "ev1", fellowId: "f1", title: "Ops fit", criteria: "ops leadership",
      dimensions: ["career"], hasNarrative: true, createdAt: "2026-07-23T00:00:00Z",
      sourcesUsed: { includeResume: true }, evaluation: opsEval(),
      narrativeMarkdown: "## Suggestions for Improvement\n- Sharpen the summary.",
    },
  })
  deleteEvaluation.mockResolvedValue({ status: true, data: { deleted: true, id: "ev1" } })
})

test("selecting a fellow + Run evaluation renders the cited, ranked deterministic report", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  expect(screen.getByText("Subject")).toBeInTheDocument() // primary marker
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalledTimes(1))
  expect(evaluateFellow).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({
      criteria: undefined,
      dimensions: ["career", "goals", "education"], // `position` is off by default — JD scoring is not built
      memberIds: undefined,
    }),
  )

  // ranked career fit + cited source render
  expect(await screen.findByText("Operations Program Management")).toBeInTheDocument()
  expect(screen.getAllByText("95.6").length).toBeGreaterThan(0)
  expect(screen.getAllByText("PRISM: Coordinating 90").length).toBeGreaterThan(0)
})

test("criteria text flows into the request and a verdict renders", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.change(screen.getByPlaceholderText(/Describe what to evaluate/i), {
    target: { value: "Fit for an operations program-management role" },
  })
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  expect(evaluateFellow).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({ criteria: "Fit for an operations program-management role" }),
  )
  expect(await screen.findByText("supported")).toBeInTheDocument()
})

test("dimension checkboxes compose the evaluate body (unchecking drops a key)", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))

  // Default: career + goals + education (Position is opt-in — JD scoring isn't built).
  fireEvent.click(screen.getByRole("checkbox", { name: /Education/i }))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  const body = evaluateFellow.mock.calls[0][1]
  expect(body.dimensions).toEqual(["career", "goals"])
})

test("Position dimension gates the position-description upload control", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  // OFF by default — JD -> competency-vector scoring is not built, so the
  // control must not be presented as if the JD affects the ranked fit.
  expect(
    screen.queryByRole("button", { name: /attach position description/i }),
  ).not.toBeInTheDocument()
  // Opting in reveals it, together with an explicit not-yet-scored notice.
  fireEvent.click(screen.getByRole("checkbox", { name: /Position/i }))
  expect(screen.getByRole("button", { name: /attach position description/i })).toBeInTheDocument()
  expect(screen.getByText(/automatic JD scoring is not built/i)).toBeInTheDocument()
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

test("comparative narration carries the comparison set — not a solo essay", async () => {
  // Regression for the comparative-narration gap: selecting N fellows ran the
  // scorer over all of them but narrated only the primary — Nova received one
  // <USER_PROFILE> and a prompt that never mentioned the others or the team read,
  // yet that solo essay is what gets saved, exported and seeds the résumé rewrite.
  const withComparative = { ...opsEval(), comparative: {
    subjects: ["f2"], areas: ["operations_program_management", "security_risk_management"],
    per_subject_area_fit: { f2: { operations_program_management: 55, security_risk_management: 80 } },
    pairwise_similarity: { f2: { f2: 100 } },
    team_read: { target_area: "operations_program_management", label: "Operations Program Management", covered: ["prism:behaviorpreferences:coordinating"], gaps: ["prism:workaptitudes:analysing"], redundant: [], complementary: [], best_by_feature: {} },
  } }
  evaluateFellow.mockResolvedValue({ status: true, data: withComparative })

  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByText("Dana Cole"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(sendHonorEvaluation).toHaveBeenCalledTimes(1))
  const [prompt, opts] = sendHonorEvaluation.mock.calls[0] as [string, Record<string, unknown>]

  // The comparison subject must reach the narrator by name...
  expect(prompt).toMatch(/Dana Cole/)
  // ...along with the deterministic comparative figures and the team read.
  expect(prompt).toMatch(/comparison|comparative/i)
  expect(prompt).toMatch(/team read|covered|gaps/i)
  // ...and every compared subject's profile must be injected server-side.
  expect(opts).toMatchObject({ memberIds: ["f1", "f2"] })
})

test("attaching a position description uploads with doc_kind=position for the subject", async () => {
  const { container } = renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("checkbox", { name: /Position/i })) // opt in — off by default
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(["jd"], "pm-role.pdf", { type: "application/pdf" })
  fireEvent.change(input, { target: { files: [file] } })

  await waitFor(() => expect(initiateUpload).toHaveBeenCalledTimes(1))
  expect(initiateUpload).toHaveBeenCalledWith(
    expect.objectContaining({ doc_kind: "position", subject_user_id: "f1", filename: "pm-role.pdf" }),
  )
  expect(triggerProcessing).toHaveBeenCalledWith("d1")
})

test("Run evaluation auto-composes Meridian's formatted narrative, driven by the coach's criteria", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  // The coach's typed criteria must flow into the evaluation prompt.
  fireEvent.change(screen.getByPlaceholderText(/Describe what to evaluate/i), {
    target: { value: "Assess readiness to lead a security operations team" },
  })
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  // Narration fires automatically once the deterministic report returns.
  await waitFor(() => expect(sendHonorEvaluation).toHaveBeenCalledTimes(1))
  const prompt = sendHonorEvaluation.mock.calls[0][0] as string
  expect(prompt).toContain("## Objective Evaluation")
  expect(prompt).toContain("Assess readiness to lead a security operations team") // criteria threaded in
  expect(prompt).toMatch(/NOT a file|inline/i) // instructs inline prose, not a download
  expect(sendHonorEvaluation).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ memberId: "f1" }))

  // The formatted narrative renders as the primary evaluation card.
  expect(await screen.findByText("Marcus is a strong operator.")).toBeInTheDocument()
  // The single action relabels to "Re-run evaluation" (no separate Regenerate button).
  expect(screen.getByRole("button", { name: /re-run evaluation/i })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /regenerate/i })).not.toBeInTheDocument()
})

test("Export as… → Word calls the multi-format generator and opens the download", async () => {
  const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  fireEvent.click(screen.getByRole("button", { name: /export as/i }))
  fireEvent.click(screen.getByRole("menuitem", { name: /word/i }))

  await waitFor(() => expect(generateReportDocument).toHaveBeenCalledTimes(1))
  expect(generateReportDocument).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({ format: "docx", kind: "evaluation" }),
  )
  await waitFor(() =>
    expect(openSpy).toHaveBeenCalledWith("https://s3/honor.docx", "_blank", "noopener"),
  )
  openSpy.mockRestore()
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
  expect(await screen.findByText(/composed from the fellow/i)).toBeInTheDocument()
})

test("Download PDF renders the branded report (fellow + coach identity) and logs the export", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  fireEvent.click(screen.getByRole("button", { name: /download pdf/i }))

  await waitFor(() => expect(renderHonorReportPdf).toHaveBeenCalledTimes(1))
  // the report backbone + a meta carrying both identities is handed to the renderer
  expect(renderHonorReportPdf).toHaveBeenCalledWith(
    expect.objectContaining({ subject_id: "f1" }),
    expect.objectContaining({ fellowName: "Marcus Reyes", coachName: "S. Carter", coachEmail: "coach@honor.org" }),
    expect.any(Object),
  )
  await waitFor(() =>
    expect(downloadBlob).toHaveBeenCalledWith("honor-evaluation-marcus-reyes.pdf", expect.any(Blob)),
  )
  // export is audited (fire-and-forget) as a download
  await waitFor(() =>
    expect(recordReportExport).toHaveBeenCalledWith("f1", { kind: "evaluation", action: "download" }),
  )
})

test("email delivery ships dark — the Email button is hidden while the flag is off", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  // Download + Print are always live…
  expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument()
  // …Email is gated behind USE_HONOR_REPORT_EMAIL (off) and must not render.
  expect(screen.queryByRole("button", { name: /email to fellow/i })).not.toBeInTheDocument()
  expect(emailReport).not.toHaveBeenCalled()
})

test("Evaluate: source selection panel + confidence meter render the degradation", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))

  // Per-fellow submitted sources become selectable evidence.
  expect(await screen.findByText(/Evidence for Marcus Reyes/i)).toBeInTheDocument()
  await screen.findByText("PRISM")

  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  // Confidence meter shows the score + band and the per-source degradation.
  expect(screen.getByText(/Evaluation confidence/i)).toBeInTheDocument()
  expect(screen.getByText(/60% · moderate/i)).toBeInTheDocument()
  expect(screen.getByText(/Another behavioral assessment/i)).toBeInTheDocument() // a missing source is listed
})

test("Evaluate: unchecking PRISM sends the narrowed source selection", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  await screen.findByText("PRISM")

  // Uncheck the PRISM evidence chip, then run.
  fireEvent.click(screen.getByRole("checkbox", { name: /PRISM/i }))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))

  await waitFor(() => expect(evaluateFellow).toHaveBeenCalled())
  const body = evaluateFellow.mock.calls[0][1]
  expect(body.sources).toBeDefined()
  expect(body.sources.assessmentFrameworks).not.toContain("PRISM")
  expect(body.sources.includeResume).toBe(true)
})

// ── Feature 1: persist + Save + history ──────────────────────────────────────

test("Save evaluation persists the backbone + narrative and flips to Saved", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")
  // narrative must have landed so it's saved too
  await screen.findByText("Marcus is a strong operator.")

  fireEvent.click(screen.getByRole("button", { name: /save evaluation/i }))

  await waitFor(() => expect(saveEvaluation).toHaveBeenCalledTimes(1))
  expect(saveEvaluation).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({
      evaluation: expect.objectContaining({ subject_id: "f1" }),
      narrativeMarkdown: "Marcus is a strong operator.",
      dimensions: ["career", "goals", "education"], // `position` is off by default — JD scoring is not built
      sourcesUsed: expect.objectContaining({ includeResume: true }),
    }),
  )
  // button relabels to "Saved" and disables (no duplicate save)
  expect(await screen.findByRole("button", { name: /^saved$/i })).toBeDisabled()
})

test("Saved evaluations history lists past runs and loads one back into the view", async () => {
  listEvaluations.mockResolvedValue({
    status: true,
    data: {
      evaluations: [
        { id: "ev1", fellowId: "f1", title: "Ops fit — July 19, 2026", criteria: "ops", dimensions: ["career"], hasNarrative: true, createdAt: "2026-07-19T00:00:00Z" },
      ],
    },
  })
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))

  // Open the history panel (count reflects the fetched list).
  fireEvent.click(await screen.findByRole("button", { name: /saved evaluations \(1\)/i }))
  expect(await screen.findByText("Ops fit — July 19, 2026")).toBeInTheDocument()

  // Load the saved run — the backbone + narrative reload into the report.
  fireEvent.click(screen.getByRole("button", { name: /load/i }))
  await waitFor(() => expect(getEvaluation).toHaveBeenCalledWith("f1", "ev1"))
  expect(await screen.findByText("Operations Program Management")).toBeInTheDocument()
  expect(screen.getByText("Sharpen the summary.", { exact: false })).toBeInTheDocument()
})

test("Rewrite résumé from this navigates to the Résumé Writer with the eval context", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  // wait for the narrative so the rewrite button enables
  await screen.findByText("Marcus is a strong operator.")

  // Save first so a real evaluationId rides along.
  fireEvent.click(screen.getByRole("button", { name: /save evaluation/i }))
  await waitFor(() => expect(saveEvaluation).toHaveBeenCalled())

  fireEvent.click(screen.getByRole("button", { name: /rewrite résumé from this/i }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  const [path, opts] = mockNavigate.mock.calls[0]
  expect(path).toBe("/vertical/honor/resume")
  expect(opts.state).toEqual(
    expect.objectContaining({ fellowId: "f1", evaluationId: "ev1" }),
  )
})

test("Rewrite résumé without saving passes the narrative as improvements", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Marcus is a strong operator.")

  // No save → the narrative prose is handed off directly.
  fireEvent.click(screen.getByRole("button", { name: /rewrite résumé from this/i }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  const opts = mockNavigate.mock.calls[0][1]
  expect(opts.state.evaluationId).toBeUndefined()
  expect(opts.state.improvements).toContain("Marcus is a strong operator.")
})

// ── Feature 3: export polish (txt + share a link) ────────────────────────────

test("export menu includes Plain text (.txt)", async () => {
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  fireEvent.click(screen.getByRole("button", { name: /export as/i }))
  expect(screen.getByRole("menuitem", { name: /plain text|\.txt|text \(\.txt\)/i })).toBeInTheDocument()
})

test("Copy link generates a PDF and copies the presigned URL", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(screen.getByRole("button", { name: /run evaluation/i }))
  await screen.findByText("Operations Program Management")

  fireEvent.click(screen.getByRole("button", { name: /copy link/i }))
  await waitFor(() => expect(generateReportDocument).toHaveBeenCalled())
  expect(generateReportDocument).toHaveBeenCalledWith(
    "f1",
    expect.objectContaining({ kind: "evaluation", format: "pdf" }),
  )
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://s3/honor.docx"))
  // @ts-expect-error cleanup
  delete navigator.clipboard
})

test("Deleting a saved evaluation calls the delete endpoint", async () => {
  listEvaluations.mockResolvedValue({
    status: true,
    data: {
      evaluations: [
        { id: "ev1", fellowId: "f1", title: "Ops fit", criteria: "", dimensions: [], hasNarrative: false, createdAt: "2026-07-19T00:00:00Z" },
      ],
    },
  })
  renderPage()
  fireEvent.click(screen.getByText("Marcus Reyes"))
  fireEvent.click(await screen.findByRole("button", { name: /saved evaluations \(1\)/i }))
  await screen.findByText("Ops fit")

  fireEvent.click(screen.getByRole("button", { name: /delete saved evaluation/i }))
  await waitFor(() => expect(deleteEvaluation).toHaveBeenCalledWith("f1", "ev1"))
})
