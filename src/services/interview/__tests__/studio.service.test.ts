import { studioInterviewService, generatedSetToQuestions } from "../studio.service"
import type { GeneratedQuestionSet } from "../studio.service"

const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    post: (...args: unknown[]) => post(...args),
  },
}))

const SET: GeneratedQuestionSet = {
  generated: true,
  topic: "student discovery",
  purpose: "career counseling",
  audience: "a student",
  sections: [
    {
      key: "warm_up",
      title: "Warm-up",
      competencies: [
        { id: "warm_up.q1", competency: "Background", question: "Tell me about yourself.", starProbes: ["Since when?"] },
      ],
    },
    {
      key: "goals",
      title: "Goals",
      competencies: [
        { id: "goals.q2", competency: "Goals", question: "Where next?", starProbes: [] },
      ],
    },
  ],
  totalQuestions: 2,
}

describe("studioInterviewService.generateQuestions", () => {
  beforeEach(() => post.mockReset())

  it("POSTs to the generate route and returns the question set", async () => {
    post.mockResolvedValue({ data: SET })
    const out = await studioInterviewService.generateQuestions({
      topic: "student discovery",
      purpose: "career counseling",
      num_questions: 6,
    })
    expect(post).toHaveBeenCalledWith("/v1/agents/interview/live/generate", {
      topic: "student discovery",
      purpose: "career counseling",
      num_questions: 6,
    })
    expect(out.totalQuestions).toBe(2)
    expect(out.generated).toBe(true)
  })
})

describe("generatedSetToQuestions", () => {
  it("flattens themed sections into a studio question list with themes + probes", () => {
    const rows = generatedSetToQuestions(SET)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ text: "Tell me about yourself.", theme: "Warm-up", probes: ["Since when?"] })
    expect(rows[1]).toEqual({ text: "Where next?", theme: "Goals", probes: [] })
  })

  it("returns [] for an empty set", () => {
    expect(generatedSetToQuestions({ ...SET, sections: [], totalQuestions: 0 })).toEqual([])
  })
})
