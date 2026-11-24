/**
 * @jest-environment jsdom
 *
 * TS-4a — Team fit: the matches team members already have, shown honestly.
 *
 * The page reads other people's data, so what it must NOT do matters as much
 * as what it does. Pinned here, through the real hooks with only the two HTTP
 * calls stubbed:
 *
 *   1. Opening the page asks for the roster once and for nobody's matches.
 *      Matches are requested for one member, when the viewer opens that row.
 *   2. "Not shared" is its own state: not an empty list, not a zero, not "no
 *      matches yet".
 *   3. No tier, fit band, base tier or classification reaches the screen, even
 *      when the response carries them (the populated control).
 *   4. The member link sits under the audience's own prefix.
 *   5. A failed load is an alert with a retry, never an empty state.
 *   6. With `job_fit_v2` off, or the build flags off, the page requests nothing.
 *
 * Every name, title and id below is invented.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { hasAccess } from "@/types/roles"

let mockSwitch: "on" | "off" | "error" = "on"
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () =>
    mockSwitch === "error" ? Promise.reject(new Error("status unreadable")) : Promise.resolve(mockSwitch === "on"),
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))

let mockTeamFitBuild = true
jest.mock("@/constants/teamFit", () => ({
  get TEAM_FIT_BUILD_ENABLED() {
    return mockTeamFitBuild
  },
  TEAM_FIT_PAGE_SIZE: 25,
}))

const mockRoster = jest.fn()
const mockFitMatches = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  getTeamDevelopmentRoster: () => mockRoster(),
  getMemberFitMatches: (memberId: string) => mockFitMatches(memberId),
}))

import TeamFitBody from "../TeamFitBody"

// ── Invented fixtures ────────────────────────────────────────────────────────
const coverage = { prism: true, clifton: false, disc: false }
const ROSTER = [
  {
    memberId: "member-0001",
    name: "Ada Example",
    title: "Sample Analyst",
    coverage,
    planStatus: "no_plan",
    // The dossier's older, LLM-proposed match. Team fit must not draw it.
    topMatch: { title: "ROSTER-TOPMATCH-SENTINEL", fitScore: 77 },
  },
  { memberId: "member-0002", name: "Ben Placeholder", title: "Sample Engineer", coverage, planStatus: "no_plan" },
  { memberId: "member-0003", name: "Cy Fixture", coverage, planStatus: "no_plan" },
]

/** Fields the server withholds today. Here to prove the page would not draw them if they arrived. */
const WITHHELD = {
  tier: "TIER-SENTINEL-strong",
  baseTier: "BASETIER-SENTINEL-good",
  fitBand: "BAND-SENTINEL-high",
  classification: "CLASS-SENTINEL-stretch",
}
const OK_WITH_WITHHELD_FIELDS = {
  state: "ok",
  asOf: "2026-10-02T09:00:00Z",
  ageDays: 3,
  tier: "TIER-SENTINEL-envelope",
  fitBand: "BAND-SENTINEL-envelope",
  matches: [
    { rank: 1, roleTitle: "Invented Role One", jobId: "job-a", fitScore: 82, ...WITHHELD },
    { rank: 2, roleTitle: "Invented Role Two", jobId: "job-b", fitScore: 64, dimensionsEvaluated: 8, dimensionsTotal: 22, ...WITHHELD },
  ],
}

const envelope = (data: unknown) => Promise.resolve({ data: { data } })

async function mount(audience: "manager" | "practitioner" = "manager") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const view = render(<TeamFitBody audience={audience} />, { wrapper })
  await act(async () => {})
  return view
}

/** Open one member's row, wait for its answer, and return that row. */
async function openRow(name: string): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole("button", { name: `Show matches for ${name}` }))
  const row = screen.getByText(name).closest("li") as HTMLElement
  await waitFor(() => expect(within(row).queryByText("Loading matches…")).toBeNull())
  return row
}

