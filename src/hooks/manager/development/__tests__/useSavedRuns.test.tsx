/** @jest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

/**
 * The Team Studio saved-run store (TDS-3) — what actually reaches the row.
 *
 * Both halves matter:
 *  - `content` must be readable on its own, because a manager opening a
 *    year-old run should not depend on `inputs` still parsing.
 *  - `inputs` must be enough to re-open, because otherwise "Open" restores a
 *    wall of text under a cast of nobody.
 *
 * And the scenario store must satisfy `ScenarioStorePort` exactly, because the
 * shared ScenarioPanel is not being changed to accommodate it.
 *
 * Invented people — this repo is public.
 */
const post = jest.fn()
const get = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, delete: del }) }))

import { useSavedRuns, useTeamScenarioStore } from "../useSavedRuns"

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return wrapper
}

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: { id: "a-1" } } })
  get.mockReset().mockResolvedValue({ data: { data: { analyses: [] } } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

describe("useSavedRuns", () => {
  it("keeps the document in content and what re-opens it in inputs", async () => {
    const { result } = renderHook(
      () => useSavedRuns("m-1", "compare", "Comparison"),
      { wrapper: harness() },
    )
    await result.current.save.run({
      title: "Dana Whitfield vs Rowan Escobar",
      body: "## Friction and fit",
      subjectIds: [],
      subjectNames: ["Dana Whitfield", "Rowan Escobar"],
      notice: "Generated from scores on file.",
    })
    expect(post).toHaveBeenCalledWith("/v1/growth/members/m-1/analyses", {
      kind: "compare",
      title: "Dana Whitfield vs Rowan Escobar",
      content: "## Friction and fit",
      inputs: {
        subjectIds: [],
        subjectNames: ["Dana Whitfield", "Rowan Escobar"],
        notice: "Generated from scores on file.",
      },
    })
  })

  it("reports a failed read as a failure, so no panel says 'Nothing kept yet.'", async () => {
    get.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(
      () => useSavedRuns("m-1", "analyse", "Behavioural write-up"),
      { wrapper: harness() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.runs).toBeUndefined()
  })

  it("narrows to its own kind", async () => {
    get.mockResolvedValue({
      data: {
        data: {
          analyses: [
            { id: "w", memberId: "m-1", kind: "analyse", content: "w", title: "W" },
            { id: "c", memberId: "m-1", kind: "compare", content: "c", title: "C" },
          ],
        },
      },
    })
    const { result } = renderHook(
      () => useSavedRuns("m-1", "compare", "Comparison"),
      { wrapper: harness() },
    )
    await waitFor(() => expect(result.current.runs).toBeDefined())
    expect(result.current.runs?.map((r) => r.id)).toEqual(["c"])
  })
})

describe("useTeamScenarioStore", () => {
  const body = {
    profile_ids: ["m-1", "m-2"],
    title: "The Q3 handover",
    situation: "A deadline has moved forward by two weeks.",
    character_names: ["Dana Whitfield", "Rowan Escobar"],
    result: {
      individual: { "m-1": "asks for the detail", "m-2": "pushes for a decision" },
      collaborative: "they converge",
    },
  }

  /**
   * The heading for each section comes from `character_names` at the SAME index
   * as `profile_ids`, which is the order the panel built the run in. A heading
   * resolved by looking the id up somewhere else would silently caption one
   * colleague's read with another's name.
   */
  it("stitches one readable document, in cast order, with the group read last", async () => {
    const { result } = renderHook(() => useTeamScenarioStore("m-1"), { wrapper: harness() })
    await result.current.save.run(body)
    const sent = post.mock.calls[0][1]
    expect(sent.kind).toBe("scenario")
    expect(sent.content).toBe(
      "## Dana Whitfield\n\nasks for the detail\n\n" +
        "## Rowan Escobar\n\npushes for a decision\n\n" +
        "## Together\n\nthey converge",
    )
  })

  it("keeps the situation and the per-person sections so 'Open' replays it", async () => {
    const { result } = renderHook(() => useTeamScenarioStore("m-1"), { wrapper: harness() })
    await result.current.save.run(body)
    expect(post.mock.calls[0][1].inputs).toEqual({
      subjectIds: ["m-1", "m-2"],
      subjectNames: ["Dana Whitfield", "Rowan Escobar"],
      situation: "A deadline has moved forward by two weeks.",
      result: {
        individual: { "m-1": "asks for the detail", "m-2": "pushes for a decision" },
        collaborative: "they converge",
      },
    })
  })

  it("omits a group section that was never generated rather than writing an empty heading", async () => {
    const { result } = renderHook(() => useTeamScenarioStore("m-1"), { wrapper: harness() })
    await result.current.save.run({ ...body, result: { individual: { "m-1": "only me" } } })
    expect(post.mock.calls[0][1].content).not.toMatch(/## Together/)
  })

  it("lists kept runs in the shape the shared panel replays", async () => {
    get.mockResolvedValue({
      data: {
        data: {
          analyses: [
            {
              id: "s-1",
              memberId: "m-1",
              kind: "scenario",
              title: "The Q3 handover",
              content: "doc",
              inputs: {
                subjectIds: ["m-1"],
                subjectNames: ["Dana Whitfield"],
                situation: "A deadline moved.",
                result: { individual: { "m-1": "asks" }, collaborative: "they converge" },
              },
              createdAt: "2026-09-20T10:00:00Z",
            },
          ],
        },
      },
    })
    const { result } = renderHook(() => useTeamScenarioStore("m-1"), { wrapper: harness() })
    await waitFor(() => expect(result.current.scenarios).toBeDefined())
    expect(result.current.scenarios?.[0]).toMatchObject({
      id: "s-1",
      title: "The Q3 handover",
      situation: "A deadline moved.",
      character_ids: ["m-1"],
      character_names: ["Dana Whitfield"],
    })
  })

  /**
   * The port is optional on ScenarioPanel, so an incomplete store type-checks
   * as `{store}` and then renders a "Keep this run" button that does nothing.
   * That is the exact defect the panel's "no store" comment was guarding
   * against, so the shape is asserted rather than assumed.
   */
  it("satisfies the port completely — and reports isError, which the panel needs", async () => {
    get.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useTeamScenarioStore("m-1"), { wrapper: harness() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(typeof result.current.save.run).toBe("function")
    expect(typeof result.current.remove.run).toBe("function")
    expect(result.current.scenarios).toBeUndefined()
  })
})
