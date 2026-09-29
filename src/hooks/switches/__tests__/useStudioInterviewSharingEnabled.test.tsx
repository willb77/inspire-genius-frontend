import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useStudioInterviewSharingEnabled } from "@/hooks/switches/useStudioInterviewSharingEnabled"
import { getStudioInterviewSharingEnabled } from "@/services/switches/studioInterviewSharing.service"

jest.mock("@/services/switches/studioInterviewSharing.service", () => ({
  getStudioInterviewSharingEnabled: jest.fn(),
}))
const fetchSwitch = getStudioInterviewSharingEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("useStudioInterviewSharingEnabled (S-3)", () => {
  it("is false while loading and true once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useStudioInterviewSharingEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("reads an error as off", async () => {
    fetchSwitch.mockRejectedValueOnce(new Error("403"))
    const { result } = renderHook(() => useStudioInterviewSharingEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
