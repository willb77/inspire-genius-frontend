import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PrismAccuracyScorer from "../PrismAccuracyScorer"
import type { Rubric, ScoreResult, SessionScoreResult, SubjectSummary } from "@/types/prism-accuracy"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

const toastError = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: jest.fn() } }))

const mutate = jest.fn()
const sessionMutate = jest.fn()
let scoreData: ScoreResult | undefined
let sessionData: SessionScoreResult | undefined
let subjectData: SubjectSummary | undefined
let rubricData: Rubric | undefined

jest.mock("@/hooks/super-admin/usePrismAccuracy", () => ({
  usePrismAccuracyRubric: () => ({ data: rubricData, isLoading: false }),
  usePrismSubjects: () => ({ data: [{ user_id: "u-1", assessments: 1, scores: 88, latest: null }], isLoading: false }),
  usePrismSubject: (id?: string) => ({ data: id ? subjectData : undefined, isLoading: false, isError: false }),
  useScoreResponse: () => ({ mutate, isPending: false, data: scoreData }),
  useScoreSession: () => ({ mutate: sessionMutate, isPending: false, data: sessionData }),
}))

jest.mock("@/hooks/super-admin/explainability/useExplainability", () => ({
  useConversations: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useConversation: () => ({ data: undefined, isLoading: false }),
}))

const SUBJECT: SubjectSummary = {
  user_id: "u-1",
  coverage: 13,
  scales_on_file: 13,
  conflicted: false,
  colours: { Green: 70, Blue: 32.5, Red: 57.5, Gold: 31 },
  salient: [{ key: "drive", label: "Drive", group: "Work Preference Profile", value: 90, band: "Very high" }],
}

const RESULT: ScoreResult = {
  report: {
    scorable: true,
    reason: "",
    pas: 93.9,
    grade: "A",
    caps_applied: [],
    metrics: {
      n_claims: 2, n_verifiable: 2, n_correct: 2, n_partial: 0, n_incorrect: 0, n_unsupported: 0, n_unverifiable: 0,
      claim_precision: 1, direction_accuracy: 1, fabrication_rate: 0, numeric_mae: null, salience_recall: 0.5,
      salient_scales: ["drive", "finishing"], salient_labels: ["Drive", "Finishing"], salient_engaged: ["finishing"],
      canon_violations: [], interpretive_fidelity: null,
    },
    verdicts: [
      {
        claim: { quote: "Innovating is high", target: "innovating", kind: "scale", claimed_band: "High", claimed_value: null, rank: null, ambiguous_keys: [], source: "lexical" },
        actual_value: 72, actual_band: "High", verdict: "correct", band_distance: 0, numeric_error: null, inverted: false,
        note: "claimed High, on file High", resolved_target: null, label: "Innovating", group: "Behavior Preferences",
      },
    ],
    mentions: [],
    profile_coverage: 13,
    profile_conflicted: false,
    extraction: "lexical",
  },
  subject: SUBJECT,
  llm: { used: false, reason: "no provider — lexical only" },
}

beforeEach(() => {
  mutate.mockClear()
  sessionMutate.mockClear()
  toastError.mockClear()
  scoreData = undefined
  sessionData = undefined
  subjectData = SUBJECT
  rubricData = {
    name: "PRISM Accuracy Scorer", version: "1.0", purpose: "Measures fidelity.",
    criteria: [{ key: "claim_precision", name: "Claim precision", weight: 0.35, measures: "m", scoring: "s", target: "≥ 0.90" }],
    bands: [
      { scheme: "guide", low: 65, high: 74, label: "High", meaning: "a strong preference" },
      { scheme: "rubric", low: 0, high: 19, label: "Very low", meaning: "absent" },
    ],
    band_schemes: { guide: "PRISM intensity scale", rubric: "IG six-band rubric" },
    opposites: [{ a: "Finishing", b: "Innovating" }],
    grades: [{ min: 90, grade: "A" }],
    caps: [{ key: "canon_violation", cap: 59, rule: "Any canon violation caps at 59." }],
    not_scorable: ["No claims."],
    usage: ["Read the claim table first."],
    metrics: { pas: "weighted composite" },
  }
})

