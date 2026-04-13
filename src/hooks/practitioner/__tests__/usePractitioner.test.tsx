/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { usePractitionerClients, usePractitionerSessions, usePractitionerCredits, usePractitionerFollowups } from "../usePractitioner"

jest.mock("@/services/practitioner/practitioner.service", () => ({
  getPractitionerClients: jest.fn().mockResolvedValue({ data: { data: { clients: [], total: 0 } } }),
  getPractitionerSessions: jest.fn().mockResolvedValue({ data: { data: { sessions: [] } } }),
  getPractitionerCredits: jest.fn().mockResolvedValue({ data: { data: {} } }),
  getPractitionerFollowups: jest.fn().mockResolvedValue({ data: { data: { followups: [] } } }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePractitioner hooks", () => {
  it("usePractitionerClients fetches clients", async () => {
    const { result } = renderHook(() => usePractitionerClients(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ clients: [], total: 0 })
  })

  it("usePractitionerSessions fetches sessions", async () => {
    const { result } = renderHook(() => usePractitionerSessions(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("usePractitionerCredits fetches credits", async () => {
    const { result } = renderHook(() => usePractitionerCredits(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("usePractitionerFollowups fetches followups", async () => {
    const { result } = renderHook(() => usePractitionerFollowups(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
