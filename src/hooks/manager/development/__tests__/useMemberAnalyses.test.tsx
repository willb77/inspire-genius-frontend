/** @jest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

/**
 * Saved Team Studio analyses at the hook layer (TDS-3).
 *
 * The test that matters most here is the cross-manager one, and it is worth
 * being precise about what it proves and what it cannot. The isolation is
 * SERVER-side: the rows are scoped `(manager_sub, member_id)` from the caller's
 * signed sub, behind `assert_member_coaching_access`, and 404 covers both "no
 * such analysis" and "not yours" so the two are indistinguishable. None of that
 * is this code's doing.
 *
 * What this layer can get wrong is everything around it: sending a manager id
 * the server might trust, keying a cache so one manager's list is served to
 * another, or turning the server's deliberately ambiguous 404 into "you do not
 * have permission" — which would confirm that somebody else's analysis exists.
 * Those are what is asserted.
 *
 * `growth.team_studio_analyses` holds 0 rows on dev and 0 on staging-b
 * (2026-09-30), so nothing here has ever been exercised against real data.
 */
const post = jest.fn()
const get = jest.fn()
const patch = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, patch, delete: del }) }))

import {
  useDeleteAnalysis,
  useMemberAnalyses,
  useSaveAnalysis,
} from "../useMemberAnalyses"
import type { SavedAnalysis } from "@/services/manager/development/growthService"

function row(over: Partial<SavedAnalysis> = {}): SavedAnalysis {
  return {
    id: "a-1",
    memberId: "m-1",
    kind: "analyse",
    title: "Dana Whitfield — behavioural write-up",
    content: "text",
    inputs: null,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: null,
    ...over,
  }
}

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: row() } })
  get.mockReset().mockResolvedValue({ data: { data: { analyses: [] } } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

describe("useMemberAnalyses — the list", () => {
  it("unwraps the envelope and keeps the server's order", async () => {
    get.mockResolvedValue({
      data: { data: { analyses: [row({ id: "newest" }), row({ id: "older" })] } },
    })
    const { wrapper } = harness()
    const { result } = renderHook(() => useMemberAnalyses("m-1"), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.map((r) => r.id)).toEqual(["newest", "older"])
  })

  it("narrows to one kind without refetching per tab", async () => {
    get.mockResolvedValue({
      data: {
        data: {
          analyses: [row({ id: "w", kind: "analyse" }), row({ id: "c", kind: "compare" })],
        },
      },
    })
    const { wrapper } = harness()
    const writeUps = renderHook(() => useMemberAnalyses("m-1", "analyse"), { wrapper })
    await waitFor(() => expect(writeUps.result.current.data).toBeDefined())
    expect(writeUps.result.current.data?.map((r) => r.id)).toEqual(["w"])

    const compares = renderHook(() => useMemberAnalyses("m-1", "compare"), { wrapper })
    await waitFor(() => expect(compares.result.current.data).toBeDefined())
    expect(compares.result.current.data?.map((r) => r.id)).toEqual(["c"])
    // One request for both tabs: the key is the member, the kind is a selector.
    expect(get).toHaveBeenCalledTimes(1)
  })

  it("does not fire without a member — there is no honest request to make", () => {
    const { wrapper } = harness()
    renderHook(() => useMemberAnalyses(undefined), { wrapper })
    expect(get).not.toHaveBeenCalled()
  })

  it("a failed read is an error, not an empty list", async () => {
    get.mockRejectedValue(new Error("boom"))
    const { wrapper } = harness()
    const { result } = renderHook(() => useMemberAnalyses("m-1"), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    // The distinction the panels render on. `data` staying undefined is what
    // stops "Nothing kept yet." appearing over a read that failed.
    expect(result.current.data).toBeUndefined()
  })
})

describe("useMemberAnalyses — a second manager gets none of the first's", () => {
  /**
   * The gate is the server's. What this asserts is that the client hands it
   * nothing to go on and adds nothing of its own: the request the second
   * manager makes is byte-identical to the first's, so the ONLY thing that can
   * separate the two answers is the signed sub the server reads.
   */
  it("issues a byte-identical request, carrying no caller identity", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [row({ id: "belongs-to-A" })] } } })
    const a = harness()
    const first = renderHook(() => useMemberAnalyses("m-1"), { wrapper: a.wrapper })
    await waitFor(() => expect(first.result.current.data).toBeDefined())

    // The second manager: a different session, so a different client. The
    // server answers with THEIR rows — here, none.
    get.mockResolvedValue({ data: { data: { analyses: [] } } })
    const b = harness()
    const second = renderHook(() => useMemberAnalyses("m-1"), { wrapper: b.wrapper })
    await waitFor(() => expect(second.result.current.data).toBeDefined())

    expect(second.result.current.data).toEqual([])
    expect(second.result.current.data).not.toContainEqual(
      expect.objectContaining({ id: "belongs-to-A" }),
    )
    // Byte-identical, both times.
    expect(get.mock.calls).toEqual([
      ["/v1/growth/members/m-1/analyses"],
      ["/v1/growth/members/m-1/analyses"],
    ])
  })

  /**
   * And the client must not INVENT the first manager's rows for the second by
   * holding them. Within one session the cache is keyed on the member alone,
   * which is right — it is the same manager throughout — so the guard that
   * matters is that a fresh client starts empty rather than seeding from
   * anywhere global.
   */
  it("holds nothing across clients", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [row({ id: "belongs-to-A" })] } } })
    const a = harness()
    const first = renderHook(() => useMemberAnalyses("m-1"), { wrapper: a.wrapper })
    await waitFor(() => expect(first.result.current.data).toHaveLength(1))

    const b = harness()
    const second = renderHook(() => useMemberAnalyses("m-1"), { wrapper: b.wrapper })
    // Before any response lands, the second session knows nothing.
    expect(second.result.current.data).toBeUndefined()
  })
})

