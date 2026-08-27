import {
  analyseProfile,
  askAboutProfiles,
  compareProfiles,
  deleteProfile,
  deleteScenario,
  exportProfile,
  fetchRubric,
  fetchStarterQuestions,
  generateProfile,
  getProfile,
  listProfiles,
  listScenarios,
  patchProfile,
  runScenario,
  saveProfile,
  saveScenario,
  scoreBattery,
} from "../characterLab.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock
const patch = agentApi.patch as jest.Mock
const del = agentApi.delete as jest.Mock

describe("characterLab.service", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
  })

  /**
   * Only `/v1/agents/{proxy+}` has an API Gateway integration to the
   * agent-engine. A path outside it deploys green and 404s in the browser, so
   * the prefix is asserted rather than assumed.
   */
  it.each([
    ["generate", () => generateProfile({ name: "X" }), "/v1/agents/character-lab/generate"],
    ["battery", () => scoreBattery({ name: "X", group: "Core Traits", behaviours: {} }), "/v1/agents/character-lab/battery"],
    ["analyse", () => analyseProfile({ name: "X", scores: {}, colours: {} }), "/v1/agents/character-lab/analyse"],
    ["export", () => exportProfile({ name: "X", scores: {}, colours: {}, fmt: "wide" }), "/v1/agents/character-lab/export"],
  ])("posts %s under the routed /v1/agents prefix", async (_label, call, path) => {
    post.mockResolvedValue({ data: { status: true, data: { analysis: "", filename: "f", content: "" } } })
    await call()
    expect(post).toHaveBeenCalledWith(path, expect.anything())
  })

  it("fetches the rubric under the routed prefix", async () => {
    get.mockResolvedValue({ data: { status: true, data: { groups: [] } } })
    await fetchRubric()
    expect(get).toHaveBeenCalledWith("/v1/agents/character-lab/rubric")
  })

  it("unwraps the response envelope rather than returning it raw", async () => {
    post.mockResolvedValue({ data: { status: true, data: { name: "Sonny", scores: { a: { Underlying: 1 } } } } })
    const result = await generateProfile({ name: "Sonny" })
    expect(result.name).toBe("Sonny")
    expect(result).not.toHaveProperty("status")
  })

  it("passes the character through to the API unchanged", async () => {
    post.mockResolvedValue({ data: { status: true, data: {} } })
    await generateProfile({ name: "Sonny Corleone", source: "The Godfather", notes: "hot-headed" })
    expect(post).toHaveBeenCalledWith("/v1/agents/character-lab/generate", {
      name: "Sonny Corleone",
      source: "The Godfather",
      notes: "hot-headed",
    })
  })
})

// ─── Saved profiles, comparison, scenarios ──────────────────────────────

describe("characterLab.service — library", () => {
  const get = agentApi.get as jest.Mock
  const post = agentApi.post as jest.Mock
  const patch = agentApi.patch as jest.Mock
  const del = agentApi.delete as jest.Mock

  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
  })

  /**
   * Every one of these must sit under `/v1/agents/`. It is the only prefix with
   * an API Gateway integration to the agent-engine — anything else deploys
   * green and 404s in the browser, with every unit test still passing.
   */
  it("mounts every library call under /v1/agents/character-lab", async () => {
    get.mockResolvedValue({ data: { status: true, data: { profiles: [], scenarios: [] } } })
    post.mockResolvedValue({ data: { status: true, data: {} } })
    patch.mockResolvedValue({ data: { status: true, data: {} } })
    del.mockResolvedValue({ data: { status: true, data: {} } })

    await listProfiles()
    await getProfile("p1")
    await listScenarios()
    await saveProfile({ name: "X", scores: {}, colours: {} })
    await patchProfile("p1", { notes: "n" })
    await deleteProfile("p1")
    await compareProfiles({ profile_ids: ["a", "b"], part: 0 })
    await fetchStarterQuestions({ profile_ids: ["a"] })
    await askAboutProfiles({ profile_ids: ["a"], question: "q" })
    await runScenario({ profile_ids: ["a"], situation: "s", focus: "collaborative" })
    await saveScenario({
      profile_ids: ["a"],
      title: "t",
      situation: "s",
      character_names: ["A"],
      result: {},
    })
    await deleteScenario("s1")

    const paths = [
      ...get.mock.calls,
      ...post.mock.calls,
      ...patch.mock.calls,
      ...del.mock.calls,
    ].map((c) => c[0] as string)

    expect(paths).toHaveLength(12)
    for (const path of paths) {
      expect(path.startsWith("/v1/agents/character-lab")).toBe(true)
    }
  })

  it("unwraps the envelope rather than handing back the axios body", async () => {
    get.mockResolvedValue({
      data: { status: true, data: { profiles: [{ id: "p1", name: "Sonny" }] } },
    })
    await expect(listProfiles()).resolves.toEqual([{ id: "p1", name: "Sonny" }])
  })

  it("sends only the fields being patched", async () => {
    // The endpoint treats an absent field as "leave alone". A service that
    // helpfully filled in the rest would blank the write-up on a notes edit.
    patch.mockResolvedValue({ data: { status: true, data: {} } })
    await patchProfile("p1", { notes: "just the notes" })
    expect(patch).toHaveBeenCalledWith("/v1/agents/character-lab/profiles/p1", {
      notes: "just the notes",
    })
  })

  it("passes the scenario focus straight through", async () => {
    // "collaborative" or a profile id — the server rejects anything else, and a
    // service that defaulted it would silently produce the wrong read.
    post.mockResolvedValue({ data: { status: true, data: {} } })
    await runScenario({ profile_ids: ["a", "b"], situation: "s", focus: "b" })
    expect(post).toHaveBeenCalledWith("/v1/agents/character-lab/scenario", {
      profile_ids: ["a", "b"],
      situation: "s",
      focus: "b",
    })
  })
})
