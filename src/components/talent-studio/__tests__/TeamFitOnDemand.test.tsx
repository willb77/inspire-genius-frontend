/**
 * @jest-environment jsdom
 *
 * TS-4b — Team fit: score a team member against a chosen role, on demand.
 *
 * Off by default, so what the page does when it is NOT offered matters most.
 * Pinned here through the real page and the real hooks, with only the HTTP
 * calls stubbed:
 *
 *   1. Switch off, or a backend without the route (404): no picker, no
 *      section, no score request, and the page still says nothing is scored.
 *   2. A failed role read is an alert with a retry. It is never a hidden
 *      picker and never something that reads as "no fit".
 *   3. Offered: the picker lists the server's roles; opening the row scores
 *      nobody; one click sends one request carrying the member and the role
 *      only (no viewer).
 *   4. A score shows the role and the number. No tier, fit band, base tier or
 *      classification reaches the screen even when the response carries them.
 *   5. A failed score is an alert that says it is not a zero.
 *   6. The page stops saying "nothing is scored here" once scoring is offered.
 *
 * Every name, title and id below is invented.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"

jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => Promise.resolve(true),
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))

jest.mock("@/constants/teamFit", () => ({
  TEAM_FIT_BUILD_ENABLED: true,
  TEAM_FIT_PAGE_SIZE: 25,
}))

const mockRoster = jest.fn()
const mockFitMatches = jest.fn()
const mockRoles = jest.fn()
const mockScore = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  getTeamDevelopmentRoster: () => mockRoster(),
  getMemberFitMatches: (memberId: string) => mockFitMatches(memberId),
  getMemberFitOnDemandRoles: (memberId: string) => mockRoles(memberId),
  scoreMemberFitOnDemand: (...args: unknown[]) => mockScore(...args),
}))

import TeamFitBody from "../TeamFitBody"

const coverage = { prism: true, clifton: false, disc: false }
const ROSTER = [
  { memberId: "member-0001", name: "Ada Example", title: "Sample Analyst", coverage, planStatus: "no_plan" },
  { memberId: "member-0002", name: "Dee Placeholder", title: "Sample Engineer", coverage, planStatus: "no_plan" },
]
const ROLES = [
  { jobId: "job-a", roleTitle: "Invented Role One" },
  { jobId: "job-b", roleTitle: "Invented Role Two" },
]
/** Fields the server withholds. Here to prove the page would not draw them if they arrived. */
const WITHHELD = {
  tier: "TIER-SENTINEL-strong",
  baseTier: "BASETIER-SENTINEL-good",
  fitBand: "BAND-SENTINEL-high",
  classification: "CLASS-SENTINEL-stretch",
}
const SENTINELS = /SENTINEL/

const envelope = (data: unknown) => Promise.resolve({ data: { data } })
const httpError = (status: number) => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { response: { status } }))
const NO_SNAPSHOT = { state: "no_snapshot", matches: [], asOf: null, ageDays: null }
const INTRO_OFF = /Nothing is scored here\./
const INTRO_ON = /you can also score a member against a role you choose/

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const view = render(<TeamFitBody audience="manager" />, { wrapper })
  await act(async () => {})
  return view
}

async function openRow(name: string): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole("button", { name: `Show matches for ${name}` }))
  const row = screen.getByText(name).closest("li") as HTMLElement
  await waitFor(() => expect(within(row).queryByText("Loading matches…")).toBeNull())
  await waitFor(() => expect(mockRoles).toHaveBeenCalled())
  await act(async () => {})
  return row
}

function section(row: HTMLElement): HTMLElement | null {
  return row.querySelector("[data-team-fit-on-demand]")
}

async function choose(row: HTMLElement, name: string, roleTitle: string) {
  const select = within(row).getByLabelText(`Role to score ${name} against`) as HTMLSelectElement
  const option = within(select).getByRole("option", { name: roleTitle }) as HTMLOptionElement
  fireEvent.change(select, { target: { value: option.value } })
}

beforeEach(() => {
  mockRoster.mockReset().mockImplementation(() => envelope(ROSTER))
  mockFitMatches.mockReset().mockImplementation(() => envelope(NO_SNAPSHOT))
  mockRoles.mockReset().mockImplementation(() => envelope({ state: "ok", roles: ROLES }))
  mockScore.mockReset().mockImplementation(() =>
    envelope({
      state: "ok",
      result: { jobId: "job-b", roleTitle: "Invented Role Two", fitScore: 73, dimensionsEvaluated: 22, dimensionsTotal: 22 },
    }),
  )
})

