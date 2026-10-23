import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useWorkspaceDirectionSettingEnabled } from "@/hooks/switches/useWorkspaceDirectionSettingEnabled"
import { getWorkspaceDirectionSettingEnabled } from "@/services/switches/workspaceDirectionSetting.service"

jest.mock("@/services/switches/workspaceDirectionSetting.service", () => ({
  getWorkspaceDirectionSettingEnabled: jest.fn(),
}))
const fetchSwitch = getWorkspaceDirectionSettingEnabled as jest.Mock

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe("useWorkspaceDirectionSettingEnabled (WS-1)", () => {
  it("is false while loading and true once the server says on", async () => {
    fetchSwitch.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useWorkspaceDirectionSettingEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("stays false when the server says off", async () => {
    fetchSwitch.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useWorkspaceDirectionSettingEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  it("reads an error — the 404 before the route deploys — as off", async () => {
    fetchSwitch.mockRejectedValueOnce(Object.assign(new Error("404"), { response: { status: 404 } }))
    const { result } = renderHook(() => useWorkspaceDirectionSettingEnabled(), { wrapper })
    await waitFor(() => expect(fetchSwitch).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
