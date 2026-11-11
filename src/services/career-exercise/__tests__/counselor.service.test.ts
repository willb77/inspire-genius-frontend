import {
  addStudentNote,
  confirmStudentPaths,
  getCareerExerciseEnabled,
  getStudentSessions,
} from "@/services/career-exercise/counselor.service"
import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }))
jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn() } }))
const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock

const BASE = "/v1/agents/career-exercise"
const STUDENT = "00000000-0000-0000-0000-0000000000a1"

beforeEach(() => jest.clearAllMocks())

afterEach(() => {
  // Every call goes to the agent engine, never the monolith instance.
  expect((api.get as jest.Mock).mock.calls).toHaveLength(0)
  expect((api.post as jest.Mock).mock.calls).toHaveLength(0)
})

test("status: true only when the server says enabled === true", async () => {
  get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
  await expect(getCareerExerciseEnabled()).resolves.toBe(true)
  expect(get).toHaveBeenCalledWith(`${BASE}/status`)
  get.mockResolvedValueOnce({ data: { status: true, data: { enabled: "yes" } } })
  await expect(getCareerExerciseEnabled()).resolves.toBe(false)
  get.mockResolvedValueOnce({ data: {} })
  await expect(getCareerExerciseEnabled()).resolves.toBe(false)
})

test("sessions: reads the student's path and unwraps the envelope", async () => {
  const out = { studentId: STUDENT, sessions: [] }
  get.mockResolvedValueOnce({ data: { status: true, data: out } })
  await expect(getStudentSessions(STUDENT)).resolves.toEqual(out)
  expect(get).toHaveBeenCalledWith(`${BASE}/students/${STUDENT}/sessions`)
})

test("ids are path-encoded", async () => {
  get.mockResolvedValueOnce({ data: { status: true, data: { studentId: "x", sessions: [] } } })
  await getStudentSessions("a/../b")
  expect(get).toHaveBeenCalledWith(`${BASE}/students/a%2F..%2Fb/sessions`)
})

test("note: posts only the stage and the text — never a counselor id", async () => {
  post.mockResolvedValueOnce({ data: { status: true, data: { studentId: STUDENT, session: {} } } })
  await addStudentNote(STUDENT, "s1", { stage: "discover", text: "Ask about robotics" })
  expect(post).toHaveBeenCalledWith(`${BASE}/students/${STUDENT}/sessions/s1/annotations`, {
    stage: "discover",
    text: "Ask about robotics",
  })
})

test("confirm: posts only the version read", async () => {
  post.mockResolvedValueOnce({ data: { status: true, data: { studentId: STUDENT, session: {} } } })
  await confirmStudentPaths(STUDENT, "s1", 7)
  expect(post).toHaveBeenCalledWith(`${BASE}/students/${STUDENT}/sessions/s1/confirm-paths`, {
    version: 7,
  })
})
