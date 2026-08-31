/**
 * Curated role packs — catalogue fetch, question fetch, and the planner
 * contract the backend deliberately does NOT assume.
 *
 * The backend test suite asserts the dataset shape but stops at the boundary:
 * whether an unevenly-distributed pack still yields a full-length interview is
 * a property of `buildInterviewPlan`, which is TypeScript. Asserting it there
 * would have been a guess. It is asserted here.
 */
import {
  buildInterviewPlan,
  getRolePackCatalogue,
  getRolePackQuestions,
  type InterviewFrame,
  type PracticeQuestions,
} from "../practice.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn() },
}))

const mockGet = agentApi.get as jest.Mock

beforeEach(() => jest.clearAllMocks())

const frame = (over: Partial<InterviewFrame> = {}): InterviewFrame => ({
  company: "",
  industry: "",
  roleTitle: "",
  reportingLine: "",
  scope: "",
  ...over,
})

function comp(id: string) {
  return {
    id,
    competency: `Competency ${id}`,
    question: `Question ${id}?`,
    starProbes: [`probe ${id}`],
    source: "role" as const,
    strongAnswerCovers: `covers ${id}`,
  }
}

/** A pack shaped like the real analyst one: lopsided, not 4/4/4. */
function lopsidedBank(): PracticeQuestions {
  return {
    guidance: "note",
    sections: [
      { key: "vision", section: "vision", title: "Judgment & direction",
        competencies: [comp("v1"), comp("v2"), comp("v3"), comp("v4")] },
      { key: "behavioral", section: "behavioral", title: "People & conduct",
        competencies: [comp("b1"), comp("b2")] },
      { key: "productivity", section: "productivity", title: "Execution & craft",
        competencies: [comp("p1"), comp("p2"), comp("p3"), comp("p4"), comp("p5"), comp("p6")] },
    ],
  }
}

// ---------------------------------------------------------------------------
// Catalogue — fail-open is the whole deployment safety story
// ---------------------------------------------------------------------------
describe("getRolePackCatalogue", () => {
  it("returns the catalogue on success", async () => {
    mockGet.mockResolvedValueOnce({
      data: { provenance: "p", roles: [{ slug: "a", title: "A", level: "Entry level", levelOrder: 1, seniority: "associate", family: "F", competencyCount: 12, questionCount: 36 }] },
    })
    const res = await getRolePackCatalogue()
    expect(res.roles).toHaveLength(1)
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/interview/role-packs")
  })

  it("fails OPEN to an empty list when the route is missing", async () => {
    // This is the case that actually happens: the frontend deploys to dev AND
    // staging-b on merge, the agent-engine reaches staging-b only on a release
    // tag. An empty list means the picker never renders — a degraded form, not
    // a broken one.
    mockGet.mockRejectedValueOnce(Object.assign(new Error("404"), { response: { status: 404 } }))
    const res = await getRolePackCatalogue()
    expect(res).toEqual({ provenance: "", roles: [] })
  })

  it("fails open on a network error too", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network Error"))
    await expect(getRolePackCatalogue()).resolves.toEqual({ provenance: "", roles: [] })
  })
})

// ---------------------------------------------------------------------------
// Questions — must NOT fail open
// ---------------------------------------------------------------------------
describe("getRolePackQuestions", () => {
  it("requests the slug, url-encoded", async () => {
    mockGet.mockResolvedValueOnce({ data: lopsidedBank() })
    await getRolePackQuestions("ts-cyber-grc-analyst")
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/agents/interview/role-packs/ts-cyber-grc-analyst",
    )
  })

  it("encodes a slug with unsafe characters rather than injecting path segments", async () => {
    mockGet.mockResolvedValueOnce({ data: lopsidedBank() })
    await getRolePackQuestions("a/../b")
    expect(mockGet).toHaveBeenCalledWith("/v1/agents/interview/role-packs/a%2F..%2Fb")
  })

  it("THROWS on failure instead of silently substituting a generic bank", async () => {
    // Deliberately the opposite contract from the catalogue. The candidate
    // picked a specific role; quietly serving them the general interview and
    // calling it success is the dishonest-empty-state failure. The caller
    // catches this and shows no role badge, so the substitution is visible.
    mockGet.mockRejectedValueOnce(new Error("500"))
    await expect(getRolePackQuestions("x")).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// The planner contract
// ---------------------------------------------------------------------------
describe("buildInterviewPlan over a role pack", () => {
  it("returns a FULL 12-question interview from a lopsided pack", () => {
    // The analyst pack is 4 vision / 2 behavioral / 6 productivity. An even
    // 4/4/4 split would take only 2 from behavioral and return 10 questions —
    // a short interview that looks deliberate. The planner's top-up is what
    // prevents that, and this is the test that proves it.
    const plan = buildInterviewPlan(lopsidedBank(), frame({ numQuestions: 12 }))
    expect(plan).toHaveLength(12)
  })

  it("never repeats a competency when topping up", () => {
    const plan = buildInterviewPlan(lopsidedBank(), frame({ numQuestions: 12 }))
    expect(new Set(plan.map((p) => p.id)).size).toBe(12)
  })

  it("numbers the plan 1..N in order", () => {
    const plan = buildInterviewPlan(lopsidedBank(), frame({ numQuestions: 12 }))
    expect(plan.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it("carries source and coaching through to the question card", () => {
    const plan = buildInterviewPlan(lopsidedBank(), frame({ numQuestions: 12 }))
    expect(plan.every((p) => p.source === "role")).toBe(true)
    expect(plan.every((p) => Boolean(p.strongAnswerCovers))).toBe(true)
    expect(plan.every((p) => p.starProbes.length > 0)).toBe(true)
  })

  it("honours a shorter requested interview", () => {
    const plan = buildInterviewPlan(lopsidedBank(), frame({ numQuestions: 6 }))
    expect(plan).toHaveLength(6)
    expect(new Set(plan.map((p) => p.id)).size).toBe(6)
  })
})
