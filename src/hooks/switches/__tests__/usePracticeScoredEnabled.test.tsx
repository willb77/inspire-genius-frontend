import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { usePracticeScoredEnabled } from "@/hooks/switches/usePracticeScoredEnabled"
import { getPracticeScoredEnabled } from "@/services/switches/practiceScored.service"

jest.mock("@/services/switches/practiceScored.service", () => ({ getPracticeScoredEnabled: jest.fn() }))
const fetchSwitch = getPracticeScoredEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("usePracticeScoredEnabled (3.4 P4)", () => {
  it("is false while loading and true once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => usePracticeScoredEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("reads an error as off", async () => {
    fetchSwitch.mockRejectedValueOnce(new Error("403"))
    const { result } = renderHook(() => usePracticeScoredEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
