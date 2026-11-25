/** @jest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { ComparePort, ScenarioPort } from "@/components/prism/studio/ports"

/**
 * U5 guards, end to end through the real hooks (only HTTP and the shared
 * panels are stubbed):
 *
 *  1. A run already kept on a member is still listed on that member's page,
 *     and the Team view neither lists it nor touches it (decision D2).
 *  2. A person who does not share PRISM with the caller is not offered by the
 *     Team view's picker, and a comparison naming them is refused before any
 *     score is read.
 *
 * Invented people — this repo is public.
 */

const get = jest.fn()
const post = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ get, post, delete: del }) }))

const received: { compare?: ComparePort; scenario?: ScenarioPort } = {}
jest.mock("@/components/prism/studio/ComparePanel", () => ({
  __esModule: true,
  default: ({ port }: { port: ComparePort }) => {
    received.compare = port
    return <div data-testid="compare-panel" />
  },
}))
jest.mock("@/components/prism/studio/ScenarioPanel", () => ({
  __esModule: true,
  default: ({ port }: { port: ScenarioPort }) => {
    received.scenario = port
    return <div data-testid="scenario-panel" />
  },
}))
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

import { TeamComparePanel, TeamViewComparePanel } from "../TeamComparePanel"
import { TeamScenarioPanel, TeamViewScenarioPanel } from "../TeamScenarioPanel"

const ROSTER = [
  {
    memberId: "m-dana",
    name: "Dana Whitfield",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    sharing: { state: "granted", grantedCategories: ["prism"], canRequest: false },
  },
  {
    memberId: "m-rowan",
    name: "Rowan Escobar",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    sharing: { state: "granted", grantedCategories: ["prism"], canRequest: false },
  },
  {
    memberId: "m-priya",
    name: "Priya Lindqvist",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    sharing: { state: "none", grantedCategories: [], canRequest: true },
  },
  {
    memberId: "m-tomas",
    name: "Tomas Aguirre",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "no_plan",
    sharing: null,
  },
]

/** Kept on Dana's page before U5 — no origin marker. */
const OLD_COMPARE = {
  id: "old-compare",
  memberId: "m-dana",
  kind: "compare",
  title: "Dana Whitfield vs Priya Lindqvist",
  content: "## Where they diverge",
  inputs: { subjectIds: [], subjectNames: ["Dana Whitfield", "Priya Lindqvist"], notice: "" },
  createdAt: "2026-10-01T10:00:00Z",
}
const OLD_SCENARIO = {
  id: "old-scenario",
  memberId: "m-dana",
  kind: "scenario",
  title: "The Q3 handover",
  content: "## Dana Whitfield\n\nPlans first.",
  inputs: { subjectIds: ["m-dana"], subjectNames: ["Dana Whitfield"], situation: "s", result: { individual: { "m-dana": "Plans first." }, collaborative: "" } },
  createdAt: "2026-10-02T10:00:00Z",
}

function routeGet(url: string) {
  if (url === "/v1/growth/roster") return { data: { data: ROSTER } }
  if (url === "/v1/growth/members/m-dana/analyses") {
    return { data: { data: { analyses: [OLD_SCENARIO, OLD_COMPARE] } } }
  }
  if (/\/v1\/growth\/members\/[^/]+\/analyses$/.test(url)) return { data: { data: { analyses: [] } } }
  if (url.endsWith("/dossier")) return { status: 200, data: { data: { member: { name: "x" }, profile: { prism: [] } } } }
  if (url.endsWith("/profile")) return { data: { data: null } }
  throw new Error(`unexpected GET ${url}`)
}

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  received.compare = undefined
  received.scenario = undefined
  get.mockReset().mockImplementation(async (url: string) => routeGet(url))
  post.mockReset()
  del.mockReset()
})

describe("U5 guard — a member-scoped run still lists on its member", () => {
  it("the member page's Compare lists the comparison kept there before the Team view", async () => {
    renderWith(<TeamComparePanel memberId="m-dana" memberName="Dana Whitfield" />)
    expect(await screen.findByText("Dana Whitfield vs Priya Lindqvist")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/v1/growth/members/m-dana/analyses")
  })

  it("the member page's Scenarios lists the scenario kept there before the Team view", async () => {
    renderWith(<TeamScenarioPanel memberId="m-dana" />)
    await waitFor(() => expect(received.scenario?.store?.scenarios).toBeDefined())
    expect(received.scenario?.store?.scenarios?.map((s) => s.id)).toEqual(["old-scenario"])
  })

  it("the Team view does not list, move or delete a member-page run", async () => {
    renderWith(<TeamViewComparePanel />)
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/v1/growth/members/m-dana/analyses"),
    )
    expect(await screen.findByText("Nothing kept yet.")).toBeInTheDocument()
    expect(screen.queryByText("Dana Whitfield vs Priya Lindqvist")).not.toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })
})

describe("U5 guard — a not-shared person cannot be added", () => {
  it("the Team view's Compare picker offers only people who share PRISM with the caller", async () => {
    renderWith(<TeamViewComparePanel />)
    await waitFor(() => expect(received.compare?.cast.subjects).toBeDefined())
    expect(received.compare?.cast.subjects?.map((s) => s.id)).toEqual(["m-dana", "m-rowan"])
    // Says out loud that two people with PRISM were left out.
    const note = await screen.findByTestId("team-view-not-shared")
    expect(within(note).getByText(/2 people with/)).toBeInTheDocument()
  })

  it("a comparison naming a not-shared person is refused before any score is read", async () => {
    renderWith(<TeamViewComparePanel />)
    await waitFor(() => expect(received.compare?.cast.subjects?.length).toBe(2))
    for (const other of ["m-priya", "m-tomas"]) {
      await expect(received.compare!.compare.run(["m-dana", other], 0)).rejects.toThrow(
        /does not share their PRISM with you/,
      )
    }
    expect(get.mock.calls.map(([u]) => u).filter((u: string) => u.endsWith("/dossier") || u.endsWith("/profile"))).toEqual([])
  })

  it("the Team view's Scenarios picker offers only shared people and refuses the rest", async () => {
    renderWith(<TeamViewScenarioPanel />)
    await waitFor(() => expect(received.scenario?.cast.subjects).toBeDefined())
    expect(received.scenario?.cast.subjects?.map((s) => s.id)).toEqual(["m-dana", "m-rowan"])
    await expect(
      received.scenario!.run.run(["m-dana", "m-priya"], "A deadline moved.", "m-dana"),
    ).rejects.toThrow(/does not share their PRISM with you/)
    await expect(
      received.scenario!.store!.save.run({
        profile_ids: ["m-tomas"],
        title: "t",
        situation: "s",
        character_names: ["Tomas Aguirre"],
        result: { collaborative: "c" },
      }),
    ).rejects.toThrow(/does not share their PRISM with you/)
    expect(post).not.toHaveBeenCalled()
  })
})
