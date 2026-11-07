import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePractitionerDetail } from "../usePractitionerDetail"

jest.mock("@/services/super-admin/practitioner-registry/practitionerDetail.service", () => ({
  getPractitionerDetail: jest.fn(),
}))

import { getPractitionerDetail } from "@/services/super-admin/practitioner-registry/practitionerDetail.service"

let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePractitionerDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it("stays idle until a practitioner is chosen", () => {
    const { result } = renderHook(() => usePractitionerDetail(null), { wrapper })
    expect(result.current.fetchStatus).toBe("idle")
    expect(getPractitionerDetail).not.toHaveBeenCalled()
  })

  it("fetches that practitioner's counts", async () => {
    const data = { practitionerSub: "p1", active: true, linkedClients: 1, surveysOnSite30d: 0, surveyWindowDays: 30 }
    ;(getPractitionerDetail as jest.Mock).mockResolvedValue(data)
    const { result } = renderHook(() => usePractitionerDetail("p1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getPractitionerDetail).toHaveBeenCalledWith("p1")
    expect(result.current.data).toEqual(data)
  })

  it("lives under the registry key, so registry mutations refresh it", async () => {
    ;(getPractitionerDetail as jest.Mock).mockResolvedValue({})
    const { result } = renderHook(() => usePractitionerDetail("p1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await qc.invalidateQueries({ queryKey: ["practitioner-registry"] })
    await waitFor(() => expect(getPractitionerDetail).toHaveBeenCalledTimes(2))
  })
})
