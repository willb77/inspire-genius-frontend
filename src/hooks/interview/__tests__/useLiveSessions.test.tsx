/**
 * The past-interviews readers — package IS-C.
 *
 * This module sat at 0% functions: it is mocked in every suite that renders a
 * surface using it, which is the right call there and leaves the hooks
 * themselves never executed. What that hides is small and real — a wrong query
 * key, a detail fetch that runs before a row is chosen, an abandon that does
 * not invalidate the list, so the row the interviewer just abandoned keeps
 * saying "In progress" until a reload.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import {
  useAbandonLiveSession,
  useLiveSessionDetail,
  useLiveSessions,
  liveSessionsKey,
} from "@/hooks/interview/useLiveSessions"

const listSessions = jest.fn()
const abandonSession = jest.fn()
const getSession = jest.fn()

jest.mock("@/services/interview/live.service", () => ({
  liveInterviewService: {
    listSessions: (...a: unknown[]) => listSessions(...a),
    abandonSession: (...a: unknown[]) => abandonSession(...a),
    getSession: (...a: unknown[]) => getSession(...a),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

describe("useLiveSessions", () => {
  it("passes the filters straight through to the service", async () => {
    listSessions.mockResolvedValue({ sessions: [], total: 0, limit: 25, offset: 0, org_scope_applied: true })
    const { result } = renderHook(() => useLiveSessions({ limit: 25, status: "in_progress" }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listSessions).toHaveBeenCalledWith({ limit: 25, status: "in_progress" })
  })

  it("keys the cache on the filters, so two filters are not one entry", () => {
    expect(liveSessionsKey({ status: "finalized" })).not.toEqual(liveSessionsKey({ status: "in_progress" }))
  })

  it("surfaces a failure rather than an empty list", async () => {
    listSessions.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useLiveSessions(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})

describe("useLiveSessionDetail", () => {
  it("does not fetch until a row has been chosen", () => {
    renderHook(() => useLiveSessionDetail(null), { wrapper })
    expect(getSession).not.toHaveBeenCalled()
  })

  it("fetches the chosen session", async () => {
    getSession.mockResolvedValue({ session: { session_id: "s-1" }, plan: [], answers: [] })
    const { result } = renderHook(() => useLiveSessionDetail("s-1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSession).toHaveBeenCalledWith("s-1")
  })
})

describe("useAbandonLiveSession", () => {
  it("invalidates the list so the abandoned row stops saying In progress", async () => {
    abandonSession.mockResolvedValue({ session: { id: "s-1", status: "abandoned" } })
    listSessions.mockResolvedValue({ sessions: [], total: 0, limit: 25, offset: 0, org_scope_applied: true })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = jest.spyOn(client, "invalidateQueries")
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useAbandonLiveSession(), { wrapper: localWrapper })
    await result.current.mutateAsync("s-1")

    expect(abandonSession).toHaveBeenCalledWith("s-1")
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["live-interview-sessions"] }),
    )
  })
})
