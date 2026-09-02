import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PrismAccuracyScorer from "../PrismAccuracyScorer"
import type {
  ConversationRow,
  Rubric,
  ScoreResult,
  SessionScoreResult,
  SubjectRow,
  SubjectSummary,
} from "@/types/prism-accuracy"

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
let people: SubjectRow[] = []
let conversations: ConversationRow[] = []
const subjectsSearch = jest.fn()
const conversationsParams = jest.fn()

jest.mock("@/hooks/super-admin/usePrismAccuracy", () => ({
  usePrismAccuracyRubric: () => ({ data: rubricData, isLoading: false }),
  usePrismSubjects: (_limit: number, search: string) => {
    subjectsSearch(search)
    const s = (search ?? "").toLowerCase()
    return { data: people.filter((p) => !s || `${p.name} ${p.email}`.toLowerCase().includes(s)), isLoading: false }
  },
  usePrismSubject: (id?: string) => ({ data: id ? subjectData : undefined, isLoading: false, isError: false }),
  usePrismConversations: (params: { user_id?: string; search?: string }) => {
    conversationsParams(params)
    return { data: conversations.filter((c) => !params.user_id || c.user_id === params.user_id), isLoading: false }
  },
  useScoreResponse: () => ({ mutate, isPending: false, data: scoreData }),
  useScoreSession: () => ({ mutate: sessionMutate, isPending: false, data: sessionData }),
}))

const ADA: SubjectRow = { user_id: "u-1", name: "Ada Lovelace", email: "ada@example.com", assessments: 1, scores: 86, latest: null }
const BOB: SubjectRow = { user_id: "u-2", name: null, email: "bob@example.com", assessments: 1, scores: 40, latest: null }

const SUBJECT: SubjectSummary = {
  user_id: "u-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  coverage: 86,
  scales_on_file: 86,
  conflicted: false,
  colours: { Green: 91.5, Blue: 92, Red: 34, Gold: 52 },
  salient: [{ key: "innovating", label: "Innovating", group: "Behavior Preferences", value: 95, band: "Very high" }],
}

const CONV: ConversationRow = {
  session_id: "s-1", user_id: "u-1", name: "Ada Lovelace", email: "ada@example.com",
  first_seen_at: "2026-09-01T10:00:00", last_seen_at: "2026-09-01T10:05:00", ig_turns: 2, message_count: 4,
  agents: ["Aura"], opening_message: "What does my PRISM profile say about leadership?",
}

const RESULT: ScoreResult = {
  report: {
    scorable: true, reason: "", pas: 93.9, grade: "A", caps_applied: [],
    metrics: {
      n_claims: 2, n_verifiable: 2, n_correct: 2, n_partial: 0, n_incorrect: 0, n_unsupported: 0, n_unverifiable: 0,
      claim_precision: 1, direction_accuracy: 1, fabrication_rate: 0, numeric_mae: null, salience_recall: 0.5,
      salient_scales: ["drive", "finishing"], salient_labels: ["Drive", "Finishing"], salient_engaged: ["finishing"],
      canon_violations: [], interpretive_fidelity: null,
    },
    verdicts: [{
      claim: { quote: "Innovating is high", target: "innovating", kind: "scale", claimed_band: "High", claimed_value: null, rank: null, ambiguous_keys: [], source: "lexical" },
      actual_value: 72, actual_band: "High", verdict: "correct", band_distance: 0, numeric_error: null, inverted: false,
      note: "claimed High, on file High (PRISM intensity scale)", resolved_target: null, band_scheme: "guide", label: "Innovating", group: "Behavior Preferences",
    }],
    mentions: [], profile_coverage: 86, profile_conflicted: false, extraction: "lexical",
  },
  subject: SUBJECT,
  llm: { used: false, reason: "no provider — lexical only" },
}

