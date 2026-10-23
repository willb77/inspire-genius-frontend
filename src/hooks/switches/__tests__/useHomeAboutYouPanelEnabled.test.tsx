import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useHomeAboutYouPanelEnabled } from "@/hooks/switches/useHomeAboutYouPanelEnabled"
import { getHomeAboutYouPanelEnabled } from "@/services/switches/homeAboutYouPanel.service"

jest.mock("@/services/switches/homeAboutYouPanel.service", () => ({
  getHomeAboutYouPanelEnabled: jest.fn(),
}))
const fetchSwitch = getHomeAboutYouPanelEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("useHomeAboutYouPanelEnabled (HOME-1)", () => {
  it("is false while loading and true once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useHomeAboutYouPanelEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("stays false when the server says off", async () => {
    fetchSwitch.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useHomeAboutYouPanelEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  it("reads an error (a 404 from an engine without the route) as off", async () => {
    fetchSwitch.mockRejectedValueOnce(new Error("404"))
    const { result } = renderHook(() => useHomeAboutYouPanelEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
