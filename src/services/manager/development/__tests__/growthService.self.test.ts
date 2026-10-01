/**
 * The self-scoped growth calls behind `/my/development` (TDS-4c).
 *
 * What is pinned: the URL of every call, and the fact that **not one of them
 * carries a member id**. The id is resolved server-side from the verified JWT
 * `sub`, so an id in the path or the query would be a parameter a client could
 * change — the whole reason these routes exist separately from
 * `/members/{id}/*`.
 */
const get = jest.fn()
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ get, post }) }))

import {
  closeMyGap,
  createMyGap,
  createMyLearningItem,
  getMyFullPrism,
  getMyGaps,
  getMyLearningItems,
  getMyMilestones,
} from "../growthService"

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: { data: [] } })
  post.mockReset().mockResolvedValue({ data: { data: {} } })
})

it("reads the caller's own gaps with no member id anywhere", async () => {
  await getMyGaps()
  expect(get).toHaveBeenCalledWith("/v1/growth/me/gaps", { params: undefined })
})

it("passes a target blueprint as a query param when one is selected", async () => {
  await getMyGaps("bp-9")
  expect(get).toHaveBeenLastCalledWith("/v1/growth/me/gaps", {
    params: { target_blueprint_id: "bp-9" },
  })
})

it("declares a gap on the self route and sends no source", async () => {
  // `source` is refused by the server on this path — it always writes
  // `skill`, which is what makes a self-declared gap survive a dossier
  // recompute. Sending one would be a field the server ignores and a reader
  // here would believe.
  await createMyGap({ competency: "Chairing a review", severity: "minor" })
  expect(post).toHaveBeenCalledWith("/v1/growth/me/gaps", {
    competency: "Chairing a review",
    severity: "minor",
  })
  expect(JSON.stringify(post.mock.calls[0][1])).not.toContain("source")
})

it("closes the caller's own gap by id alone", async () => {
  await closeMyGap("gap-4")
  expect(post).toHaveBeenCalledWith("/v1/growth/me/gaps/gap-4/close")
})

it("reads and writes the caller's own learning plan", async () => {
  await getMyLearningItems()
  expect(get).toHaveBeenCalledWith("/v1/growth/me/learning-items")
  await createMyLearningItem({ title: "Negotiation fundamentals" })
  expect(post).toHaveBeenCalledWith("/v1/growth/me/learning-items", {
    title: "Negotiation fundamentals",
  })
})

it("reads the caller's own milestones", async () => {
  await getMyMilestones()
  expect(get).toHaveBeenCalledWith("/v1/growth/me/milestones")
})

it("reads the caller's own full PRISM profile from /me/profile", async () => {
  // The self counterpart of /members/{id}/profile. A wrong path here is the
  // failure that cannot be caught by types: it compiles, and 404s.
  await getMyFullPrism()
  expect(get).toHaveBeenCalledWith("/v1/growth/me/profile")
})

it("never puts an id in a self-scoped URL", async () => {
  await Promise.all([getMyGaps(), getMyLearningItems(), getMyMilestones(), getMyFullPrism()])
  for (const [url] of get.mock.calls) {
    expect(url).toMatch(/^\/v1\/growth\/me\//)
    expect(url).not.toMatch(/\/members\//)
  }
})
