/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useRoles } from "../useRoles"
import { getRoles } from "@/services/super-admin/roles.service"

jest.mock("@/services/super-admin/roles.service", () => ({
  getRoles: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useRoles", () => {
  it("fetches roles", async () => {
    (getRoles as jest.Mock).mockResolvedValueOnce({ data: { roles: [{ id: "r1", name: "admin" }] } })
    const { result } = renderHook(() => useRoles(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRoles).toHaveBeenCalled()
  })
})
