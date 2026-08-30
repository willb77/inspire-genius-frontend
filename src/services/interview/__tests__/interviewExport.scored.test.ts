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
      capped: false,
      final_score: 4,
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
      capped: true,
      final_score: 3,
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
    expect(md).toContain("## Recommendation")
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
    expect(md).toContain("**Final score:** 3 / 5 (capped)")

    // Rubric summary table
    expect(md).toContain("## Rubric Summary")
    expect(md).toContain("| Vision & Strategic Alignment | 4.00 / 5 | 1 |")
    expect(md).toContain("| Behavioral | 3.00 / 5 | 1 |")

    // STAR evidence present-flags
    expect(md).toContain("Situation: Present")
    expect(md).toContain("Result: Not observed")
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