beforeEach(() => {
  mutate.mockClear(); sessionMutate.mockClear(); toastError.mockClear(); subjectsSearch.mockClear(); conversationsParams.mockClear()
  scoreData = undefined; sessionData = undefined; subjectData = SUBJECT
  people = [ADA, BOB]; conversations = [CONV]
  rubricData = {
    name: "PRISM Accuracy Scorer", version: "1.2", purpose: "Measures fidelity.",
    source: { document: "A Definitive guide to PRISM chart for InspiresGenius AI Model.docx", content_sha256: "25b50ffaf82fa5c2", applies_to: "behaviours", not_covered: "the other groups" },
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

describe("PrismAccuracyScorer — people first", () => {
  it("renders inside the super-admin layout with the menu title and opens on Score a conversation", () => {
    render(<PrismAccuracyScorer />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /PRISM Accuracy Scorer/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Score a conversation/i })).toHaveAttribute("data-state", "active")
  })

  it("lists people by name and email, never by id, and searches them", async () => {
    render(<PrismAccuracyScorer />)
    const list = screen.getByTestId("person-list")
    expect(list).toHaveTextContent("Ada Lovelace")
    expect(list).toHaveTextContent("ada@example.com")
    expect(list).toHaveTextContent("bob@example.com")
    expect(list).not.toHaveTextContent("u-1")
    await userEvent.type(screen.getByLabelText(/Find a person by name or email/i), "ada")
    await waitFor(() => expect(subjectsSearch).toHaveBeenLastCalledWith("ada"))
    expect(screen.getByTestId("person-list")).not.toHaveTextContent("bob@example.com")
  })

  it("choosing a person shows their profile card and narrows the conversations", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }))
    expect(await screen.findByTestId("subject-card")).toHaveTextContent("Ada Lovelace")
    expect(screen.getByTestId("subject-card")).toHaveTextContent("86 / 88")
    expect(screen.getByTestId("subject-card")).toHaveTextContent("Green 91.5")
    await waitFor(() => expect(conversationsParams).toHaveBeenLastCalledWith(expect.objectContaining({ user_id: "u-1" })))
  })

  it("conversations show who, when, the agent and the opening message; scoring sends the session id", async () => {
    render(<PrismAccuracyScorer />)
    const list = screen.getByTestId("conversation-list")
    expect(list).toHaveTextContent("Ada Lovelace")
    expect(list).toHaveTextContent("What does my PRISM profile say about leadership?")
    expect(list).toHaveTextContent("Aura · 2 replies from IG")
    expect(list).not.toHaveTextContent("s-1")
    const button = screen.getByRole("button", { name: /Score this conversation/i })
    expect(button).toBeDisabled()
    expect(screen.getByTestId("waiting-for")).toHaveTextContent("Pick a conversation above.")
    await userEvent.click(screen.getByRole("button", { name: /Select conversation s-1/ }))
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(sessionMutate).toHaveBeenCalledWith({ session_id: "s-1", use_llm: false, limit: 25 }, expect.anything())
  })

  it("session results name the person, explain the aggregate, and open a turn's claims on click", async () => {
    sessionData = {
      session_id: "s-1", subject: SUBJECT,
      aggregate: { n_turns: 1, n_scored: 1, n_ungrounded: 0, n_unscorable_other: 0, mean_pas: 69, median_pas: 69, min_pas: 69, pass_rate: 0, grades: { A: 0, B: 0, C: 0, D: 1, F: 0 }, total_claims: 11, total_inverted: 1, total_unsupported: 0, total_canon_violations: 0 },
      turns: [{ turn_id: "t-9", agent_name: "Aura", created_at: "2026-09-01T00:00:00Z", scorable: true, reason: "", pas: 69, grade: "D", caps_applied: ["inversion"], n_claims: 11, n_inverted: 1, n_unsupported: 0, canon_violations: [], preview: "Great question" }],
    }
    render(<PrismAccuracyScorer />)
    expect(screen.getByText(/What this conversation scored — Ada Lovelace/)).toBeInTheDocument()
    expect(screen.getByTestId("session-summary")).toHaveTextContent("1 inverted claim")
    expect(screen.getByText(/1 claim put the person on the wrong side of a scale \(caps at 69\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Open claims for turn t-9/ }))
    expect(mutate).toHaveBeenCalledWith({ turn_id: "t-9", use_llm: false }, expect.anything())
  })

  it("pasted-text flow needs a person and text, then sends both", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Score pasted text/i }))
    const button = await screen.findByRole("button", { name: /^Score$/ })
    expect(button).toBeDisabled()
    expect(screen.getByTestId("waiting-for")).toHaveTextContent("Choose the person first (step 1).")
    await userEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }))
    await userEvent.type(screen.getByLabelText(/IG's text/i), "Innovating is high.")
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(mutate.mock.calls[0][0]).toEqual({ subject_user_id: "u-1", response_text: "Innovating is high.", prompt_text: undefined, use_llm: true })
  })

  it("renders a report with the plain verdict and the claim table", async () => {
    scoreData = RESULT
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Score pasted text/i }))
    expect(await screen.findByTestId("pas")).toHaveTextContent("93.9")
    expect(screen.getByTestId("plain-verdict")).toHaveTextContent("2 of 2 checkable claims matched the person's PRISM file.")
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText(/PRISM intensity scale/)).toBeInTheDocument()
  })

  it("the rubric tab names the source document and both band schemes", async () => {
    render(<PrismAccuracyScorer />)
    await userEvent.click(screen.getByRole("tab", { name: /Rubric/i }))
    expect(await screen.findByTestId("rubric-source")).toHaveTextContent("A Definitive guide to PRISM chart for InspiresGenius AI Model.docx")
    expect(screen.getByText(/PRISM guide — behaviours and colours/)).toBeInTheDocument()
    expect(screen.getByText(/High \(65–74\)/)).toBeInTheDocument()
    expect(screen.getByText(/Finishing ↔ Innovating/)).toBeInTheDocument()
  })
})
