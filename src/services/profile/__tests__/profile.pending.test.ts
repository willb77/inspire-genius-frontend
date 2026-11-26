/**
 * TDS A4 — the person's waiting list, accept and decline routes.
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockDelete = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: mockGet, post: mockPost, delete: mockDelete },
}))

import { acceptPendingImport, listPendingImports, removeAssessment } from "../profile"

beforeEach(() => jest.clearAllMocks())

it("lists the waiting results from GET /v1/profile/me/assessments/pending", async () => {
  const item = { id: "a1", framework: "DISC", imported_at: "2026-11-25T00:00:00Z", scores: [] }
  mockGet.mockResolvedValueOnce({ data: { items: [item] } })
  await expect(listPendingImports()).resolves.toEqual([item])
  expect(mockGet).toHaveBeenCalledWith("/v1/profile/me/assessments/pending")
})

it("an answer with no items is an empty list, not a crash", async () => {
  mockGet.mockResolvedValueOnce({ data: {} })
  await expect(listPendingImports()).resolves.toEqual([])
})

it("accept posts to the result's own accept route", async () => {
  mockPost.mockResolvedValueOnce({ data: { id: "a 1", is_authoritative: true } })
  await acceptPendingImport("a 1")
  expect(mockPost).toHaveBeenCalledWith("/v1/profile/me/assessments/a%201/accept")
  expect(mockDelete).not.toHaveBeenCalled()
})

it("decline is the owner remove (DELETE), never the accept route", async () => {
  mockDelete.mockResolvedValueOnce({ data: { id: "a1", is_authoritative: false } })
  await removeAssessment("a1")
  expect(mockDelete).toHaveBeenCalledWith("/v1/profile/me/assessments/a1")
  expect(mockPost).not.toHaveBeenCalled()
})
