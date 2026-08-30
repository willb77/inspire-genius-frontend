/**
 * @jest-environment jsdom
 *
 * Employer/sector question packs on the candidate practice path.
 *
 * The contracts under test are the client half of "curated-first": the frame's
 * company/industry actually reach the backend, blank values are omitted rather
 * than sent as empty strings, the curated `source`/`strongAnswerCovers` fields
 * survive plan-building so the question card can show provenance, and every
 * failure path still yields a usable interview.
 */
import {
  getTailoredPracticeQuestions,
  getEmployerPackCatalogue,
  buildInterviewPlan,
  type InterviewFrame,
  type PracticeQuestions,
} from "../practice.service"

const mockAxios = { get: jest.fn(), post: jest.fn() }

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...args: unknown[]) => mockAxios.get(...args),
    post: (...args: unknown[]) => mockAxios.post(...args),
  },
}))

const FRAME: InterviewFrame = {
  company: "Amazon",
  industry: "Technology",
  roleTitle: "Senior Product Manager",
  reportingLine: "Director of Product",
  scope: "Two squads",
  numQuestions: 4,
}

function packedBank(): PracticeQuestions {
  return {
    guidance: "STAR",
    tailored: true,
    employer: {
      kind: "employer",
      slug: "amazon-aws",
      name: "Amazon / AWS",
      coachingNote: "Unquantified results and 'we' language are the failure modes.",
      questionCount: 6,
      provenance: "Written by Inspire Genius in the style of the employer's published framework.",
      sector: "Technology",
      sectorSlug: "technology",
      framework: "The 16 Leadership Principles (published by Amazon)",
      howTheyInterview: "Each interviewer owns specific principles; a Bar Raiser holds the bar.",
      optimizesFor: "Single-owner narratives with quantified results.",
    },
    sections: [
      {
        key: "behavioral",
        section: "B",
        title: "Behavioral & Cultural Alignment",
        competencies: [
          {
            id: "behavioral.accountability",
            competency: "Accountability & Ownership",
            question: "Tell me about a time you took responsibility outside your remit.",
            starProbes: ["What was your role?"],
            source: "employer",
            strongAnswerCovers: "A clear 'I' narrative and the mechanism that stopped recurrence",
          },
          {
            id: "behavioral.conflict_resolution",
            competency: "Conflict Resolution",
            question: "Tell me about a disagreement…",
            starProbes: ["What did you do?"],
            source: "bank",
          },
        ],
      },
    ],
    totalCompetencies: 2,
  }
}

describe("getTailoredPracticeQuestions — employer context", () => {
  beforeEach(() => jest.clearAllMocks())

  it("sends the company and industry to the tailored endpoint", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: packedBank() })

    await getTailoredPracticeQuestions("Senior Product Manager", undefined, undefined, {
      company: FRAME.company,
      industry: FRAME.industry,
    })

    expect(mockAxios.post).toHaveBeenCalledWith(
      "/v1/agents/interview/practice-questions/tailored",
      {
        job_title: "Senior Product Manager",
        job_description: undefined,
        section: undefined,
        company: "Amazon",
        industry: "Technology",
      },
    )
  })

  it("omits blank/whitespace company and industry instead of sending empty strings", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: packedBank() })

    await getTailoredPracticeQuestions("PM", undefined, undefined, {
      company: "   ",
      industry: "",
    })

    expect(mockAxios.post.mock.calls[0][1]).toMatchObject({
      company: undefined,
      industry: undefined,
    })
  })

  it("returns the employer descriptor with its provenance notice", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: packedBank() })

    const bank = await getTailoredPracticeQuestions("PM", undefined, undefined, {
      company: "Amazon",
    })

    expect(bank.employer?.slug).toBe("amazon-aws")
    expect(bank.employer?.provenance).toMatch(/in the style of/i)
  })

  it("falls back to the static bank when the tailored call fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("boom"))
    mockAxios.get.mockResolvedValueOnce({ data: { guidance: "STAR", sections: [] } })

    const bank = await getTailoredPracticeQuestions("PM", undefined, undefined, {
      company: "Amazon",
    })

    expect(mockAxios.get).toHaveBeenCalled()
    expect(bank.employer).toBeUndefined()
  })
})

describe("buildInterviewPlan — provenance carries through", () => {
  it("keeps source and strongAnswerCovers on the planned question", () => {
    const plan = buildInterviewPlan(packedBank(), { ...FRAME, numQuestions: 2 })

    const curated = plan.find((p) => p.id === "behavioral.accountability")
    expect(curated?.source).toBe("employer")
    expect(curated?.strongAnswerCovers).toMatch(/'I' narrative/)

    const plain = plan.find((p) => p.id === "behavioral.conflict_resolution")
    expect(plain?.source).toBe("bank")
    expect(plain?.strongAnswerCovers).toBeUndefined()
  })
})

describe("getEmployerPackCatalogue", () => {
  beforeEach(() => jest.clearAllMocks())

  it("GETs the catalogue endpoint", async () => {
    mockAxios.get.mockResolvedValueOnce({
      data: { provenance: "notice", employers: [{ slug: "google" }], sectors: [] },
    })

    const catalogue = await getEmployerPackCatalogue()

    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents/interview/employer-packs")
    expect(catalogue.employers).toHaveLength(1)
  })

  it("degrades to empty lists rather than throwing", async () => {
    mockAxios.get.mockRejectedValueOnce(new Error("offline"))

    await expect(getEmployerPackCatalogue()).resolves.toEqual({
      provenance: "",
      employers: [],
      sectors: [],
    })
  })
})
