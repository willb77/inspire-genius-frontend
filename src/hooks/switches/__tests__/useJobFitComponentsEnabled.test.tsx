import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { getJobFitComponentsEnabled } from "@/services/switches/jobFitComponents.service"

jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: jest.fn(),
}))
const fetchSwitch = getJobFitComponentsEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("useJobFitComponentsEnabled (Feeds Phase 2)", () => {
  it("is false while loading and true once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useJobFitComponentsEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("reads an error as off", async () => {
    fetchSwitch.mockRejectedValueOnce(new Error("403"))
    const { result } = renderHook(() => useJobFitComponentsEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
