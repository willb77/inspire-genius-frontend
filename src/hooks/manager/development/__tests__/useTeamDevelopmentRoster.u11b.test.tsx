/** @jest-environment jsdom */
/**
 * TDS-U11b — one roster fetch, two views of it. Members (what every existing
 * consumer reads) never include a card with no member id; the unconnected
 * clients come from the same response, not a second request.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const getRoster = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  getTeamDevelopmentRoster: () => getRoster(),
}))

import {
  useTeamDevelopmentRoster,
  useUnconnectedClients,
} from "@/hooks/manager/development/useTeamDevelopmentRoster"

const cov = { prism: false, clifton: false, disc: false }

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => getRoster.mockReset())

it("today's roster: the members are exactly what the server sent, and there are no unconnected clients", async () => {
  const today = [
    { memberId: "a", name: "A", coverage: cov, planStatus: null },
    { memberId: "b", name: "B", coverage: cov, planStatus: null },
  ]
  getRoster.mockResolvedValue({ data: { data: today } })
  const w = wrapper()
  const members = renderHook(() => useTeamDevelopmentRoster(), { wrapper: w })
  const clients = renderHook(() => useUnconnectedClients(), { wrapper: w })
  await waitFor(() => expect(members.result.current.data).toBeDefined())
  await waitFor(() => expect(clients.result.current.data).toBeDefined())
  expect(members.result.current.data).toEqual(today)
  expect(clients.result.current.data).toEqual([])
  expect(getRoster).toHaveBeenCalledTimes(1)
})

it("a practitioner's client roster: unconnected clients leave the member list and arrive in their own", async () => {
  getRoster.mockResolvedValue({
    data: {
      data: [
        { memberId: "acct-1", name: "Linked", coverage: cov, planStatus: null, clientId: "cl-1", connected: true },
        { memberId: null, name: "Waiting", coverage: cov, planStatus: null, clientId: "cl-2", connected: false },
      ],
    },
  })
  const w = wrapper()
  const members = renderHook(() => useTeamDevelopmentRoster(), { wrapper: w })
  const clients = renderHook(() => useUnconnectedClients(), { wrapper: w })
  await waitFor(() => expect(clients.result.current.data).toEqual([{ clientId: "cl-2", name: "Waiting" }]))
  expect(members.result.current.data?.map((m) => m.memberId)).toEqual(["acct-1"])
  expect(getRoster).toHaveBeenCalledTimes(1)
})
