/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  getManagerTeam,
  getManagerHiringStats,
  getManagerInterviews,
  getManagerCandidates,
  getManagerInterviewSchedule,
  getManagerTraining,
  getManagerCareerPaths,
  getManagerTeamComposition,
  getManagerLeadership,
} from "../manager.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("manager.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["getManagerTeam", getManagerTeam, "/api/manager/team"],
    ["getManagerHiringStats", getManagerHiringStats, "/api/manager/hiring/stats"],
    ["getManagerInterviews", getManagerInterviews, "/api/manager/hiring/interviews"],
    ["getManagerCandidates", getManagerCandidates, "/api/manager/hiring/candidates"],
    ["getManagerInterviewSchedule", getManagerInterviewSchedule, "/api/manager/interviews/schedule"],
    ["getManagerTraining", getManagerTraining, "/api/manager/training"],
    ["getManagerCareerPaths", getManagerCareerPaths, "/api/manager/career-paths"],
    ["getManagerTeamComposition", getManagerTeamComposition, "/api/manager/team/composition"],
    ["getManagerLeadership", getManagerLeadership, "/api/manager/leadership"],
  ] as const)("%s calls correct endpoint", async (_name, fn, url) => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fn()
    expect(mockApi.get).toHaveBeenCalledWith(url)
  })
})
