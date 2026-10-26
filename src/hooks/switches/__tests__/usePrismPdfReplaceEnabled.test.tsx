import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { usePrismPdfReplaceEnabled } from "@/hooks/switches/usePrismPdfReplaceEnabled"
import { getPrismPdfReplaceEnabled } from "@/services/switches/prismPdfReplace.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)
const get = agentApi.get as jest.Mock

describe("prism-pdf-replace switch (PRISM-RR)", () => {
  beforeEach(() => get.mockReset())

  it("the service reads the caller's status route and only `true` counts", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getPrismPdfReplaceEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/switches/prism-pdf-replace")
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: "yes" } } })
    await expect(getPrismPdfReplaceEnabled()).resolves.toBe(false)
  })

  it("the hook is false while loading and true once the server says on", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    const { result } = renderHook(() => usePrismPdfReplaceEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it("the hook reads an error (an engine without the route) as off", async () => {
    get.mockRejectedValueOnce(new Error("404"))
    const { result } = renderHook(() => usePrismPdfReplaceEnabled(), { wrapper })
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
