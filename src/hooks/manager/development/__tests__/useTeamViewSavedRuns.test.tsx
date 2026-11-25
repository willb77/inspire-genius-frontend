/** @jest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

/**
 * U5 — the Team view's saved runs, on the existing per-member store.
 *
 * Decision D2: runs belong to the Team view, and runs already kept on a member
 * stay on that member. The store is not changed, so a Team-view run is filed
 * under the first person in it and marked `origin: "team-view"`. Guards here:
 *   - a run naming a person the caller cannot pick is refused before any POST;
 *   - nothing kept on a member page appears in, or is changed by, the Team view;
 *   - a delete goes to the URL the row was listed under.
 *
 * Invented people — this repo is public.
 */
const post = jest.fn()
const get = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, delete: del }) }))

import {
  TEAM_VIEW_ORIGIN,
  useTeamViewSavedRuns,
  useTeamViewScenarioStore,
} from "../useSavedRuns"
import { NotSharedError } from "../useTeamCast"

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const PICKABLE = ["m-1", "m-2"]
const cast = { pickableIds: PICKABLE, isPickable: (id: string) => PICKABLE.includes(id) }
const NOT_SHARED = "Not shared with you."

const row = (id: string, memberId: string, kind: string, inputs: Record<string, unknown>, createdAt: string) => ({
  id,
  memberId,
  kind,
  title: `Run ${id}`,
  content: "Body",
  inputs,
  createdAt,
})

const rowsFor: Record<string, unknown[]> = {
  "m-1": [
    row("team-1", "m-1", "compare", { subjectIds: ["m-1", "m-2"], subjectNames: ["Dana", "Rowan"], origin: TEAM_VIEW_ORIGIN }, "2026-11-20T10:00:00Z"),
    // Kept on Dana's page before U5: no origin. Must NOT be pulled into the Team view.
    row("member-1", "m-1", "compare", { subjectIds: [], subjectNames: ["Dana", "Rowan"] }, "2026-11-01T10:00:00Z"),
    row("team-s-1", "m-1", "scenario", { subjectIds: ["m-1"], subjectNames: ["Dana"], origin: TEAM_VIEW_ORIGIN }, "2026-11-19T10:00:00Z"),
  ],
  "m-2": [
    row("team-2", "m-2", "compare", { subjectIds: ["m-2", "m-1"], subjectNames: ["Rowan", "Dana"], origin: TEAM_VIEW_ORIGIN }, "2026-11-22T10:00:00Z"),
  ],
}

beforeEach(() => {
  post.mockReset().mockResolvedValue({ data: { data: { id: "new-1" } } })
  get.mockReset().mockImplementation(async (url: string) => {
    const id = url.split("/")[4]
    return { data: { data: { analyses: rowsFor[id] ?? [] } } }
  })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

describe("useTeamViewSavedRuns", () => {
  it("lists only Team-view rows of the kind, newest first, across the people it can pick", async () => {
    const { result } = renderHook(
      () => useTeamViewSavedRuns(cast, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.runs).toBeDefined())
    expect(result.current.runs?.map((r) => r.id)).toEqual(["team-2", "team-1"])
    expect(get).toHaveBeenCalledWith("/v1/growth/members/m-1/analyses")
    expect(get).toHaveBeenCalledWith("/v1/growth/members/m-2/analyses")
    expect(result.current.filedUnder("team-2")).toBe("m-2")
  })

  it("files a new run under the first person in it, marked as a Team-view run", async () => {
    const { result } = renderHook(
      () => useTeamViewSavedRuns(cast, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    await act(() =>
      result.current.save.run({
        title: "Rowan vs Dana",
        body: "## Fit",
        subjectIds: ["m-2", "m-1"],
        subjectNames: ["Rowan", "Dana"],
        notice: "n",
      }),
    )
    expect(post).toHaveBeenCalledWith("/v1/growth/members/m-2/analyses", {
      kind: "compare",
      title: "Rowan vs Dana",
      content: "## Fit",
      inputs: {
        subjectIds: ["m-2", "m-1"],
        subjectNames: ["Rowan", "Dana"],
        notice: "n",
        origin: TEAM_VIEW_ORIGIN,
      },
    })
  })

  it("refuses a run that names a person the caller cannot pick, before any request", async () => {
    const { result } = renderHook(
      () => useTeamViewSavedRuns(cast, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    for (const ids of [["m-1", "m-9"], ["m-9", "m-1"], []]) {
      await expect(
        result.current.save.run({ title: "t", body: "b", subjectIds: ids, subjectNames: [], notice: "" }),
      ).rejects.toThrow(NotSharedError)
    }
    expect(post).not.toHaveBeenCalled()
  })

  it("deletes through the member the row was listed under", async () => {
    const { result } = renderHook(
      () => useTeamViewSavedRuns(cast, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.runs).toBeDefined())
    await act(() => result.current.remove.run("team-2"))
    expect(del).toHaveBeenCalledWith("/v1/growth/members/m-2/analyses/team-2")
  })

  it("reports one failed read as an error, not as a shorter list", async () => {
    get.mockImplementation(async (url: string) => {
      if (url.includes("m-2")) throw new Error("boom")
      return { data: { data: { analyses: rowsFor["m-1"] } } }
    })
    const { result } = renderHook(
      () => useTeamViewSavedRuns(cast, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.runs).toBeUndefined()
  })

  it("reads nothing when nobody can be picked", () => {
    const { result } = renderHook(
      () => useTeamViewSavedRuns({ pickableIds: [], isPickable: () => false }, "compare", "Comparison", NOT_SHARED),
      { wrapper: wrapper() },
    )
    expect(get).not.toHaveBeenCalled()
    expect(result.current.runs).toEqual([])
  })
})

describe("useTeamViewScenarioStore", () => {
  it("lists Team-view scenarios and refuses a cast with a not-shared person", async () => {
    const { result } = renderHook(() => useTeamViewScenarioStore(cast, NOT_SHARED), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.scenarios).toBeDefined())
    expect(result.current.scenarios?.map((s) => s.id)).toEqual(["team-s-1"])

    await expect(
      result.current.save.run({
        profile_ids: ["m-1", "m-9"],
        title: "Handover",
        situation: "s",
        character_names: ["Dana", "Someone"],
        result: { collaborative: "c" },
      }),
    ).rejects.toThrow(NotSharedError)
    expect(post).not.toHaveBeenCalled()

    await act(() =>
      result.current.save.run({
        profile_ids: ["m-1"],
        title: "Handover",
        situation: "s",
        character_names: ["Dana"],
        result: { individual: { "m-1": "i" }, collaborative: "c" },
      }),
    )
    expect(post).toHaveBeenCalledWith(
      "/v1/growth/members/m-1/analyses",
      expect.objectContaining({
        kind: "scenario",
        inputs: expect.objectContaining({ origin: TEAM_VIEW_ORIGIN, subjectIds: ["m-1"] }),
      }),
    )
  })
})
