/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockListClients = jest.fn()
const mockGetClient = jest.fn()
const mockAddClient = jest.fn()
const mockBulkImport = jest.fn()
const mockUpload = jest.fn()
const mockListSchedule = jest.fn()
const mockCreateSessions = jest.fn()
const mockGetCredits = jest.fn()
const mockGetUsage = jest.fn()

jest.mock("@/services/practitioner/coachClient.service", () => ({
  listClients: (...a: unknown[]) => mockListClients(...a),
  getClient: (...a: unknown[]) => mockGetClient(...a),
  addClient: (...a: unknown[]) => mockAddClient(...a),
  bulkImportClients: (...a: unknown[]) => mockBulkImport(...a),
  uploadClientResource: (...a: unknown[]) => mockUpload(...a),
  listSchedule: (...a: unknown[]) => mockListSchedule(...a),
  createSessionsBulk: (...a: unknown[]) => mockCreateSessions(...a),
  getCreditsSummary: (...a: unknown[]) => mockGetCredits(...a),
  getClientUsage: (...a: unknown[]) => mockGetUsage(...a),
}))

import {
  useCoachClients,
  useCoachClient,
  useAddCoachClient,
  useBulkImportCoachClients,
  useUploadClientResource,
  useCoachSchedule,
  useCreateSessionsBulk,
  useCoachCredits,
  useClientUsage,
} from "../useCoachClient"

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

describe("coachClient query hooks", () => {
  test("useCoachClients reads the roster", async () => {
    mockListClients.mockResolvedValue([{ id: "cl-1", name: "Marcus Chen" }])
    const { result } = renderHook(() => useCoachClients(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: "cl-1", name: "Marcus Chen" }])
    expect(mockListClients).toHaveBeenCalledTimes(1)
  })

  test("useCoachClient fetches when an id is given", async () => {
    mockGetClient.mockResolvedValue({ id: "cl-1", name: "Marcus Chen" })
    const { result } = renderHook(() => useCoachClient("cl-1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetClient).toHaveBeenCalledWith("cl-1")
    expect(result.current.data).toEqual({ id: "cl-1", name: "Marcus Chen" })
  })

  test("useCoachClient stays disabled with no id", () => {
    const { result } = renderHook(() => useCoachClient(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe("idle")
    expect(mockGetClient).not.toHaveBeenCalled()
  })

  test("useCoachSchedule reads the schedule", async () => {
    mockListSchedule.mockResolvedValue([{ id: "sch-1", clientName: "Marcus" }])
    const { result } = renderHook(() => useCoachSchedule(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: "sch-1", clientName: "Marcus" }])
  })

  test("useCoachCredits reads the credits summary", async () => {
    mockGetCredits.mockResolvedValue({ balance: 340, currency: "PUK" })
    const { result } = renderHook(() => useCoachCredits(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ balance: 340, currency: "PUK" })
  })

  test("useClientUsage reads the usage rows", async () => {
    mockGetUsage.mockResolvedValue([{ clientName: "Marcus", sessions: 12 }])
    const { result } = renderHook(() => useClientUsage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ clientName: "Marcus", sessions: 12 }])
  })
})

describe("coachClient mutation hooks", () => {
  test("useAddCoachClient calls the service and invalidates", async () => {
    mockAddClient.mockResolvedValue({ id: "cl-new", name: "New" })
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useAddCoachClient(), { wrapper })
    result.current.mutate({ name: "New", email: "new@x.com" })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockAddClient).toHaveBeenCalledWith({ name: "New", email: "new@x.com" })
    expect(spy).toHaveBeenCalledWith({ queryKey: ["practitioner", "clients"] })
  })

  test("useBulkImportCoachClients forwards the rows", async () => {
    const rows = [{ name: "A", email: "a@x.com" }]
    mockBulkImport.mockResolvedValue({ imported: 1 })
    const { result } = renderHook(() => useBulkImportCoachClients(), { wrapper })
    result.current.mutate(rows)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockBulkImport).toHaveBeenCalledWith(rows)
  })

  test("useUploadClientResource passes clientId, resource and file", async () => {
    mockUpload.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useUploadClientResource(), { wrapper })
    result.current.mutate({ clientId: "cl-1", resource: "resume" })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpload).toHaveBeenCalledWith("cl-1", "resume", undefined)
  })

  test("useCreateSessionsBulk forwards the bulk input", async () => {
    const input = {
      clientIds: ["cl-1"],
      startsAt: "2026-07-23T15:00:00",
      durationMin: 60,
      spacingMin: 15,
      topic: "t",
      message: "",
      sendInvites: true,
    }
    mockCreateSessions.mockResolvedValue({ created: 1, emailed: 1, entries: [] })
    const { result } = renderHook(() => useCreateSessionsBulk(), { wrapper })
    result.current.mutate(input)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateSessions).toHaveBeenCalledWith(input)
  })
})
