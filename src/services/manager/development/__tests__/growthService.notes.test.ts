/**
 * The coaching-notes calls (TDS-2): the routes, the verbs, and the one rule the
 * server enforces with a 400 — a note is about a goal OR a milestone, never
 * both. The service must be capable of sending only one of them.
 */
const post = jest.fn()
const get = jest.fn()
const patch = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, patch, delete: del }) }))

import {
  createCoachingNote,
  deleteCoachingNote,
  listCoachingNotes,
  updateCoachingNote,
} from "../growthService"

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: {} } })
  get.mockReset().mockResolvedValue({ data: { data: { notes: [] } } })
  patch.mockReset().mockResolvedValue({ data: { data: {} } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

it("reads this manager's notes for one member from the member-scoped route", async () => {
  await listCoachingNotes("m1")
  expect(get).toHaveBeenCalledWith("/v1/growth/members/m1/notes")
})

it("a note about a milestone carries milestoneId and no goalId", async () => {
  await createCoachingNote("m1", { kind: "observation", body: "x", milestoneId: "ms-1" })
  const body = post.mock.calls[0][1]
  expect(body).toMatchObject({ kind: "observation", body: "x", milestoneId: "ms-1" })
  expect(body).not.toHaveProperty("goalId")
})

it("an edit PATCHes the note's own path and sends only the fields given", async () => {
  await updateCoachingNote("m1", "n-9", { kind: "outcome", body: "landed" })
  expect(patch).toHaveBeenCalledWith("/v1/growth/members/m1/notes/n-9", {
    kind: "outcome",
    body: "landed",
  })
  // An explicit null is a different request from an omitted key: it CLEARS.
  await updateCoachingNote("m1", "n-9", { goalId: null })
  expect(patch).toHaveBeenLastCalledWith("/v1/growth/members/m1/notes/n-9", { goalId: null })
})

it("a delete targets the note under the member, so the gate runs on the URL", async () => {
  await deleteCoachingNote("m1", "n-9")
  expect(del).toHaveBeenCalledWith("/v1/growth/members/m1/notes/n-9")
})
