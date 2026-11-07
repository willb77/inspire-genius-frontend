/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useCohortReadout, useCohortReadoutEnabled, useCohortReadoutExport } from "../useCohortReadout"
import * as svc from "@/services/company-admin/cohortReadout.service"

jest.mock("@/services/company-admin/cohortReadout.service", () => ({
  getCohortReadoutEnabled: jest.fn(),
  getCohortReadout: jest.fn(),
  exportCohortReadout: jest.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useCohortReadout hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("does not read the status when disabled", () => {
    renderHook(() => useCohortReadoutEnabled(false), { wrapper })
    expect(svc.getCohortReadoutEnabled).not.toHaveBeenCalled()
  })

  it("reads the status when enabled", async () => {
    ;(svc.getCohortReadoutEnabled as jest.Mock).mockResolvedValue(true)
    const { result } = renderHook(() => useCohortReadoutEnabled(true), { wrapper })
    await waitFor(() => expect(result.current.data).toBe(true))
  })

  it("reads the read-out with the date filter", async () => {
    ;(svc.getCohortReadout as jest.Mock).mockResolvedValue({ suppressed: true })
    const { result } = renderHook(() => useCohortReadout("2026-08-01"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(svc.getCohortReadout).toHaveBeenCalledWith("2026-08-01")
  })

  it("company-admin (no scope) reads the own org with the original call", async () => {
    ;(svc.getCohortReadout as jest.Mock).mockResolvedValue({ suppressed: true })
    const { result } = renderHook(() => useCohortReadout(undefined), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect((svc.getCohortReadout as jest.Mock).mock.calls).toEqual([[undefined]])
    expect((svc.getCohortReadout as jest.Mock).mock.calls[0]).toHaveLength(1)
  })

  it("super-admin scope with no org makes NO call", async () => {
    const { result } = renderHook(() => useCohortReadout(undefined, { orgId: undefined }), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(svc.getCohortReadout).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe("idle")
  })

  it("super-admin scope with an org sends it", async () => {
    ;(svc.getCohortReadout as jest.Mock).mockResolvedValue({ suppressed: true })
    const { result } = renderHook(() => useCohortReadout("2026-08-01", { orgId: "org-9" }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(svc.getCohortReadout).toHaveBeenCalledWith("2026-08-01", "org-9")
  })

  it("exports for a picked org", async () => {
    ;(svc.exportCohortReadout as jest.Mock).mockResolvedValue(new Blob(["x"]))
    const { result } = renderHook(() => useCohortReadoutExport(), { wrapper })
    result.current.mutate({ format: "docx", orgId: "org-9" })
    await waitFor(() => expect(svc.exportCohortReadout).toHaveBeenCalledWith("docx", undefined, "org-9"))
  })

  it("exports through the service", async () => {
    ;(svc.exportCohortReadout as jest.Mock).mockResolvedValue(new Blob(["x"]))
    const { result } = renderHook(() => useCohortReadoutExport(), { wrapper })
    result.current.mutate({ format: "csv" })
    await waitFor(() => expect(svc.exportCohortReadout).toHaveBeenCalledWith("csv", undefined))
  })
})
