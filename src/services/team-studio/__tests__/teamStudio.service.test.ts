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

// The CANONICAL key shape, per score type — what the server indexes by, and
// what `subjectFromProfile` now emits. A label-keyed fixture here would agree
// with the wrong side and pass forever, which is how the mismatch shipped.
const SUBJECT = { name: "A. Member", scores: { innovating: { Underlying: 71 } } }

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
  await fetchStarterQuestions({ subjects: [SUBJECT] })
  await askAboutSubjects({ subjects: [SUBJECT], question: "q" })
  await runScenario({ subjects: [SUBJECT], situation: "s" })
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
  // The body the SERVER sends. `app/routes/team_studio.py` returns
  // `{"status": "success", "data": {"part", "parts", "markdown", "notice"}}` —
  // there is no `analysis` key anywhere in that module. The previous version of
  // this test authored `{analysis: "text"}` and asserted it came back, so it
  // passed for as long as the mismatch existed and could never fail.
  post.mockResolvedValue({
    data: { status: "success", data: { part: 0, parts: 3, markdown: "text", notice: "N" } },
  })
  const result = await analyseSubject({ subject: SUBJECT, part: 0 })
  expect(result).toEqual({ part: 0, parts: 3, markdown: "text", notice: "N" })
})

it("sends the subject with every request — there is no stored profile id", async () => {
  await analyseSubject({ subject: SUBJECT, part: 2 })
  expect(post.mock.calls[0][1]).toEqual({ subject: SUBJECT, part: 2 })
})

/**
 * The request-shape half of the same defect.
 *
 * `/analyse` and `/export` take a single `subject`; `/compare`, `/questions`,
 * `/ask` and `/scenario` take `subjects`. Sending a list under the singular key
 * — which is what shipped — is a Pydantic 422, and staging-b returned exactly
 * that for `/scenario` on 2026-09-03. Asserting the KEY and its cardinality is
 * what a fixture-based test could not do.
 */
it("uses the singular key only where the server takes one subject", async () => {
  await analyseSubject({ subject: SUBJECT, part: 0 })
  await exportSubject({ subject: SUBJECT, fmt: "wide" })
  for (const call of post.mock.calls) {
    expect(call[1]).toHaveProperty("subject")
    expect(Array.isArray((call[1] as { subject: unknown }).subject)).toBe(false)
  }
})

it("uses the plural key, with a list, on every group-capable endpoint", async () => {
  await compareSubjects({ subjects: [SUBJECT, SUBJECT], part: 0 })
  await fetchStarterQuestions({ subjects: [SUBJECT] })
  await askAboutSubjects({ subjects: [SUBJECT], question: "q" })
  await runScenario({ subjects: [SUBJECT], situation: "s" })

  for (const call of post.mock.calls) {
    const body = call[1] as { subjects?: unknown; subject?: unknown }
    expect(body).not.toHaveProperty("subject")
    expect(Array.isArray(body.subjects)).toBe(true)
  }
})

it("sends no `focus` — the server infers the mode from how many subjects it gets", async () => {
  await runScenario({ subjects: [SUBJECT], situation: "s" })
  expect(post.mock.calls[0][1]).toEqual({ subjects: [SUBJECT], situation: "s" })
})
