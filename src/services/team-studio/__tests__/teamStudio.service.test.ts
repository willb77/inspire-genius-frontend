import {
  analyseSubject,
  askAboutSubjects,
  compareSubjects,
  exportSubject,
  fetchStarterQuestions,
  runScenario,
} from "../teamStudio.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const post = agentApi.post as jest.Mock

const SUBJECT = { name: "A. Member", scores: { Innovating: 71 } }

beforeEach(() => {
  post.mockReset()
  post.mockResolvedValue({ data: { status: "success", data: { ok: true } } })
})

/**
 * Only `/v1/agents/{proxy+}` has an API Gateway integration to the
 * agent-engine. A route mounted anywhere else falls through to the monolith,
 * which has no such path — it passes every other test, deploys green, and 404s
 * in the browser. This is the assertion that would have caught it.
 */
it("mounts every route under /v1/agents/, on agentApi", async () => {
  await analyseSubject({ subject: SUBJECT, part: 0 })
  await compareSubjects({ subjects: [SUBJECT, SUBJECT], part: 0 })
  await fetchStarterQuestions({ subject: [SUBJECT] })
  await askAboutSubjects({ subject: [SUBJECT], question: "q" })
  await runScenario({ subject: [SUBJECT], situation: "s", focus: "f" })
  await exportSubject({ subject: SUBJECT, fmt: "wide" })

  const paths = post.mock.calls.map((c) => c[0] as string)
  expect(paths).toEqual([
    "/v1/agents/team-studio/analyse",
    "/v1/agents/team-studio/compare",
    "/v1/agents/team-studio/questions",
    "/v1/agents/team-studio/ask",
    "/v1/agents/team-studio/scenario",
    "/v1/agents/team-studio/export",
  ])
  for (const p of paths) expect(p.startsWith("/v1/agents/")).toBe(true)
})

it("never addresses the Character Lab's endpoints", async () => {
  // The whole point of a second service module: a manager surface must not be
  // one argument away from the super-admin, synthetic-profile backend.
  await analyseSubject({ subject: SUBJECT, part: 1 })
  expect(post.mock.calls[0][0]).not.toContain("character-lab")
})

it("unwraps the {status, data} envelope rather than handing back the whole body", async () => {
  post.mockResolvedValue({
    data: { status: "success", data: { analysis: "text", parts: 3, part: 0 } },
  })
  const result = await analyseSubject({ subject: SUBJECT, part: 0 })
  expect(result.analysis).toBe("text")
  expect(result.parts).toBe(3)
})

it("sends the subject with every request — there is no stored profile id", async () => {
  await analyseSubject({ subject: SUBJECT, part: 2 })
  expect(post.mock.calls[0][1]).toEqual({ subject: SUBJECT, part: 2 })
})
