/**
 * @jest-environment jsdom
 */
import {
  practiceService,
  buildCoachMessage,
  buildInterviewPlan,
  buildFindingsMessage,
  frameQuestionCount,
  practiceJobContext,
  PRACTICE_JOB_CONTEXT,
  type InterviewFrame,
  type PracticeQuestions,
} from "../practice.service"

const FRAME: InterviewFrame = {
  company: "Acme Corp",
  industry: "Fintech",
  roleTitle: "VP Engineering",
  reportingLine: "CTO",
  scope: "40 engineers, $8M budget",
  candidateType: "external",
  weightedFocus: "turnaround experience",
  numQuestions: 3,
  lengthMinutes: 10,
}

function mkBank(): PracticeQuestions {
  const sec = (key: "vision" | "behavioral" | "productivity", title: string) => ({
    key, section: key[0].toUpperCase(), title,
    competencies: Array.from({ length: 4 }, (_, i) => ({
      id: `${key}.c${i}`, competency: `${title} ${i}`,
      question: `${title} question ${i}?`, starProbes: ["probe"],
    })),
  })
  return {
    guidance: "STAR",
    sections: [sec("vision", "Vision"), sec("behavioral", "Behavioral"), sec("productivity", "Productivity")],
  }
}

const mockAxios = { get: jest.fn() }

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...args: unknown[]) => mockAxios.get(...args) },
}))

const practice = {
  guidance: "STAR arc",
  sections: [
    {
      key: "behavioral",
      section: "B",
      title: "Behavioral & Cultural Alignment",
      competencies: [
        {
          id: "behavioral.conflict_resolution",
          competency: "Conflict Resolution",
          question: "Tell me about a disagreement…",
          starProbes: ["What was your role?"],
        },
      ],
    },
  ],
  totalCompetencies: 1,
}

describe("practiceService.getPracticeQuestions", () => {
  beforeEach(() => jest.clearAllMocks())

  it("GETs the candidate-safe practice endpoint", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: practice })
    const result = await practiceService.getPracticeQuestions()
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents/interview/practice-questions",
      { params: { section: undefined } },
    )
    expect(result).toEqual(practice)
  })

  it("passes a section filter through", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: practice })
    await practiceService.getPracticeQuestions({ section: "behavioral" })
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents/interview/practice-questions",
      { params: { section: "behavioral" } },
    )
  })

  it("candidate payload carries NO scores or exemplars", () => {
    // The service type has no rubric/exemplars, and the endpoint strips them.
    const comp = practice.sections[0].competencies[0] as Record<string, unknown>
    expect(comp).not.toHaveProperty("exemplars")
    expect(practice).not.toHaveProperty("rubric")
  })
})

describe("buildCoachMessage / job context", () => {
  it("frames the answer for the interview-practice route (Alex coach)", () => {
    const msg = buildCoachMessage("Tell me about a conflict", "I did X and Y")
    expect(msg.toLowerCase()).toContain("interview practice")
    expect(msg).toContain("Tell me about a conflict")
    expect(msg).toContain("I did X and Y")
  })

  it("job context requests Alex interview-coach mode", () => {
    expect(PRACTICE_JOB_CONTEXT).toEqual({ alex_mode: "interview_coach" })
  })
})

describe("interview frame in coaching", () => {
  it("buildCoachMessage embeds the frame (role, scope, weighting, count/length)", () => {
    const msg = buildCoachMessage("Tell me about a turnaround", "I did X", FRAME)
    expect(msg).toContain("Acme Corp")
    expect(msg).toContain("VP Engineering")
    expect(msg).toContain("CTO")
    expect(msg).toContain("40 engineers")
    expect(msg).toContain("turnaround experience")
    expect(msg).toContain("external candidate")
    // The requested count + length are honored in the frame summary.
    expect(msg).toContain("10 minutes across 3 questions")
  })

  it("buildCoachMessage omits the frame block when none is set", () => {
    const msg = buildCoachMessage("Q", "A")
    expect(msg).not.toContain("Interview frame")
  })

  it("practiceJobContext carries the frame + coach mode", () => {
    expect(practiceJobContext(FRAME)).toEqual({ alex_mode: "interview_coach", interview_frame: FRAME })
    expect(practiceJobContext()).toEqual({ alex_mode: "interview_coach" })
  })
})

describe("bounded interview plan", () => {
  const bank = mkBank()

  it("frameQuestionCount honors the request, defaults to 12, caps at 12", () => {
    expect(frameQuestionCount({ ...FRAME, numQuestions: 3 })).toBe(3)
    expect(frameQuestionCount({ ...FRAME, numQuestions: undefined })).toBe(12)
    expect(frameQuestionCount({ ...FRAME, numQuestions: 99 })).toBe(12)
    expect(frameQuestionCount({ ...FRAME, numQuestions: 0 })).toBe(12)
  })

  it("builds exactly N questions, evenly across sections, numbered in order", () => {
    const plan = buildInterviewPlan(bank, { ...FRAME, numQuestions: 3 })
    expect(plan).toHaveLength(3)
    expect(plan.map((p) => p.sectionKey)).toEqual(["vision", "behavioral", "productivity"])
    expect(plan.map((p) => p.number)).toEqual([1, 2, 3])
  })

  it("distributes a full 12-question interview 4/4/4", () => {
    const plan = buildInterviewPlan(bank, { ...FRAME, numQuestions: 12 })
    expect(plan).toHaveLength(12)
    const counts = { vision: 0, behavioral: 0, productivity: 0 } as Record<string, number>
    plan.forEach((p) => { counts[p.sectionKey]++ })
    expect(counts).toEqual({ vision: 4, behavioral: 4, productivity: 4 })
  })

  it("never repeats a question (bounded, no loop)", () => {
    const plan = buildInterviewPlan(bank, { ...FRAME, numQuestions: 12 })
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length)
  })
})

describe("findings message", () => {
  it("asks for a developmental, scoreless read-out with the transcript", () => {
    const msg = buildFindingsMessage(FRAME, [
      { number: 1, sectionTitle: "Vision", competency: "Strategic Vision", question: "Q1?", answer: "A1" },
    ])
    expect(msg.toLowerCase()).toContain("findings")
    expect(msg).toContain("Key Strengths")
    expect(msg).toContain("Areas to Improve")
    expect(msg.toLowerCase()).toContain("do not give a numeric score")
    // Coverage caveat when fewer answered than planned (3).
    expect(msg).toContain("1 of 3")
    expect(msg).toContain("A1")
  })
})
