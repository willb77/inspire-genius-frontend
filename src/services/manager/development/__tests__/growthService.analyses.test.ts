/**
 * The saved-analyses calls (TDS-3): the routes, the verbs, and the one thing
 * the request must NOT carry.
 *
 * The rows are scoped `(manager_sub, member_id)` server-side, from the caller's
 * own signed sub. The single most important property of this service is
 * therefore negative: no manager identifier is sent. Two managers coaching the
 * same person must issue byte-identical requests, so there is nothing in the
 * request a client could set, mistype or tamper with that would widen it.
 *
 * The routes are mounted under `/members/{member_id}/` rather than a flat
 * `/analyses/{id}` so the gate runs on the URL, before any row is read — a flat
 * path would have to load the row FIRST to learn which member it concerns and
 * authorize SECOND, on psychometric data.
 */
const post = jest.fn()
const get = jest.fn()
const patch = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, patch, delete: del }) }))

import {
  createMemberAnalysis,
  deleteMemberAnalysis,
  listMemberAnalyses,
  updateMemberAnalysis,
} from "../growthService"

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: { id: "a-1" } } })
  get.mockReset().mockResolvedValue({ data: { data: { analyses: [] } } })
  patch.mockReset().mockResolvedValue({ data: { data: { id: "a-1" } } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

it("reads this manager's analyses from the member-scoped route", async () => {
  await listMemberAnalyses("m1")
  expect(get).toHaveBeenCalledWith("/v1/growth/members/m1/analyses")
})

/**
 * The cross-manager property, asserted where it can actually be asserted on
 * this side of the wire.
 *
 * The isolation itself is the server's (`assert_member_coaching_access`, plus a
 * lookup scoped by `manager_sub` AND `member_id`). What this layer owes it is
 * to hand it nothing to go on: the URL names only the member, the GET has no
 * params, and no POST body field identifies the caller. If a manager id ever
 * appears here, this fails — which is the point, because a service that sends
 * one invites a server that trusts it.
 */
it("sends no manager identifier anywhere — not in the path, the params or the body", async () => {
  await listMemberAnalyses("m1")
  expect(get.mock.calls[0]).toEqual(["/v1/growth/members/m1/analyses"])

  await createMemberAnalysis("m1", { kind: "compare", content: "text" })
  const [url, body] = post.mock.calls[0]
  expect(url).toBe("/v1/growth/members/m1/analyses")
  expect(Object.keys(body).sort()).toEqual(["content", "kind"])
  for (const key of ["managerId", "manager_sub", "managerSub", "sub", "actorId"]) {
    expect(body).not.toHaveProperty(key)
  }
})

it("keeps one output under the member whose workspace it was taken in (D-TDS3)", async () => {
  await createMemberAnalysis("m1", {
    kind: "compare",
    title: "Dana Whitfield vs Rowan Escobar",
    content: "## Friction and fit",
    inputs: { subjectNames: ["Dana Whitfield", "Rowan Escobar"] },
  })
  // The URL is what makes "analyses follow the member" true: a comparison that
  // names two colleagues is stored under m1, not under whichever of them the
  // body happens to mention first.
  expect(post).toHaveBeenCalledWith("/v1/growth/members/m1/analyses", {
    kind: "compare",
    title: "Dana Whitfield vs Rowan Escobar",
    content: "## Friction and fit",
    inputs: { subjectNames: ["Dana Whitfield", "Rowan Escobar"] },
  })
})

it("an edit PATCHes the analysis under its member and sends only the fields given", async () => {
  await updateMemberAnalysis("m1", "a-9", { title: "Renamed" })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/analyses/a-9", { title: "Renamed" })
  // An explicit null is a different request from an omitted key: the server
  // uses `exclude_unset`, so null CLEARS and undefined leaves alone.
  await updateMemberAnalysis("m1", "a-9", { title: null })
  expect(patch).toHaveBeenLastCalledWith("/v1/growth/members/m1/analyses/a-9", { title: null })
})

it("a delete targets the analysis under the member, so the gate runs on the URL", async () => {
  await deleteMemberAnalysis("m1", "a-9")
  expect(del).toHaveBeenCalledWith("/v1/growth/members/m1/analyses/a-9")
})
