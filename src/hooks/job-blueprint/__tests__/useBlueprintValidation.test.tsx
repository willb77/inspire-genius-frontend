/**
 * @jest-environment jsdom
 *
 * N-4 — the validation hooks and service. The one rule that matters most: a
 * 403 (switch off) reads as "not enabled", so the UI stays hidden.
 */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn() } }))
const mockExportWord = jest.fn().mockResolvedValue(undefined)
jest.mock("@/lib/exportBlueprintRationale", () => ({
  exportRationaleWord: (...a: unknown[]) => mockExportWord(...a),
}))

import { api } from "@/lib/axios"
import { validationService } from "@/services/job-blueprint/validation.service"
import {
  useAwaitingValidation,
  useBlueprintValidation,
  useExportRationale,
  useGiveVerdict,
  useRationale,
  useRecordAttestation,
  useRequestValidation,
  useValidationEnabled,
  useWithdrawValidation,
  validationErrorMessage,
} from "../useBlueprintValidation"

const mockApi = api as jest.Mocked<typeof api>

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

describe("validationService paths", () => {
  it("calls /v1/blueprint/validation/*", async () => {
    mockApi.get.mockResolvedValue({ data: { data: {} } })
    mockApi.post.mockResolvedValue({ data: { data: {} } })
    await validationService.status()
    await validationService.awaiting()
    await validationService.get("b1")
    await validationService.rationale("b1")
    await validationService.request("b1", { reviewerEmail: "r@x.test" })
    await validationService.verdict("b1", { verdict: "validated", name: "n", org: "o" })
    await validationService.record("b1", { name: "n", org: "o", validatedOn: "2026-10-01", attest: true })
    await validationService.withdraw("b1", "why")
    expect(mockApi.get.mock.calls.map((c) => c[0])).toEqual([
      "/v1/blueprint/validation/status", "/v1/blueprint/validation/awaiting",
      "/v1/blueprint/validation/b1", "/v1/blueprint/validation/b1/rationale",
    ])
    expect(mockApi.post.mock.calls.map((c) => c[0])).toEqual([
      "/v1/blueprint/validation/b1/request", "/v1/blueprint/validation/b1/verdict",
      "/v1/blueprint/validation/b1/record", "/v1/blueprint/validation/b1/withdraw",
    ])
    expect(mockApi.post.mock.calls[3][1]).toEqual({ note: "why" })
  })
})

describe("useValidationEnabled", () => {
  it("is false when the server refuses (switch off)", async () => {
    mockApi.get.mockRejectedValueOnce({ response: { status: 403 } })
    const { result } = renderHook(() => useValidationEnabled(), { wrapper })
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1))
    expect(result.current).toBe(false)
  })

  it("is true only when the server says enabled", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { enabled: true, reviewerRole: "manager", retentionDays: 90 } } })
    const { result } = renderHook(() => useValidationEnabled(), { wrapper })
    await waitFor(() => expect(result.current).toBe(true))
  })
})

describe("queries stay idle while disabled", () => {
  it("does not fetch the role's validation, the queue or the report", () => {
    renderHook(() => {
      useBlueprintValidation("b1", false)
      useAwaitingValidation(false)
      useRationale("b1", false)
    }, { wrapper })
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it("fetches when enabled", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } })
    const { result } = renderHook(() => useAwaitingValidation(true), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })
})

describe("mutations", () => {
  it("send to the right route", async () => {
    mockApi.post.mockResolvedValue({ data: { data: {} } })
    const { result } = renderHook(() => ({
      req: useRequestValidation(), ver: useGiveVerdict(), rec: useRecordAttestation(), wd: useWithdrawValidation(),
    }), { wrapper })
    await act(async () => {
      await result.current.req.mutateAsync({ id: "b1", body: { reviewerEmail: "r@x.test" } })
      await result.current.ver.mutateAsync({ id: "b1", body: { verdict: "changes_requested", comments: "c" } })
      await result.current.rec.mutateAsync({ id: "b1", body: { name: "n", org: "o", validatedOn: "2026-10-01", attest: true } })
      await result.current.wd.mutateAsync({ id: "b1" })
    })
    expect(mockApi.post).toHaveBeenCalledTimes(4)
  })

  it("exports the report the server assembled", async () => {
    const report = { role: { roleTitle: "Ops" } }
    mockApi.get.mockResolvedValueOnce({ data: { data: report } })
    const { result } = renderHook(() => useExportRationale(), { wrapper })
    await act(async () => { await result.current.mutateAsync("b1") })
    expect(mockExportWord).toHaveBeenCalledWith(report)
  })
})

describe("validationErrorMessage", () => {
  it("uses the server's detail when it is a string, else the fallback", () => {
    expect(validationErrorMessage({ response: { data: { detail: "No." } } }, "fb")).toBe("No.")
    expect(validationErrorMessage({ response: { data: { detail: [{ msg: "x" }] } } }, "fb")).toBe("fb")
    expect(validationErrorMessage(new Error("x"), "fb")).toBe("fb")
  })
})