beforeEach(() => {
  mockSwitch = "on"
  mockTeamFitBuild = true
  mockRoster.mockReset().mockImplementation(() => envelope(ROSTER))
  mockFitMatches.mockReset().mockImplementation(() => envelope(OK_WITH_WITHHELD_FIELDS))
})

describe("TS-4a — what the page requests", () => {
  it("opening the page asks for the roster once and for nobody's matches", async () => {
    await mount()
    expect(await screen.findByText("Ada Example")).toBeInTheDocument()
    expect(screen.getByText("Ben Placeholder")).toBeInTheDocument()
    expect(screen.getByText("Cy Fixture")).toBeInTheDocument()
    expect(mockRoster).toHaveBeenCalledTimes(1)
    expect(mockFitMatches).not.toHaveBeenCalled()
  })

  it("opening one member asks for that member only, once", async () => {
    await mount()
    await openRow("Ben Placeholder")
    expect(mockFitMatches.mock.calls).toEqual([["member-0002"]])
    // Closing and reopening inside the cache window does not ask again.
    fireEvent.click(screen.getByRole("button", { name: "Hide matches for Ben Placeholder" }))
    await openRow("Ben Placeholder")
    expect(mockFitMatches).toHaveBeenCalledTimes(1)
    expect(mockRoster).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["job_fit_v2 off", () => (mockSwitch = "off")],
    ["job_fit_v2 unreadable", () => (mockSwitch = "error")],
    ["the build flags off", () => (mockTeamFitBuild = false)],
  ])("with %s the page says it is not switched on and requests nothing", async (_name, turnOff) => {
    turnOff()
    await mount()
    expect(await screen.findByText("Team fit is not switched on for your organization.")).toBeInTheDocument()
    expect(screen.queryByText("Ada Example")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(mockRoster).not.toHaveBeenCalled()
    expect(mockFitMatches).not.toHaveBeenCalled()
  })

  it("the control: with both halves on, the same mount does request the roster", async () => {
    await mount()
    await screen.findByText("Ada Example")
    expect(mockRoster).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Team fit is not switched on for your organization.")).toBeNull()
  })
})

describe("TS-4a — each state says what it is", () => {
  it("not shared is its own state: no list, no score, and not 'no matches yet'", async () => {
    mockFitMatches.mockImplementation(() =>
      envelope({ state: "not_shared", matches: [], asOf: null, ageDays: null, missingCategories: ["prism", "development"] }),
    )
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText("Not shared")).toBeInTheDocument()
    expect(
      within(row).getByText(/Ada Example has not shared their PRISM profile or Development with you/),
    ).toBeInTheDocument()
    expect(row.querySelector('[data-team-fit-state="not_shared"]')).not.toBeNull()
    // Not an empty list, not a zero, not the "nothing there" wording.
    expect(within(row).queryByRole("list")).toBeNull()
    expect(within(row).queryAllByRole("listitem")).toEqual([])
    expect(within(row).queryByText(/No matches yet/)).toBeNull()
    expect(within(row).queryByText(/Match score/)).toBeNull()
    expect(row.textContent).not.toMatch(/\d/)
    expect(within(row).queryByRole("alert")).toBeNull()
  })

  it.each([
    [["development"], /has not shared Development with you/],
    [["prism"], /has not shared their PRISM profile with you/],
    [[], /has not shared their role matches with you/],
  ])("not shared names what is missing: %j", async (missingCategories, sentence) => {
    mockFitMatches.mockImplementation(() =>
      envelope({ state: "not_shared", matches: [], asOf: null, ageDays: null, missingCategories }),
    )
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText("Not shared")).toBeInTheDocument()
    expect(within(row).getByText(sentence)).toBeInTheDocument()
  })

  it("a member who has not run their own matches reads 'No matches yet', not 'Not shared'", async () => {
    mockFitMatches.mockImplementation(() => envelope({ state: "no_snapshot", matches: [], asOf: null, ageDays: null }))
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText("No matches yet")).toBeInTheDocument()
    expect(within(row).getByText(/has not opened their own Career Fit matches yet/)).toBeInTheDocument()
    expect(within(row).queryByText("Not shared")).toBeNull()
    expect(within(row).queryByRole("alert")).toBeNull()
  })

  it("an ok answer with no roles reads 'No matches yet' too, with its own reason", async () => {
    mockFitMatches.mockImplementation(() => envelope({ state: "ok", matches: [], asOf: null, ageDays: null }))
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText("No matches yet")).toBeInTheDocument()
    expect(within(row).getByText(/had no published roles to compare against/)).toBeInTheDocument()
  })

  it.each([
    ["no_account", /does not have an Inspire Genius account yet/],
    ["no_prism", /has no PRISM profile on file yet/],
    ["not_entitled", /Career Fit is not switched on for Ada Example/],
    ["a_state_added_later", /matches cannot be shown right now/],
  ])("%s has its own sentence and is not 'no matches yet' or 'not shared'", async (state, sentence) => {
    mockFitMatches.mockImplementation(() => envelope({ state, matches: [], asOf: null, ageDays: null }))
    await mount()
    const row = await openRow("Ada Example")
    expect(within(row).getByText(sentence)).toBeInTheDocument()
    expect(within(row).queryByText("No matches yet")).toBeNull()
    expect(within(row).queryByText("Not shared")).toBeNull()
    expect(within(row).queryByRole("list")).toBeNull()
  })

  it("shared matches are listed with rank, role and score, and where they came from", async () => {
    await mount()
    const row = await openRow("Ada Example")
    const items = within(row).getAllByRole("listitem")
    expect(items.map((li) => li.textContent)).toEqual([
      "#1Invented Role OneMatch score 82%",
      "#2Invented Role TwoMatch score 64%8 of 22 dimensions measured",
    ])
    expect(within(row).getByText(/From Ada Example's own Career Fit, as of /)).toBeInTheDocument()
    expect(within(row).queryByRole("alert")).toBeNull()
  })
})

