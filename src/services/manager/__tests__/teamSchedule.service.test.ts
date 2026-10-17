/**
 * Team schedule service (MSCH-1).
 *
 * It must call the agent-engine's MANAGER routes. The practitioner scheduler
 * at `/v1/agents/coach/schedule*` refuses every manager, and this page used to
 * call it.
 */

import {
  createTeamSessions,
  getTeamSchedulePreferences,
  listTeamSchedule,
  saveTeamSchedulePreferences,
  toUtcInstant,
} from "../teamSchedule.service"

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}))

beforeEach(() => jest.clearAllMocks())

it("lists from the team-schedule route", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: [{ sessionId: "s1" }] } })
  await expect(listTeamSchedule()).resolves.toEqual([{ sessionId: "s1" }])
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/coach/team-schedule")
})

it("posts to the team-schedule sessions route, never the practitioner one", async () => {
  mockPost.mockResolvedValue({
    data: { status: true, data: { created: 2, sessions: [], skipped: [], emailed: 2, notEmailed: [] } },
  })
  const input = {
    personIds: ["u1", "u2"], startsAt: "2026-10-20T14:00:00.000Z", durationMin: 30,
    spacingMin: 10, topic: "1:1", sendInvites: true,
  }
  const r = await createTeamSessions(input)
  expect(mockPost).toHaveBeenCalledWith("/v1/agents/coach/team-schedule/sessions", input)
  expect(r.created).toBe(2)
  expect(r.emailed).toBe(2)
})

it("fills missing lists so the page never reads undefined", async () => {
  mockPost.mockResolvedValue({ data: { status: true, data: { created: 0 } } })
  const r = await createTeamSessions({
    personIds: ["u1"], startsAt: "2026-10-20T14:00:00.000Z", durationMin: 30,
    spacingMin: 0, topic: "x", sendInvites: false,
  })
  expect(r).toEqual({ created: 0, sessions: [], skipped: [], emailed: 0, notEmailed: [] })
})

it("throws on an empty envelope instead of reporting zero sessions", async () => {
  mockPost.mockResolvedValue({ data: {} })
  await expect(
    createTeamSessions({
      personIds: ["u1"], startsAt: "2026-10-20T14:00:00.000Z", durationMin: 30,
      spacingMin: 0, topic: "x", sendInvites: false,
    }),
  ).rejects.toThrow("no scheduling result")
})

it("converts a datetime-local value to a UTC instant", () => {
  const out = toUtcInstant("2026-10-20T10:00")
  expect(out).toBe(new Date("2026-10-20T10:00").toISOString())
  expect(out.endsWith("Z")).toBe(true)
})

it("refuses a value that is not a date", () => {
  expect(() => toUtcInstant("not a date")).toThrow("not a valid date")
})

// ── MSCH-2: the saved default location ─────────────────────────────
it("reads the caller's own default, sending no user id", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { defaultLocation: "Room 4" } } })
  await expect(getTeamSchedulePreferences()).resolves.toEqual({ defaultLocation: "Room 4" })
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/coach/team-schedule/preferences")
})

it("reads a missing default as null", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: {} } })
  await expect(getTeamSchedulePreferences()).resolves.toEqual({ defaultLocation: null })
})

it("saves the default with PUT and returns what the server stored", async () => {
  mockPut.mockResolvedValue({ data: { status: true, data: { defaultLocation: "Room 4" } } })
  await expect(saveTeamSchedulePreferences({ defaultLocation: " Room 4 " })).resolves.toEqual({
    defaultLocation: "Room 4",
  })
  expect(mockPut).toHaveBeenCalledWith("/v1/agents/coach/team-schedule/preferences", {
    defaultLocation: " Room 4 ",
  })
})

it("throws when a save comes back empty instead of reporting it saved", async () => {
  mockPut.mockResolvedValue({ data: {} })
  await expect(saveTeamSchedulePreferences({ defaultLocation: "x" })).rejects.toThrow(
    "no saved preference",
  )
})
