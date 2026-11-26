/**
 * @jest-environment jsdom
 *
 * D-11: the member's "Mark chapter done" / "Reopen" writer.
 *  - the service posts to /v1/agents/bio/{id}/modules/{type}/complete|reopen
 *    on the agent-engine client (the only prefix API Gateway routes there),
 *  - each hook invalidates that member's narrative so the strip and
 *    "Suggested next" refresh,
 *  - a failure is left on the mutation for the panel to render.
 */
import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  getApi: () => ({ post: mockPost }),
}))

import { completeBioModule, reopenBioModule } from "@/services/bio/bioService"
import {
  useCompleteBioModule,
  useReopenBioModule,
} from "@/hooks/useCompleteBioModule"
import { bioKeys } from "@/hooks/useBioNarrative"

const covered = {
  memberId: "sub-1",
  moduleType: "culture",
  status: "covered",
  startedAt: "2026-11-01T00:00:00Z",
  completedAt: "2026-11-26T00:00:00Z",
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { invalidate, wrapper }
}

beforeEach(() => jest.clearAllMocks())

describe("bio chapter service", () => {
  it("posts complete with no body to the module route", async () => {
    mockPost.mockResolvedValueOnce({ data: covered })
    await expect(completeBioModule("me", "culture")).resolves.toEqual(covered)
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/bio/me/modules/culture/complete")
  })

  it("posts reopen with no body to the module route", async () => {
    mockPost.mockResolvedValueOnce({ data: { ...covered, status: "in_progress", completedAt: null } })
    await reopenBioModule("me", "major_life_events")
    expect(mockPost).toHaveBeenCalledWith(
      "/v1/agents/bio/me/modules/major_life_events/reopen",
    )
  })
})

describe("useCompleteBioModule / useReopenBioModule", () => {
  it("complete invalidates the member's narrative on success", async () => {
    mockPost.mockResolvedValueOnce({ data: covered })
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useCompleteBioModule(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ memberId: "me", moduleType: "culture" })
    })
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/bio/me/modules/culture/complete")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bioKeys.narrative("me") })
  })

  it("reopen invalidates the member's narrative on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { ...covered, status: "in_progress" } })
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useReopenBioModule(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ memberId: "me", moduleType: "culture" })
    })
    expect(mockPost).toHaveBeenCalledWith("/v1/agents/bio/me/modules/culture/reopen")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bioKeys.narrative("me") })
  })

  it("a 422 is left on the mutation and nothing is invalidated", async () => {
    mockPost.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 422"), {
        response: { status: 422, data: { detail: "unknown module" } },
      }),
    )
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useCompleteBioModule(), { wrapper })
    act(() => result.current.mutate({ memberId: "me", moduleType: "childhood" }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.response?.status).toBe(422)
    expect(invalidate).not.toHaveBeenCalled()
  })
})
