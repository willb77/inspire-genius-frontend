import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { usePractitionerProgrammeEnabled } from "@/hooks/switches/usePractitionerProgrammeEnabled"
import { getPractitionerProgrammeEnabled } from "@/services/switches/switches.service"

jest.mock("@/services/switches/switches.service", () => ({
  getPractitionerProgrammeEnabled: jest.fn(),
}))
const fetchSwitch = getPractitionerProgrammeEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("usePractitionerProgrammeEnabled (D9)", () => {
  it("is true only once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => usePractitionerProgrammeEnabled(), { wrapper })
    expect(result.current).toBe(false) // loading reads as off
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("reads an error as off", async () => {
    fetchSwitch.mockRejectedValueOnce(new Error("403"))
    const { result } = renderHook(() => usePractitionerProgrammeEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
