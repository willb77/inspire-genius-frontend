/**
 * @jest-environment jsdom
 */
import {
  practiceService,
  buildCoachMessage,
  practiceJobContext,
  PRACTICE_JOB_CONTEXT,
  DEFAULT_LENGTH_PREF,
  type InterviewFrame,
} from "../practice.service"

const FRAME: InterviewFrame = {
  company: "Acme Corp",
  industry: "Fintech",
  roleTitle: "VP Engineering",
  reportingLine: "CTO",
  scope: "40 engineers, $8M budget",
  candidateType: "external",
  weightedFocus: "turnaround experience",
  lengthPref: "",
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
  it("buildCoachMessage embeds the frame (role, scope, weighting, default length)", () => {
    const msg = buildCoachMessage("Tell me about a turnaround", "I did X", FRAME)
    expect(msg).toContain("Acme Corp")
    expect(msg).toContain("VP Engineering")
    expect(msg).toContain("CTO")
    expect(msg).toContain("40 engineers")
    expect(msg).toContain("turnaround experience")
    expect(msg).toContain("external candidate")
    // Blank lengthPref falls back to the default 45–60 / 12-question structure.
    expect(msg).toContain(DEFAULT_LENGTH_PREF)
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
