import { answersToCsv, answersToMarkdown, pct, pointsOf, runTitle, scoreOf, shortSha, when } from "../export"
import { validateQuestionSet } from "../validateQuestionSet"
import type { ExamAnswer, ExamRunDetail } from "@/types/prism-exam"

const RUN: ExamRunDetail = {
  id: "11111111-2222-3333-4444-555555555555",
  tier: "dev",
  label: "after canon",
  question_set_id: "qs-1",
  question_set_version: 1,
  status: "complete",
  started_by: "sa",
  exam_user_id: "exam",
  concurrency: 2,
  engine_sha: "sha-6b985910abcdef",
  judge_model: "claude-sonnet-5",
  total: 3,
  done: 3,
  score: 0.8333,
  by_chapter: {
    welcome: { title: "Welcome to PRISM", n: 2, correct: 2, partial: 0, wrong: 0, score: 1 },
    brain: { title: "The Human Brain", n: 1, correct: 0, partial: 1, wrong: 0, score: 0.5 },
  },
  agents: { by_agent: { Aura: 2, Summit: 1 }, aura_consults: 1 },
  error: null,
  created_at: "2026-09-03T18:00:00Z",
  started_at: "2026-09-03T18:00:05Z",
  heartbeat_at: null,
  completed_at: "2026-09-03T18:11:00Z",
  pass_mark: 0.8,
  passed: true,
}

function answer(over: Partial<ExamAnswer>): ExamAnswer {
  return {
    id: "a-1",
    run_id: RUN.id,
    question_id: "W01",
    chapter: "welcome",
    page: 5,
    question: "What are the three maps?",
    expected: "Underlying, Adapted, Consistent",
    answer: "Underlying, Adapted and Consistent maps.",
    agent: "Aura",
    contributing_agents: ["Aura"],
    rag_sources: null,
    verdict: "correct",
    missing: null,
    reason: null,
    elapsed_s: 12.4,
    session_id: "exam-abc-W01",
    error: null,
    created_at: "2026-09-03T18:01:00Z",
    ...over,
  }
}

const ANSWERS: ExamAnswer[] = [
  answer({}),
  answer({ id: "a-2", question_id: "W02", question: 'A "quoted", tricky one', verdict: "correct" }),
  answer({
    id: "a-3",
    question_id: "B01",
    chapter: "brain",
    page: 12,
    question: "Role of the cerebellum | pipes",
    agent: "Summit",
    contributing_agents: ["Summit", "Aura"],
    verdict: "partial",
    missing: ["learning and memory"],
    reason: "Omits the cerebellum's role in learning and memory.",
    answer: "Balance and coordination.\nAlso music.",
  }),
]

describe("prism-exam export helpers", () => {
  it("formats percentages, scores, shas and titles", () => {
    expect(pct(0.9671)).toBe("96.7%")
    expect(pct(0.8, 0)).toBe("80%")
    expect(pct(null)).toBe("—")
    expect(scoreOf("correct")).toBe(1)
    expect(scoreOf("partial")).toBe(0.5)
    expect(scoreOf("wrong")).toBe(0)
    expect(scoreOf(null)).toBe(0)
    expect(shortSha("sha-6b985910abcdef")).toBe("6b985910")
    expect(shortSha(null)).toBe("—")
    expect(runTitle(RUN)).toBe("after canon")
    expect(runTitle({ ...RUN, label: null })).toMatch(/^Run .* · 11111111$/)
    expect(when(null)).toBe("—")
    expect(when("not-a-date")).toBe("not-a-date")
    expect(when("2026-09-03T18:00:00Z")).not.toBe("—")
    expect(pointsOf(ANSWERS)).toBe(2.5)
  })

  it("writes a CSV with one row per answer and quotes commas and quotes", () => {
    const csv = answersToCsv(RUN, ANSWERS)
    const lines = csv.trim().split("\r\n")
    expect(lines).toHaveLength(4)
    expect(lines[0].split(",")).toEqual(expect.arrayContaining(["question_id", "verdict", "score", "answer"]))
    expect(lines[2]).toContain('"A ""quoted"", tricky one"')
    expect(lines[3]).toContain("Summit|Aura")
    expect(lines[3]).toContain(",partial,0.5,")
    expect(lines[3]).toContain('"Balance and coordination.\nAlso music."')
  })

  it("writes the CLI-style markdown scorecard with misses first", () => {
    const md = answersToMarkdown(RUN, ANSWERS)
    expect(md).toContain("# PRISM practitioner exam — after canon — dev")
    expect(md).toContain("**Score: 83.3%** (2.5 / 3 points) · pass mark 80% · PASS")
    expect(md).toContain("| Welcome to PRISM | 2 | 2 | 0 | 0 | 100% |")
    expect(md).toContain("Answered by: Aura 2, Summit 1. Aura consulted by another agent on 1 answer(s).")
    expect(md).toContain("## Misses (1)")
    expect(md).toContain("### B01 · brain · p.12 · **partial**")
    expect(md).toContain("**Missing.** learning and memory")
    expect(md).toContain("| B01 | brain | partial | Summit | Aura | Role of the cerebellum \\| pipes |")
  })

  it("says so when a run has no misses and is not finalised", () => {
    const md = answersToMarkdown({ ...RUN, score: null, passed: false, by_chapter: null, agents: null }, [ANSWERS[0]])
    expect(md).toContain("**Score: —**")
    expect(md).toContain("not finalised")
    expect(md).toContain("## Misses (0)\n\nNone.")
    expect(md).not.toContain("## By chapter")
  })
})

describe("validateQuestionSet", () => {
  const good = {
    name: "Set",
    pass_mark: 0.8,
    chapters: { welcome: "Welcome" },
    questions: [{ id: "W01", chapter: "welcome", page: 5, q: "What are the maps?", expected: "Three maps" }],
  }

  it("accepts a well-formed set and defaults the pass mark", () => {
    const r = validateQuestionSet(JSON.stringify({ ...good, pass_mark: undefined }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.pass_mark).toBe(0.8)
      expect(r.value.questions[0]).toEqual(good.questions[0])
    }
  })

  it.each([
    ["{not json", "Not valid JSON."],
    ["[]", "Expected a JSON object."],
    [JSON.stringify({ ...good, name: " " }), "name is required."],
    [JSON.stringify({ ...good, pass_mark: 1.5 }), "pass_mark must be between 0 and 1."],
    [JSON.stringify({ ...good, chapters: {} }), "chapters must be an object of key → title."],
    [JSON.stringify({ ...good, questions: [] }), "questions must be a non-empty array."],
    [JSON.stringify({ ...good, questions: [good.questions[0], good.questions[0]] }), "duplicate question id W01."],
    [JSON.stringify({ ...good, questions: [{ ...good.questions[0], chapter: "nope" }] }), "question W01 references a chapter not in the set."],
    [JSON.stringify({ ...good, questions: [{ ...good.questions[0], q: "hi" }] }), "question W01 needs a q of at least 5 characters."],
    [JSON.stringify({ ...good, questions: [{ ...good.questions[0], expected: "" }] }), "question W01 needs an expected answer."],
    [JSON.stringify({ ...good, questions: [{ ...good.questions[0], id: "" }] }), "question 1 needs an id."],
    [JSON.stringify({ ...good, questions: [7] }), "question 1 is not an object."],
  ])("rejects %s", (raw, error) => {
    expect(validateQuestionSet(raw)).toEqual({ ok: false, error })
  })
})