describe("TS-4a — no tier and no fit band on this surface", () => {
  it("the response carries them (the control) and the page draws none of them", async () => {
    const view = await mount()
    const row = await openRow("Ada Example")
    // The control: the data under test really does carry the withheld fields,
    // on every match and on the envelope, and the page really did draw from it.
    const served = JSON.stringify(OK_WITH_WITHHELD_FIELDS)
    const sentinels = [...Object.values(WITHHELD), "TIER-SENTINEL-envelope", "BAND-SENTINEL-envelope"]
    for (const s of sentinels) expect(served).toContain(s)
    expect(mockFitMatches).toHaveBeenCalledTimes(1)
    expect(within(row).getByText("Invented Role One")).toBeInTheDocument()
    expect(within(row).getByText("Match score 82%")).toBeInTheDocument()
    // The absence: not in the text, and not in any attribute either.
    const html = view.container.innerHTML
    for (const s of sentinels) expect({ s, drawn: html.includes(s) }).toEqual({ s, drawn: false })
    expect(html).not.toMatch(/SENTINEL/)
    // No tier or band wording of the page's own.
    expect(view.container.textContent).not.toMatch(/\b(tier|band|strong fit|good fit|stretch)\b/i)
  })

  it("the roster's older proposed match is not drawn, opened or not", async () => {
    const view = await mount()
    await screen.findByText("Ada Example")
    expect(JSON.stringify(ROSTER)).toContain("ROSTER-TOPMATCH-SENTINEL")
    expect(view.container.innerHTML).not.toContain("ROSTER-TOPMATCH-SENTINEL")
    expect(view.container.textContent).not.toContain("77")
    await openRow("Ada Example")
    expect(view.container.innerHTML).not.toContain("ROSTER-TOPMATCH-SENTINEL")
  })
})

