/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

import { useStudentRoster, useRequestStudentAccess } from "../useStudentRoster"

const mockGet = jest.fn()
const mockRequest = jest.fn()
jest.mock("@/services/manager/studentRoster.service", () => ({
  getStudentRoster: () => mockGet(),
  requestStudentAccess: (i: unknown) => mockRequest(i),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

it("surfaces the roster", async () => {
  mockGet.mockResolvedValue({ students: [], rosterEmptyReason: null, viewerProfileResolved: true })
  const { result } = renderHook(() => useStudentRoster(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.viewerProfileResolved).toBe(true)
})

it("does not retry a permission failure", async () => {
  // A 403 is an answer, not a transient fault. Retrying it spends seconds of
  // spinner to arrive at the same refusal, during which the page can say
  // nothing true.
  mockGet.mockRejectedValue(new Error("not a supervisory role"))
  const { result } = renderHook(() => useStudentRoster(), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(mockGet).toHaveBeenCalledTimes(1)
})

it("refetches after a successful access request rather than assuming it landed", async () => {
  mockGet.mockResolvedValue({ students: [], rosterEmptyReason: null, viewerProfileResolved: true })
  mockRequest.mockResolvedValue(undefined)
  const { result } = renderHook(
    () => ({ roster: useStudentRoster(), req: useRequestStudentAccess() }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.roster.isSuccess).toBe(true))
  const before = mockGet.mock.calls.length

  result.current.req.mutate({ studentUserId: "u", categories: { prism: true }, reason: "r" })
  await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(before))
})