describe("useSaveAnalysis / useDeleteAnalysis", () => {
  it("a response with no id is a failure, not a save", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    const { wrapper } = harness()
    const { result } = renderHook(() => useSaveAnalysis("m-1"), { wrapper })
    await expect(
      result.current.mutateAsync({ kind: "analyse", content: "text" }),
    ).rejects.toThrow("It was not saved.")
  })

  /**
   * Asserted through `invalidateQueries` rather than by waiting for a second
   * GET: with no mounted observer on that key there is nothing to refetch, so
   * a network assertion here would pass or fail on whether this test happened
   * to render the list, not on whether the invalidation is wired.
   */
  it("a successful save invalidates the member's list, keyed on the member", async () => {
    const { client, wrapper } = harness()
    const spy = jest.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useSaveAnalysis("m-1"), { wrapper })
    await result.current.mutateAsync({ kind: "analyse", content: "text" })
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        queryKey: ["development", "analyses", "m-1"],
      }),
    )
  })

  it("a successful delete invalidates the same list", async () => {
    const { client, wrapper } = harness()
    const spy = jest.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAnalysis("m-1"), { wrapper })
    await result.current.mutateAsync("a-1")
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        queryKey: ["development", "analyses", "m-1"],
      }),
    )
  })

  it("a delete that deleted nothing is a failure, and says nothing about permission", async () => {
    del.mockResolvedValue({ data: { data: { deleted: false } } })
    const { wrapper } = harness()
    const { result } = renderHook(() => useDeleteAnalysis("m-1"), { wrapper })
    // The server's 404 covers "no such analysis" AND "not yours". The message
    // must not separate them — doing so confirms another manager's row exists.
    await expect(result.current.mutateAsync("a-9")).rejects.toThrow("It was not deleted.")
    const message = await result.current.mutateAsync("a-9").catch((e: Error) => e.message)
    expect(message).not.toMatch(/permission|allowed|another|other manager|forbidden/i)
  })
})
