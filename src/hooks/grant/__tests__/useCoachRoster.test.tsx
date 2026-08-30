/**
 * @jest-environment jsdom
 *
 * GRANT coach-roster hooks, against the REAL service path (USE_GRANT_MOCKS off).
 *
 * Covers what the RosterPage tests can't see, because they mock these hooks
 * outright: that each hook calls the right service, that mutations invalidate
 * the roster so the table re-reads, and — the one with teeth — that
 * useInviteStudent's optimistic badge flip rolls back when the request fails.
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("../mocks", () => ({ USE_GRANT_MOCKS: false }))

const mockList = jest.fn()
const mockCreate = jest.fn()
const mockImport = jest.fn()
const mockRemove = jest.fn()
const mockInvite = jest.fn()
const mockBulkInvite = jest.fn()
jest.mock("@/services/grant/coach.service", () => ({
  listCoachStudents: (...a: unknown[]) => mockList(...a),
  createCoachStudent: (...a: unknown[]) => mockCreate(...a),
  importCoachStudents: (...a: unknown[]) => mockImport(...a),
  removeCoachStudent: (...a: unknown[]) => mockRemove(...a),
  inviteCoachStudent: (...a: unknown[]) => mockInvite(...a),
  inviteCoachStudentsBulk: (...a: unknown[]) => mockBulkInvite(...a),
}))

import {
  COACH_ROSTER_KEY,
  useBulkInviteStudents,
  useCoachRoster,
  useCreateStudent,
  useImportStudents,
  useInviteStudent,
  useRemoveStudent,
} from "../useCoachRoster"

const STUDENT = {
  id: "stu-1",
  fullName: "Maria Gonzalez",
  email: "maria.g@example.edu",
  stateOfResidence: "CA",
  gradeLevel: "12",
  status: "managed" as const,
  completeness: 80,
  readyToSearch: true,
  updatedAt: "2026-07-08T14:20:00.000Z",
}

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

describe("useCoachRoster", () => {
  test("reads the roster from the service", async () => {
    mockList.mockResolvedValue([STUDENT])
    const { result } = renderHook(() => useCoachRoster(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([STUDENT])
    expect(mockList).toHaveBeenCalledTimes(1)
  })
})

describe("roster mutations invalidate the roster", () => {
  test("useCreateStudent calls the service and invalidates", async () => {
    mockCreate.mockResolvedValue(STUDENT)
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useCreateStudent(), { wrapper })
    result.current.mutate({ firstName: "Maria", lastName: "Gonzalez" })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreate).toHaveBeenCalledWith({ firstName: "Maria", lastName: "Gonzalez" })
    expect(spy).toHaveBeenCalledWith({ queryKey: COACH_ROSTER_KEY })
  })

  test("useImportStudents passes parsed rows through and invalidates", async () => {
    const rows = [{ first_name: "Devon", last_name: "Carter" }]
    mockImport.mockResolvedValue({ created: 1, duplicates: 0, errors: 0, results: [] })
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useImportStudents(), { wrapper })
    result.current.mutate(rows)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockImport).toHaveBeenCalledWith(rows)
    expect(spy).toHaveBeenCalledWith({ queryKey: COACH_ROSTER_KEY })
  })

  test("useRemoveStudent calls the service and invalidates", async () => {
    mockRemove.mockResolvedValue({ removed: true })
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useRemoveStudent(), { wrapper })
    result.current.mutate("stu-1")
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRemove).toHaveBeenCalledWith("stu-1")
    expect(spy).toHaveBeenCalledWith({ queryKey: COACH_ROSTER_KEY })
  })

  test("useBulkInviteStudents forwards ids and the co-access choice", async () => {
    mockBulkInvite.mockResolvedValue({ converted: 1, skipped: 0, errors: 0, results: [] })
    const { result } = renderHook(() => useBulkInviteStudents(), { wrapper })
    result.current.mutate({ studentIds: ["stu-1", "stu-2"], keepCoachAccess: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // keepCoachAccess decides whether the coach keeps visibility after the
    // student takes over their own account — it must not be dropped.
    expect(mockBulkInvite).toHaveBeenCalledWith(["stu-1", "stu-2"], true)
  })
})

describe("useInviteStudent optimistic update", () => {
  test("flips the row to invited immediately, keeps it on success", async () => {
    qc.setQueryData(COACH_ROSTER_KEY, [STUDENT])
    mockInvite.mockResolvedValue({ status: "invited", studentId: "stu-1", message: "sent" })

    const { result } = renderHook(() => useInviteStudent(), { wrapper })
    result.current.mutate({ id: "stu-1", keepCoachAccess: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockInvite).toHaveBeenCalledWith("stu-1", false)
    const rows = qc.getQueryData<(typeof STUDENT)[]>(COACH_ROSTER_KEY)
    expect(rows?.[0].status).toBe("invited")
  })

  test("rolls the badge back when the invite fails", async () => {
    qc.setQueryData(COACH_ROSTER_KEY, [STUDENT])
    mockInvite.mockRejectedValue(new Error("boom"))

    const { result } = renderHook(() => useInviteStudent(), { wrapper })
    result.current.mutate({ id: "stu-1", keepCoachAccess: false })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Without the rollback the coach would see "invited" on a student who was
    // never actually invited, and never retry.
    const rows = qc.getQueryData<(typeof STUDENT)[]>(COACH_ROSTER_KEY)
    expect(rows?.[0].status).toBe("managed")
  })
})