describe("TS-4b — not offered: the page is TS-4a", () => {
  it.each([
    ["the switch off", () => envelope({ state: "off", roles: [] })],
    ["a backend without the route (404)", () => httpError(404)],
  ])("with %s there is no picker, no section and no score request", async (_name, answer) => {
    mockRoles.mockImplementation(answer)
    await mount()
    const row = await openRow("Ada Example")
    expect(section(row)).toBeNull()
    expect(within(row).queryByRole("combobox")).toBeNull()
    expect(within(row).queryByText(/Score against a role/)).toBeNull()
    expect(within(row).queryByRole("alert")).toBeNull()
    expect(mockScore).not.toHaveBeenCalled()
    // The page still says, truthfully, that nothing is scored.
    expect(screen.getByText(INTRO_OFF)).toBeInTheDocument()
    expect(screen.queryByText(INTRO_ON)).toBeNull()
    expect(within(row).getByText(/Nothing is scored from this page\./)).toBeInTheDocument()
  })

  it("opening the page asks for nobody's roles; opening a row asks for that member only", async () => {
    await mount()
    await screen.findByText("Ada Example")
    expect(mockRoles).not.toHaveBeenCalled()
    await openRow("Dee Placeholder")
    expect(mockRoles.mock.calls).toEqual([["member-0002"]])
  })
})

describe("TS-4b — a failed role read is an error, never a hidden picker", () => {
  it.each([
    ["a server error", () => httpError(500)],
    ["a refusal", () => httpError(403)],
    ["a network failure", () => Promise.reject(new Error("network down"))],
    ["the server saying its own read failed", () => envelope({ state: "unavailable", roles: [] })],
    ["a response with no state", () => envelope({})],
  ])("%s is an alert with a retry", async (_name, answer) => {
    mockRoles.mockImplementation(answer)
    await mount()
    const row = await openRow("Ada Example")
    const alert = within(row).getByRole("alert")
    expect(alert).toHaveTextContent("We could not check whether you can score Ada Example against a role.")
    expect(section(row)?.getAttribute("data-team-fit-on-demand")).toBe("error")
    expect(within(row).queryByRole("combobox")).toBeNull()
    expect(within(row).queryByText(/Match score/)).toBeNull()

    mockRoles.mockImplementation(() => envelope({ state: "ok", roles: ROLES }))
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    expect(await within(row).findByRole("combobox")).toBeInTheDocument()
  })
})

describe("TS-4b — offered", () => {
  it("lists the server's roles, and opening the row scores nobody", async () => {
    await mount()
    const row = await openRow("Ada Example")
    expect(section(row)?.getAttribute("data-team-fit-on-demand")).toBe("ok")
    const select = within(row).getByLabelText("Role to score Ada Example against")
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Choose a role…",
      "Invented Role One",
      "Invented Role Two",
    ])
    // Says, before any click, that a record is kept and the member is told.
    expect(within(row).getByText(/A record is kept, and Ada Example is told/)).toBeInTheDocument()
    expect(within(row).getByRole("button", { name: "Score Ada Example for this role" })).toBeDisabled()
    expect(mockScore).not.toHaveBeenCalled()
  })

  it("one click sends one request: the member and the role, and no viewer", async () => {
    await mount()
    const row = await openRow("Ada Example")
    await choose(row, "Ada Example", "Invented Role Two")
    fireEvent.click(within(row).getByRole("button", { name: "Score Ada Example for this role" }))
    await within(row).findByText("Match score 73%")
    expect(mockScore.mock.calls).toEqual([["member-0001", "job-b"]])
  })

  it("shows the role and the score, and none of the withheld fields even if sent", async () => {
    mockScore.mockImplementation(() =>
      envelope({
        state: "ok",
        ...WITHHELD,
        result: {
          jobId: "job-b", roleTitle: "Invented Role Two", fitScore: 73.4,
          dimensionsEvaluated: 8, dimensionsTotal: 22, ...WITHHELD,
        },
      }),
    )
    await mount()
    const row = await openRow("Ada Example")
    await choose(row, "Ada Example", "Invented Role Two")
    fireEvent.click(within(row).getByRole("button", { name: "Score Ada Example for this role" }))
    const result = await waitFor(() => {
      const el = row.querySelector('[data-team-fit-on-demand-result="ok"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(result).toHaveTextContent("Invented Role Two")
    expect(result).toHaveTextContent("Match score 73%")
    expect(result).toHaveTextContent("8 of 22 dimensions measured")
    expect(result).toHaveTextContent("It is not added to Ada Example's own fit reports")
    // The populated control: the sentinels were in the response.
    expect(document.body.textContent).not.toMatch(SENTINELS)
    expect(document.body.textContent).not.toMatch(/tier|fit band/i)
  })

  it("the page stops saying nothing is scored once scoring is offered", async () => {
    await mount()
    expect(await screen.findByText(INTRO_OFF)).toBeInTheDocument()
    const row = await openRow("Ada Example")
    expect(await screen.findByText(INTRO_ON)).toBeInTheDocument()
    expect(screen.queryByText(INTRO_OFF)).toBeNull()
    expect(within(row).queryByText(/Nothing is scored from this page/)).toBeNull()
    expect(within(row).getByText(/has not opened their own Career Fit matches yet/)).toBeInTheDocument()
  })

  it("with no role both can see, it says so and offers no button", async () => {
    mockRoles.mockImplementation(() => envelope({ state: "ok", roles: [] }))
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText(/There is no published role that both you and Ada Example can see/)).toBeInTheDocument()
    expect(within(row).queryByRole("combobox")).toBeNull()
    expect(within(row).queryByRole("button", { name: /Score Ada Example/ })).toBeNull()
  })
})

