/**
 * @jest-environment jsdom
 *
 * Careers and Jobs Phase B — `useCareersJobsFlow()` and its service.
 * `true` only on the server's exact `true`; loading, an error, a 403 and any
 * other value read as off (CSA B3, guard rail 1). One request, no retry.
 */
import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { agentApi } from "@/lib/agentApi"
import { getCareersJobsFlowEnabled } from "@/services/careers-jobs/careersJobs.service"
import { useCareersJobsFlow } from "../useCareersJobsFlow"

const get = agentApi.get as unknown as jest.Mock

function wrapper() {
  const qc = new QueryClient()
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => get.mockReset())

describe("getCareersJobsFlowEnabled", () => {
  test("calls the status route under /v1/agents", async () => {
    get.mockResolvedValue({ data: { status: true, data: { enabled: true } } })
    await expect(getCareersJobsFlowEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/careers-jobs/status")
  })

  test.each([false, "true", 1, null, undefined, {}])("enabled=%p reads false", async (value) => {
    get.mockResolvedValue({ data: { status: true, data: { enabled: value } } })
    await expect(getCareersJobsFlowEnabled()).resolves.toBe(false)
  })

  test("a body with no data reads false", async () => {
    get.mockResolvedValue({ data: undefined })
    await expect(getCareersJobsFlowEnabled()).resolves.toBe(false)
  })
})

describe("useCareersJobsFlow", () => {
  test("true when the server says true", async () => {
    get.mockResolvedValue({ data: { status: true, data: { enabled: true } } })
    const { result } = renderHook(() => useCareersJobsFlow(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current).toBe(true))
  })

  test("false while loading", () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCareersJobsFlow(), { wrapper: wrapper() })
    expect(result.current).toBe(false)
  })

  test("false on an error (a 403 or a 404 before the server half ships), and no retry", async () => {
    get.mockRejectedValue(Object.assign(new Error("403"), { response: { status: 403 } }))
    const { result } = renderHook(() => useCareersJobsFlow(), { wrapper: wrapper() })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current).toBe(false)
    expect(get).toHaveBeenCalledTimes(1)
  })

  test("false when the service yields a truthy value that is not exactly true", async () => {
    const svc = jest.requireActual("@/services/careers-jobs/careersJobs.service")
    const spy = jest.spyOn(svc, "getCareersJobsFlowEnabled").mockResolvedValue(1 as unknown as boolean)
    const { result } = renderHook(() => useCareersJobsFlow(), { wrapper: wrapper() })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(result.current).toBe(false)
    spy.mockRestore()
  })
})
