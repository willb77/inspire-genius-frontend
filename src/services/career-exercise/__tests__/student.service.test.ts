import {
  getMySessions,
  pauseMySession,
  resumeMySession,
  startMySession,
} from "@/services/career-exercise/student.service"
import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }))
jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn() } }))
const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock

const BASE = "/v1/agents/career-exercise"
const SID = "11111111-2222-3333-4444-555555555555"

beforeEach(() => jest.clearAllMocks())

afterEach(() => {
  // Every call goes to the agent engine, never the monolith instance.
  expect((api.get as jest.Mock).mock.calls).toHaveLength(0)
  expect((api.post as jest.Mock).mock.calls).toHaveLength(0)
})

test("my sessions: the owner route, no person id sent", async () => {
  get.mockResolvedValueOnce({ data: { status: true, data: { sessions: [] } } })
  await expect(getMySessions()).resolves.toEqual({ sessions: [] })
  expect(get).toHaveBeenCalledWith(`${BASE}/sessions`)
})

test("start: POST with no body", async () => {
  const out = { session: { session_id: SID }, created: true }
  post.mockResolvedValueOnce({ data: { status: true, data: out } })
  await expect(startMySession()).resolves.toEqual(out)
  expect(post).toHaveBeenCalledWith(`${BASE}/sessions`)
})

test("pause and resume send the version on screen", async () => {
  post.mockResolvedValue({ data: { status: true, data: { session: { session_id: SID } } } })
  await pauseMySession(SID, 4)
  expect(post).toHaveBeenLastCalledWith(`${BASE}/sessions/${SID}/pause`, { version: 4 })
  await resumeMySession(SID, 7)
  expect(post).toHaveBeenLastCalledWith(`${BASE}/sessions/${SID}/resume`, { version: 7 })
})

test("a session id is path-encoded", async () => {
  post.mockResolvedValue({ data: { status: true, data: { session: {} } } })
  await resumeMySession("a/b", 1)
  expect(post).toHaveBeenLastCalledWith(`${BASE}/sessions/a%2Fb/resume`, { version: 1 })
})