describe("TS-4a — the member opens in the audience's own Team Development Studio", () => {
  it.each([
    ["manager", "/manager/development/member-0001"],
    ["practitioner", "/practitioner/development/member-0001"],
  ] as const)("%s: the link goes to %s", async (audience, href) => {
    await mount(audience)
    const link = await screen.findByRole("link", { name: "Open Ada Example in Team Development Studio" })
    expect(link).toHaveAttribute("href", href)
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "")
    expect(hrefs).toHaveLength(ROSTER.length)
    for (const to of hrefs) {
      expect({ to, own: to.startsWith(`/${audience}/development/`) }).toEqual({ to, own: true })
      expect({ to, opens: hasAccess(audience, to) }).toEqual({ to, opens: true })
    }
  })

  it("the check can fail: a practitioner does not open a manager path", () => {
    expect(hasAccess("practitioner", "/manager/development/member-0001")).toBe(false)
    expect(hasAccess("manager", "/manager/development/member-0001")).toBe(true)
  })

  it("an empty roster links to the audience's own Studio, and is not an error", async () => {
    mockRoster.mockImplementation(() => envelope([]))
    await mount("practitioner")
    expect(await screen.findByText(/You have no team members in Team Development Studio yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Team Development Studio" })).toHaveAttribute(
      "href",
      "/practitioner/development",
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("TS-4a — a failed load is an alert with a retry", () => {
  it("a member's matches failing to load: alert, retry, then the matches", async () => {
    mockFitMatches.mockImplementationOnce(() => Promise.reject(new Error("network")))
    await mount()
    const row = await openRow("Ada Example")
    const alert = await within(row).findByRole("alert")
    expect(alert).toHaveTextContent("Ada Example's matches could not be loaded just now. That is not the same as having none.")
    expect(within(row).queryByText("No matches yet")).toBeNull()
    expect(within(row).queryByText("Not shared")).toBeNull()
    expect(within(row).queryByRole("list")).toBeNull()
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    expect(await within(row).findByText("Invented Role One")).toBeInTheDocument()
    expect(within(row).queryByRole("alert")).toBeNull()
    expect(mockFitMatches).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["the server says its own read failed", { state: "unavailable", matches: [], asOf: null, ageDays: null }],
    ["the answer carries no state", { matches: [] }],
    ["the answer is empty", null],
  ])("%s: an alert with a retry, never an empty state", async (_name, data) => {
    mockFitMatches.mockImplementation(() => envelope(data))
    await mount()
    const row = await openRow("Ada Example")
    const alert = await within(row).findByRole("alert")
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(within(row).queryByText("No matches yet")).toBeNull()
    expect(within(row).queryByRole("list")).toBeNull()
  })

  it("the roster failing to load: alert, retry, then the team; never 'no team members'", async () => {
    mockRoster.mockImplementationOnce(() => Promise.reject(new Error("network")))
    await mount()
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your team could not be loaded. This is a loading problem, not an empty team.")
    expect(screen.queryByText(/You have no team members/)).toBeNull()
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Ada Example")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(mockRoster).toHaveBeenCalledTimes(2)
  })
})

describe("TS-4a — a long roster stays readable and still requests nothing", () => {
  const LONG = Array.from({ length: 60 }, (_, i) => ({
    memberId: `member-${String(i).padStart(4, "0")}`,
    name: `Person Number${i}`,
    title: i % 2 ? "Sample Analyst" : "Sample Engineer",
    coverage,
    planStatus: "no_plan",
  }))

  it("draws a page of rows, shows more on request, searches by name, and asks for no matches", async () => {
    mockRoster.mockImplementation(() => envelope(LONG))
    await mount()
    await screen.findByText("Person Number0")
    const rows = () => screen.getAllByRole("link", { name: /in Team Development Studio$/ })
    expect(rows()).toHaveLength(25)
    fireEvent.click(screen.getByRole("button", { name: "Show more (35 left)" }))
    expect(rows()).toHaveLength(50)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search team members" }), { target: { value: "number59" } })
    expect(rows()).toHaveLength(1)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search team members" }), { target: { value: "nobody-here" } })
    expect(screen.getByText("No team member matches that search.")).toBeInTheDocument()
    await waitFor(() => expect(mockRoster).toHaveBeenCalledTimes(1))
    expect(mockFitMatches).not.toHaveBeenCalled()
  })
})
