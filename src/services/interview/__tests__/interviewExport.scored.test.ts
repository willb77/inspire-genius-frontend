/**
 * @jest-environment jsdom
 */
import {
  buildScoredInterviewMarkdown,
  downloadScoredInterview,
  saveScoredInterviewToDocuments,
  type ScoredInterviewExport,
} from "../interviewExport"
import type { FinalizeResult } from "../live.service"
import { initiateUpload, uploadToS3 } from "@/services/documents/documentService"
import { exportTurn } from "@/lib/exportTranscript/exportTurn"

jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
}))

jest.mock("@/lib/exportTranscript/exportTurn", () => {
  const actual = jest.requireActual("@/lib/exportTranscript/exportTurn")
  return {
    ...actual,
    exportTurn: jest.fn(),
  }
})

const RESULT: FinalizeResult = {
  session: {
    session_id: "sess-1",
    frame: {
      company: "Acme Corp",
      industry: "Fintech",
      roleTitle: "VP Engineering",
      reportingLine: "CTO",
      scope: "40 engineers",
      numQuestions: 2,
      lengthMinutes: 10,
    },
    candidate: { display_name: "Jordan Lee", external_id: "ATS-4471" },
  },
  answers: [
    {
      answer_id: "ans-1",
      competency_id: "strategic-vision",
      section: "Vision & Strategic Alignment",
      question_text: "Tell me about a time you set direction under ambiguity.",
      captured_answer: "I led a re-platforming effort...",
      suggested_score: 4,
      star_evidence: {
        S: { present: true },
        T: { present: true },
        A: { present: true },
        R: { present: false },
      },
      capped: { applied: false, reason: null },
      final_score: 4,
      final_source: "human",
      interviewer_notes: "Strong situation/task framing.",
    },
    {
      answer_id: "ans-2",
      competency_id: "conflict-resolution",
      section: "Behavioral",
      question_text: "Describe a conflict with a peer.",
      captured_answer: "Two directors disagreed on scope...",
      suggested_score: 3,
      star_evidence: {
        S: { present: true },
        T: { present: false },
        A: { present: true },
        R: { present: true },
      },
      capped: { applied: true, reason: "no_measurable_result" },
      final_score: 3,
      final_source: "human",
      interviewer_notes: "",
    },
  ],
  section_scores: [
    { section: "Vision & Strategic Alignment", score: 4, count: 1 },
    { section: "Behavioral", score: 3, count: 1 },
  ],
  overall_score: 4,
  overall_mean: 3.5,
  recommendation: "Strong Hire",
}

const EXPORT: ScoredInterviewExport = { result: RESULT, userLabel: "Pat Interviewer" }

describe("buildScoredInterviewMarkdown", () => {
  it("renders per-question final scores, the recommendation band, and the Candidate answer label", () => {
    const md = buildScoredInterviewMarkdown(EXPORT)

    expect(md).toContain("Jordan Lee")
    expect(md).toContain("ATS-4471")
    expect(md).toContain("VP Engineering")
    expect(md).toContain("Acme Corp")

    // Recommendation band + overall figures
    expect(md).toContain("## What the evidence shows")
    expect(md).toContain("Strong Hire")
    expect(md).toContain("4 / 5")
    expect(md).toContain("3.50")

    // Evaluator-context label, not the candidate-side "Your answer"
    expect(md).toContain("**Candidate answer:**")
    expect(md).not.toContain("Your answer")

    // Interviewer rating/notes labeling, not "Coaching"
    expect(md).toContain("**Interviewer notes:**")
    expect(md).not.toContain("Coaching")

    // Per-question final scores
    expect(md).toContain("**Final score:** 4 / 5")
    expect(md).toContain("**Final score:** 3 / 5 · counted as 3: no measurable Result was observed (Result cap)")
    // The other side of it, which nothing asserted: an answer that was NOT
    // capped must not be labelled in the transcript. `capped` is an object, so
    // the old truthiness check marked every answer — in the document that gets
    // shared with a candidate or kept as a selection record.
    expect(md).toContain("**Final score:** 4 / 5")
    expect(md).not.toContain("**Final score:** 4 / 5 · counted as")

    // Rubric summary table
    expect(md).toContain("## Rubric Summary")
    expect(md).toContain("| Vision & Strategic Alignment | 4.00 / 5 | 1 |")
    expect(md).toContain("| Behavioral | 3.00 / 5 | 1 |")

    // STAR evidence present-flags
    expect(md).toContain("Situation: Present")
    expect(md).toContain("Result: Not observed")
  })
})