describe("TS-4b — a score that did not happen is never a number", () => {
  it.each([
    ["the request failing", () => httpError(500)],
    ["the server saying it failed", () => envelope({ state: "unavailable", result: null })],
    ["an ok with no score in it", () => envelope({ state: "ok", result: null })],
    ["a response with no state", () => envelope({})],
  ])("%s is an alert that says it is not a zero", async (_name, answer) => {
    mockScore.mockImplementation(answer)
    await mount()
    const row = await openRow("Ada Example")
    await choose(row, "Ada Example", "Invented Role One")
    fireEvent.click(within(row).getByRole("button", { name: "Score Ada Example for this role" }))
    const alert = await within(row).findByRole("alert")
    expect(alert).toHaveTextContent("Ada Example could not be scored just now. That is not a score of zero.")
    expect(within(row).queryByText(/Match score/)).toBeNull()
    expect(row.querySelector('[data-team-fit-on-demand-result="ok"]')).toBeNull()
    expect(mockScore).toHaveBeenCalledTimes(1) // never retried on its own
  })

  it.each([
    ["not_shared", /needs Ada Example to have shared both their PRISM profile and Development with you/],
    ["role_not_available", /That role can no longer be scored for Ada Example/],
    ["off", /not switched on for Ada Example's organization/],
    ["no_prism", /Ada Example has no PRISM profile on file yet/],
    ["a_state_from_the_future", /Scoring Ada Example against a role is not available right now/],
  ])("the server answering %s is said in its own words, with no score", async (state, sentence) => {
    mockScore.mockImplementation(() => envelope({ state, result: null }))
    await mount()
    const row = await openRow("Ada Example")
    await choose(row, "Ada Example", "Invented Role One")
    fireEvent.click(within(row).getByRole("button", { name: "Score Ada Example for this role" }))
    // By text content: the word PRISM is its own element (house style).
    const said = await waitFor(() => {
      const el = row.querySelector(`[data-team-fit-on-demand-result="${state}"]`)
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(said.textContent).toMatch(sentence)
    expect(within(row).queryByRole("alert")).toBeNull()
    expect(within(row).queryByText(/Match score/)).toBeNull()
  })
})

describe("TS-4b — a reason is said once", () => {
  it("not shared for both reads draws the matches notice only", async () => {
    const notShared = { state: "not_shared", missingCategories: ["prism", "development"] }
    mockFitMatches.mockImplementation(() => envelope({ ...notShared, matches: [], asOf: null, ageDays: null }))
    mockRoles.mockImplementation(() => envelope({ ...notShared, roles: [] }))
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText("Not shared")).toBeInTheDocument()
    expect(section(row)).toBeNull()
  })

  it("not shared for scoring alone (matches are shown) is said, with no picker", async () => {
    mockFitMatches.mockImplementation(() =>
      envelope({ state: "ok", asOf: null, ageDays: null, matches: [{ rank: 1, roleTitle: "Invented Role One", jobId: "job-a", fitScore: 82 }] }),
    )
    mockRoles.mockImplementation(() => envelope({ state: "not_shared", roles: [], missingCategories: ["prism", "development"] }))
    await mount()
    const row = await openRow("Ada Example")
    expect(section(row)?.getAttribute("data-team-fit-on-demand")).toBe("not_shared")
    expect(within(row).getByText(/needs Ada Example to have shared both/)).toBeInTheDocument()
    expect(within(row).queryByRole("combobox")).toBeNull()
  })
})
