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

  it("exports through the service", async () => {
    ;(svc.exportCohortReadout as jest.Mock).mockResolvedValue(new Blob(["x"]))
    const { result } = renderHook(() => useCohortReadoutExport(), { wrapper })
    result.current.mutate({ format: "csv" })
    await waitFor(() => expect(svc.exportCohortReadout).toHaveBeenCalledWith("csv", undefined))
  })
})