// F-W5-1 — the scorecard leaves the platform. A reader must be able to
// reconcile the printed Final scores with the overall without asking anyone.
describe("buildScoredInterviewMarkdown — the Result cap is explained", () => {
  const CAPPED_4 = {
    ...RESULT.answers[0],
    suggested_score: 2,
    final_score: 4,
    final_source: "human" as const,
    capped: { applied: true, reason: "no_measurable_result" },
  }
  const capped = (over: Partial<FinalizeResult> = {}): ScoredInterviewExport => ({
    result: { ...RESULT, answers: [CAPPED_4], overall_score: 3, overall_mean: 3, ...over },
  })

  it("says what a capped rating counted as, and why, instead of a bare '(capped)'", () => {
    const md = buildScoredInterviewMarkdown(capped())
    expect(md).toContain(
      "**Final score:** 4 / 5 · counted as 3: no measurable Result was observed (Result cap)",
    )
    expect(md).not.toContain("(capped)")
  })

  it("adds one line under the overall naming how many rated answers were capped", () => {
    const md = buildScoredInterviewMarkdown(capped())
    const overall = md.indexOf("Overall score: **3.00 / 5**")
    const note = md.indexOf("1 rated answer was capped at 3 because no measurable Result was observed.")
    expect(overall).toBeGreaterThan(-1)
    expect(note).toBeGreaterThan(overall)
    expect(note).toBeLessThan(md.indexOf("## Rubric Summary"))
  })

  it("pluralises the overall line and counts only RATED capped answers", () => {
    const md = buildScoredInterviewMarkdown(
      capped({
        answers: [
          CAPPED_4,
          { ...CAPPED_4, answer_id: "a2", final_score: 5 },
          // Unrated: never part of the score, so never counted as capped.
          { ...CAPPED_4, answer_id: "a3", final_source: null },
        ],
      }),
    )
    expect(md).toContain("2 rated answers were capped at 3 because no measurable Result was observed.")
    expect(md).toContain("**Final score:** 5 / 5 · counted as 3: no measurable Result was observed (Result cap)")
  })

  it("prints no cap line when nothing was capped", () => {
    const md = buildScoredInterviewMarkdown({
      result: { ...RESULT, answers: [{ ...CAPPED_4, capped: { applied: false, reason: null } }] },
    })
    expect(md).not.toMatch(/capped at 3|counted as/)
  })

  it("prints no cap text for a custom session, which the server scores uncapped", () => {
    const md = buildScoredInterviewMarkdown(
      capped({ session: { ...RESULT.session, frame: { ...RESULT.session.frame!, mode: "custom" } } }),
    )
    expect(md).toContain("**Final score:** 4 / 5")
    expect(md).not.toMatch(/capped at 3|counted as/)
  })

  it("names a generic cap when the server gives another reason", () => {
    const md = buildScoredInterviewMarkdown({
      result: { ...RESULT, answers: [{ ...CAPPED_4, capped: { applied: true, reason: "other" } }] },
    })
    expect(md).toContain("**Final score:** 4 / 5 · counted as 3 (score cap applied)")
  })
})

describe("buildScoredInterviewMarkdown — unrated answers", () => {
  const withUnrated = (): ScoredInterviewExport => ({
    result: {
      ...RESULT,
      answers: [
        RESULT.answers[0],
        // Seeded from the AI suggestion at insert; nobody decided it.
        { ...RESULT.answers[1], final_score: 3, final_source: null, capped: { applied: false, reason: null } },
      ],
    },
  })

  it("prints 'Not decided' rather than a Final score for an unrated answer", () => {
    const md = buildScoredInterviewMarkdown(withUnrated())
    expect(md).toContain("**Final score:** 4 / 5")
    expect(md).toContain("**Final score:** Not decided")
    expect(md).not.toContain("**Final score:** 3 / 5")
    // The AI suggestion stays labelled advisory.
    expect(md).toContain("**AI-suggested score (advisory):** 3 / 5")
  })

  it("counts only rated answers as scored and names the unrated ones", () => {
    const md = buildScoredInterviewMarkdown(withUnrated())
    expect(md).toContain("**Questions scored:** 1 of 2")
    expect(md).toContain("**Not rated:** 1 answer was never rated")
    expect(md).toContain("conflict-resolution")
  })

  it("uses rated_count when the server provides it", () => {
    const e = withUnrated()
    e.result.rated_count = 1
    e.result.answer_count = 2
    expect(buildScoredInterviewMarkdown(e)).toContain("**Questions scored:** 1 of 2")
  })

  it("marks an adopted AI suggestion and omits the Not rated line when all are rated", () => {
    const e: ScoredInterviewExport = {
      result: { ...RESULT, answers: [{ ...RESULT.answers[0], final_source: "model" }] },
    }
    const md = buildScoredInterviewMarkdown(e)
    expect(md).toContain("(AI suggestion adopted)")
    expect(md).not.toContain("Not rated")
  })
})

describe("downloadScoredInterview", () => {
  it("delegates to the shared branded exportTurn engine", async () => {
    await downloadScoredInterview(EXPORT, "word")
    expect(exportTurn).toHaveBeenCalledWith(
      expect.objectContaining({ speaker: "Interview Scorecard" }),
      "word",
    )
  })
})

describe("saveScoredInterviewToDocuments", () => {
  it("uploads under the interview-scorecard doc_kind", async () => {
    ;(initiateUpload as jest.Mock).mockResolvedValueOnce({
      document_id: "doc-123",
      upload_url: "https://s3.example.com/upload",
      upload_fields: { key: "k" },
      s3_key: "k",
      expires_in: 900,
    })
    ;(uploadToS3 as jest.Mock).mockResolvedValueOnce(undefined)

    const id = await saveScoredInterviewToDocuments(EXPORT)

    expect(id).toBe("doc-123")
    expect(initiateUpload).toHaveBeenCalledWith(
      expect.objectContaining({ doc_kind: "interview-scorecard" }),
    )
    expect(uploadToS3).toHaveBeenCalled()
  })
})
