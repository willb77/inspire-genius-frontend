import { examPdfBlocks, examPdfFileName, exportExamPdf } from "../exportPdf"
import type { ExamAnswer, ExamRunDetail } from "@/types/prism-exam"

const text = jest.fn()
const download = jest.fn()
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), setDrawColor: jest.fn(),
    setFillColor: jest.fn(), rect: jest.fn(), line: jest.fn(), addPage: jest.fn(), setPage: jest.fn(),
    getNumberOfPages: () => 1,
    splitTextToSize: (t: string) => [t],
    text: (...a: unknown[]) => text(...a),
    output: () => new Blob(["pdf"]),
  })),
}))
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => download(...a) }))

const RUN: ExamRunDetail = {
  id: "abcdef12-0000-0000-0000-000000000000", tier: "staging-b", label: "mc check", question_set_id: "qs",
  question_set_version: 2, status: "complete", started_by: "sa", exam_user_id: "exam", concurrency: 1,
  engine_sha: "sha-407e8411aa", judge_model: "claude-sonnet-5", total: 2, done: 2, score: 0.5,
  by_chapter: { one: { title: "Chapter One", n: 2, correct: 1, partial: 0, wrong: 1, score: 0.5 } },
  agents: { by_agent: { Aura: 2 }, aura_consults: 0 }, error: null, created_at: "2026-10-29T13:31:00Z",
  started_at: null, heartbeat_at: null, completed_at: "2026-10-29T13:37:00Z", pass_mark: 0.8, passed: false,
}

function answer(over: Partial<ExamAnswer>): ExamAnswer {
  return {
    id: "a", run_id: RUN.id, question_id: "1", chapter: "one", page: null, question: "Pick: A) Alpha B) Beta",
    expected: "B) Beta", answer: "**B) Beta**\nreasoning", agent: "Aura", contributing_agents: ["Aura"],
    rag_sources: null, verdict: "correct", missing: null, reason: null, elapsed_s: 3, session_id: null,
    error: null, created_at: "2026-10-29T13:32:00Z", ...over,
  }
}

const ANSWERS = [
  answer({}),
  answer({ id: "b", question_id: "2", answer: "An open answer.\nSecond line.", expected: "Open expected", verdict: "wrong", reason: "Off target." }),
]

describe("exam PDF", () => {
  it("prints every answer with what it chose, the expected answer, and the judge on a miss", () => {
    const t = examPdfBlocks(RUN, ANSWERS).map((b) => b.text)
    expect(t).toContain("Score 50.0% (1 / 2 points) · pass mark 80% · FAIL")
    expect(t).toContain("Chapter One: 50% · 1 correct, 0 partial, 1 wrong of 2")
    expect(t).toContain("Answers (2)")
    expect(t).toContain("Selected (Aura): B) Beta")
    expect(t).toContain("Answer (Aura): An open answer.\nSecond line.")
    expect(t).toContain("Expected: Open expected")
    expect(t).toContain("Judge: Off target.")
    expect(t.filter((x) => x.startsWith("Judge:"))).toHaveLength(1)
  })

  it("builds and downloads the file", async () => {
    await exportExamPdf(RUN, ANSWERS)
    expect(download).toHaveBeenCalledWith(examPdfFileName(RUN), expect.any(Blob))
    expect(examPdfFileName(RUN)).toBe("prism-exam-staging-b-abcdef12.pdf")
    expect(text.mock.calls.map((c) => c[0])).toContain("Selected (Aura): B) Beta")
  })
})