describe("PrismAccuracyScorer", () => {
  it("renders inside the super-admin layout with the menu title", () => {
    render(<PrismAccuracyScorer />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /PRISM Accuracy Scorer/i })).toBeInTheDocument()
  })

  it("will not score until a subject and a response are given, then sends both", async () => {
    render(<PrismAccuracyScorer />)
    const button = screen.getByRole("button", { name: /^Score$/ })
    expect(button).toBeDisabled()
    expect(screen.getByTestId("waiting-for")).toHaveTextContent("Choose the person first (step 1).")
    await userEvent.type(screen.getByLabelText(/Subject user id/i), "u-1")
    expect(screen.getByTestId("waiting-for")).toHaveTextContent("Paste the response to score (step 2).")
    await userEvent.type(screen.getByLabelText(/^IG response$/i), "Innovating is high.")
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({
      subject_user_id: "u-1", response_text: "Innovating is high.", prompt_text: undefined, use_llm: true,
    })
  })

  it("shows the subject's profile summary once a user is chosen", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.type(screen.getByLabelText(/Subject user id/i), "u-1")
    expect(await screen.findByTestId("subject-card")).toHaveTextContent("13 / 88")
    expect(screen.getByText(/Green 70/)).toBeInTheDocument()
  })

  it("renders the score, the metrics and the claim table from a result", () => {
    scoreData = RESULT
    render(<PrismAccuracyScorer />)
    expect(screen.getByTestId("pas")).toHaveTextContent("93.9")
    expect(screen.getByTestId("pas")).toHaveTextContent("A")
    expect(screen.getByText(/No caps applied/)).toBeInTheDocument()
    expect(screen.getByTestId("plain-verdict")).toHaveTextContent("2 of 2 checkable claims matched the person's PRISM file.")
    expect(screen.getByText("Claim precision")).toBeInTheDocument()
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("correct")).toBeInTheDocument()
    expect(screen.getByText(/lexical only/)).toBeInTheDocument()
  })

  it("explains a not-scorable result instead of showing a number", () => {
    scoreData = { ...RESULT, report: { ...RESULT.report, scorable: false, pas: null, grade: null, reason: "Profile is conflicted." } }
    render(<PrismAccuracyScorer />)
    expect(screen.queryByTestId("pas")).not.toBeInTheDocument()
    expect(screen.getByText("Not scorable")).toBeInTheDocument()
    expect(screen.getByText("Profile is conflicted.")).toBeInTheDocument()
  })

  it("says in words when a claim is inverted and what it costs", () => {
    scoreData = {
      ...RESULT,
      report: {
        ...RESULT.report,
        pas: 69, grade: "D", caps_applied: ["inversion"],
        metrics: { ...RESULT.report.metrics, n_correct: 10, n_verifiable: 11, n_incorrect: 1, direction_accuracy: 0.909 },
        verdicts: [{ ...RESULT.report.verdicts[0], label: "Supporting", verdict: "incorrect", inverted: true }],
      },
    }
    render(<PrismAccuracyScorer />)
    expect(screen.getByTestId("plain-verdict")).toHaveTextContent(
      "One claim put the person on the wrong side of a scale (Supporting), which caps the score at 69",
    )
  })

  it("session view explains the aggregate in words and opens a turn's claims on click", async () => {
    sessionData = {
      session_id: "s-1",
      subject: SUBJECT,
      aggregate: {
        n_turns: 1, n_scored: 1, n_ungrounded: 0, n_unscorable_other: 0, mean_pas: 69, median_pas: 69, min_pas: 69,
        pass_rate: 0, grades: { A: 0, B: 0, C: 0, D: 1, F: 0 }, total_claims: 11, total_inverted: 1, total_unsupported: 0, total_canon_violations: 0,
      },
      turns: [{
        turn_id: "t-9", agent_name: "Aura", created_at: "2026-09-01T00:00:00Z", scorable: true, reason: "", pas: 69, grade: "D",
        caps_applied: ["inversion"], n_claims: 11, n_inverted: 1, n_unsupported: 0, canon_violations: [], preview: "Great question",
      }],
    }
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Score a session/i }))
    expect(await screen.findByTestId("session-summary")).toHaveTextContent("1 of 1 IG turn made PRISM claims")
    expect(screen.getByTestId("session-summary")).toHaveTextContent("1 inverted claim")
    expect(screen.getByText(/1 claim put the person on the wrong side of a scale \(caps at 69\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Open claims for turn t-9/ }))
    expect(mutate).toHaveBeenCalledWith({ turn_id: "t-9", use_llm: false }, expect.anything())
  })

  it("lists caps and canon violations when they apply", () => {
    scoreData = {
      ...RESULT,
      report: { ...RESULT.report, pas: 59, grade: "F", caps_applied: ["canon_violation"], metrics: { ...RESULT.report.metrics, canon_violations: ["Gold paired with Innovating"] } },
    }
    render(<PrismAccuracyScorer />)
    expect(screen.getByText(/cap: canon violation/)).toBeInTheDocument()
    expect(screen.getByText(/Gold paired with Innovating/)).toBeInTheDocument()
  })

  it("shows the rubric fetched from the engine", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Rubric/i }))
    expect(await screen.findByText("Claim precision")).toBeInTheDocument()
    expect(screen.getByText("35%")).toBeInTheDocument()
    expect(screen.getByText("Read the claim table first.")).toBeInTheDocument()
    expect(screen.getByText(/Any canon violation caps at 59/)).toBeInTheDocument()
    expect(screen.getByText(/PRISM guide — behaviours and colours/)).toBeInTheDocument()
    expect(screen.getByText(/High \(65–74\)/)).toBeInTheDocument()
    expect(screen.getByText(/Finishing ↔ Innovating/)).toBeInTheDocument()
  })

  it("scores a session by id", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Score a session/i }))
    const button = await screen.findByRole("button", { name: /Score session/i })
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Session id/i), "s-1")
    await userEvent.click(button)
    await waitFor(() => expect(sessionMutate).toHaveBeenCalledTimes(1))
    expect(sessionMutate.mock.calls[0][0]).toEqual({ session_id: "s-1", use_llm: false, limit: 25 })
  })
})
