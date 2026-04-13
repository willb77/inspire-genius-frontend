/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useRequestMagicLink, useVerifyMagicLink } from "../useMagicAuth"
import { requestMagicLink, verifyMagicLink } from "@/services/magic-auth/magic-auth.service"

jest.mock("@/services/magic-auth/magic-auth.service", () => ({
  requestMagicLink: jest.fn(),
  verifyMagicLink: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useMagicAuth hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("useRequestMagicLink calls requestMagicLink", async () => {
    (requestMagicLink as jest.Mock).mockResolvedValueOnce({ success: true, message: "Sent!" })
    const { result } = renderHook(() => useRequestMagicLink(), { wrapper })
    act(() => { result.current.mutate({ email: "a@b.com" }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestMagicLink).toHaveBeenCalledWith({ email: "a@b.com" })
  })

  it("useVerifyMagicLink calls verifyMagicLink", async () => {
    (verifyMagicLink as jest.Mock).mockResolvedValueOnce({ data: { id: "u1" } })
    const { result } = renderHook(() => useVerifyMagicLink(), { wrapper })
    act(() => { result.current.mutate({ token: "tok" } as never) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(verifyMagicLink).toHaveBeenCalled()
  })
})
