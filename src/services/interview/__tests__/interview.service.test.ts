/**
 * @jest-environment jsdom
 */
import { interviewService } from "../interview.service"

const mockAxios = {
  get: jest.fn(),
}

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: (...args: unknown[]) => mockAxios.get(...args) },
}))

const bank = {
  rubric: { "5": "deep", "1": "disconnect" },
  guidance: "STAR arc",
  sections: [
    {
      key: "vision",
      section: "A",
      title: "Vision & Strategic Alignment",
      competencies: [
        {
          id: "vision.strategic_vision",
          competency: "Strategic Vision",
          question: "Tell me about a time…",
          starProbes: ["What signals?"],
          exemplars: { strong: "s", baseline: "b", weak: "w" },
        },
      ],
    },
  ],
  totalCompetencies: 1,
}

describe("interviewService.getQuestionBank", () => {
  beforeEach(() => jest.clearAllMocks())

  it("GETs the question-bank endpoint with default params", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: bank })
    const result = await interviewService.getQuestionBank()
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents/interview/question-bank",
      { params: { section: undefined, include_exemplars: true } },
    )
    expect(result).toEqual(bank)
  })

  it("passes section and include_exemplars through", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: bank })
    await interviewService.getQuestionBank({ section: "behavioral", includeExemplars: false })
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents/interview/question-bank",
      { params: { section: "behavioral", include_exemplars: false } },
    )
  })
})
