/**
 * @jest-environment jsdom
 *
 * JF-9 — Career Pathway v2. Drawn only when the pathway payload carries
 * `v2.version === "pathway-v2"`, which the server sends only when job_fit_v2
 * applies (switch off is pinned byte for byte by
 * jf9-pathway-switch-off-golden.test.tsx).
 *
 * - Two entry points: the main page (no `from`: the person chooses the job
 *   they do now) and the job page (`?from=<job>`, jf6-job-page.test.tsx pins
 *   the link).
 * - Three sections, each a list of jobs or the server's reason it is empty.
 * - Each job opens its Careers and Jobs job page, offers "Make this my
 *   target" while goal_targets is on, and "Training and credentials" — O*NET
 *   education, CareerOneStop listings and school programmes, each saying why
 *   when it has nothing.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitPathway } from "@/types/job-fit"
import type { PathwayRole, PathwayV2 } from "@/types/job-fit/pathway"

const mockGetPathway = jest.fn()
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: {
    getPathway: (...args: unknown[]) => mockGetPathway(...args),
    getDetail: () => new Promise(() => {}),
  },
}))
const mockTargetsSwitch = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockTargetsSwitch(),
}))
jest.mock("@/services/goals/targets.service", () => ({
  getMyTargets: () => Promise.resolve([]),
  getRoadmap: () => Promise.resolve(null),
  makeTarget: () => Promise.resolve(null),
  rebuildRoadmap: () => Promise.resolve(null),
  removeTarget: () => Promise.resolve(null),
}))
jest.mock("@/services/career-pathways/careerPathways.service", () => ({
  getCareerPathwaysStatus: () => Promise.resolve({ enabled: false, externalSharing: false }),
}))
const mockOccupation = jest.fn()
jest.mock("@/services/job-fit/occupations.service", () => ({
  getOccupation: (code: string) => mockOccupation(code),
  getOccupationPay: () => new Promise(() => {}),
}))
const mockLocal = jest.fn()
const mockPrograms = jest.fn()
jest.mock("@/services/job-fit/pathwayCredentials.service", () => ({
  getOccupationLocal: (code: string, kind: string) => mockLocal(code, kind),
  getBlueprintPrograms: (id: string) => mockPrograms(id),
}))

import PathwayPage from "../PathwayPage"
import { CREDENTIAL_TEXT } from "../_pathway"

const role = (over: Partial<PathwayRole>): PathwayRole => ({
  jobId: "j9",
  roleTitle: "Role",
  roleFamily: null,
  jobLevel: null,
  socCode: null,
  onetSocCode: null,
  distance: null,
  rationale: null,
  ...over,
})

const empty = (reason: string, message: string) => ({ items: [], reason, message })

function v2(over: Partial<PathwayV2> = {}): PathwayV2 {
  return {
    version: "pathway-v2",
    origin: null,
    originReason: "no_origin",
    choices: [
      { jobId: "j1", roleTitle: "Team Lead" },
      { jobId: "j2", roleTitle: "Planner" },
    ],
    adjacent: empty("no_origin", "Choose the job you do now."),
    nextLevel: empty("no_origin", "Choose the job you do now."),
    newJobs: { items: [role({ jobId: "j3", roleTitle: "Analyst", rationale: "Within reach." })], reason: null, message: null },
    adjacentMaxDistance: 10,
    ...over,
  }
}

const payload = (v: PathwayV2 | undefined, extra: Partial<FitPathway> = {}): FitPathway => ({
  suggestions: [{ roleTitle: "Old Suggestion", jobId: "j3" }],
  skillLadders: [{ skill: "Delegation", steps: ["Step one."] }],
  note: "Old note.",
  ...(v ? { v2: v } : {}),
  ...extra,
})

const answer = (p: FitPathway) => Promise.resolve({ data: { data: p } })

let lastSearch = ""
function Where() {
  lastSearch = useLocation().search
  return null
}

function renderAt(at = "/vertical/job-fit/pathway") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route
            path="/vertical/job-fit/pathway"
            element={
              <>
                <PathwayPage />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const section = (name: string) => screen.getByRole("region", { name })

beforeEach(() => {
  jest.clearAllMocks()
  lastSearch = ""
  mockTargetsSwitch.mockResolvedValue(false)
  mockOccupation.mockResolvedValue({ state: "empty", reason: null, data: null })
  mockLocal.mockResolvedValue({ state: "off", reason: "not_enabled", kind: "training", code: "x", source: "", sourceUrl: "", total: null, data: [] })
  mockPrograms.mockResolvedValue({ programs: [], truncated: false })
})

describe("JF-9 — the switch is the server's v2 marker", () => {
  test("no v2 → today's page (its suggestions grid), no v2 sections", async () => {
    mockGetPathway.mockReturnValue(answer(payload(undefined)))
    renderAt()
    // Wait for the payload, not the loading state (which shows today's explainer too).
    expect(await screen.findByText("Old Suggestion")).toBeInTheDocument()
    expect(screen.getAllByText("Adjacent roles")).toHaveLength(2)
    expect(screen.queryByText("Jobs you can quickly move into")).not.toBeInTheDocument()
    expect(mockGetPathway).toHaveBeenCalledWith()
  })

  test("a v2 block with another version is not drawn as v2", async () => {
    mockGetPathway.mockReturnValue(answer(payload({ ...v2(), version: "pathway-v3" })))
    renderAt()
    // Wait for the payload, not the loading state (which shows today's explainer too).
    expect(await screen.findByText("Old Suggestion")).toBeInTheDocument()
    expect(screen.getAllByText("Adjacent roles")).toHaveLength(2)
    expect(screen.queryByText("Jobs you can quickly move into")).not.toBeInTheDocument()
  })
})

describe("JF-9 — main page entry: from my current job", () => {
  test("no origin: says why, offers the jobs to start from, keeps What this is", async () => {
    mockGetPathway.mockReturnValue(answer(payload(v2())))
    renderAt()
    expect(await screen.findByRole("region", { name: "Jobs you can quickly move into" })).toBeInTheDocument()
    expect(screen.getByText("What this is")).toBeInTheDocument()
    expect(screen.getByTestId("pathway-origin-reason")).toHaveAttribute("data-reason", "no_origin")
    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(within(section("Jobs you can quickly move into")).getByTestId("pathway-empty-reason")).toHaveAttribute("data-reason", "no_origin")
    expect(within(section("Roles you're developing toward")).getByTestId("pathway-empty-reason")).toHaveTextContent("Choose the job you do now.")
    // Today's suggestion grid is replaced by the new-jobs section.
    expect(screen.queryByText("Adjacent roles")).not.toBeInTheDocument()
    const link = within(section("New jobs to consider")).getAllByRole("link", { name: "Analyst" })[0]
    expect(link).toHaveAttribute("href", "/vertical/job-fit/fit/j3")
  })

  test("choosing the job you do now sets ?from= and reads the pathway from it", async () => {
    mockGetPathway.mockReturnValue(answer(payload(v2())))
    renderAt()
    const select = await screen.findByRole("combobox")
    await userEvent.selectOptions(select, "j2")
    await waitFor(() => expect(mockGetPathway).toHaveBeenCalledWith("j2"))
    expect(lastSearch).toBe("?from=j2")
  })
})

describe("JF-9 — job page entry: from this job", () => {
  const withOrigin = v2({
    origin: { jobId: "j1", roleTitle: "Team Lead", roleFamily: "Ops", jobLevel: null, socCode: null, onetSocCode: null },
    originReason: null,
    adjacent: empty("origin_no_level", "This job has no job level on file yet."),
    nextLevel: { items: [role({ jobId: "j4", roleTitle: "Ops Manager", roleFamily: "Ops", jobLevel: 4 })], reason: null, message: null },
    newJobs: empty("new_jobs_none", "No other job is a growing fit."),
  })

  test("reads with from, shows the origin, and every empty section says why", async () => {
    mockGetPathway.mockReturnValue(answer(payload(withOrigin)))
    renderAt("/vertical/job-fit/pathway?from=j1")
    expect(await screen.findByTestId("pathway-origin")).toHaveTextContent("Team Lead")
    expect(screen.getByTestId("pathway-origin")).toHaveTextContent("level not on file yet")
    expect(mockGetPathway).toHaveBeenCalledWith("j1")
    expect(within(section("Jobs you can quickly move into")).getByTestId("pathway-empty-reason")).toHaveTextContent(
      "This job has no job level on file yet.",
    )
    expect(within(section("New jobs to consider")).getByTestId("pathway-empty-reason")).toHaveAttribute("data-reason", "new_jobs_none")
    const next = section("Roles you're developing toward")
    expect(within(next).getByText("Ops · Level 4")).toBeInTheDocument()
    expect(within(next).queryByTestId("pathway-empty-reason")).not.toBeInTheDocument()
  })

  test("a role with no level says so on its card", async () => {
    mockGetPathway.mockReturnValue(answer(payload(v2())))
    renderAt()
    expect(await within(await screen.findByRole("region", { name: "New jobs to consider" })).findByText("Level not on file yet")).toBeInTheDocument()
  })

  test("all three sections empty: three reasons, never a blank section", async () => {
    mockGetPathway.mockReturnValue(
      answer(payload(v2({ newJobs: empty("no_prism", "Add or complete your PRISM assessment.") }))),
    )
    renderAt()
    await screen.findByRole("region", { name: "Jobs you can quickly move into" })
    const reasons = screen.getAllByTestId("pathway-empty-reason")
    expect(reasons.map((r) => r.getAttribute("data-reason"))).toEqual(["no_origin", "no_origin", "no_prism"])
    reasons.forEach((r) => expect(r.textContent?.trim().length).toBeGreaterThan(10))
  })
})

describe("JF-9 — Make this my target", () => {
  test("offered on every pathway job while goal_targets is on", async () => {
    mockTargetsSwitch.mockResolvedValue(true)
    mockGetPathway.mockReturnValue(answer(payload(v2())))
    renderAt()
    expect(await screen.findByRole("button", { name: "Make Analyst my target" })).toBeInTheDocument()
    expect(screen.getByText("Your roadmaps")).toBeInTheDocument()
  })

  test("not offered while goal_targets is off (the target path is that switch's)", async () => {
    mockGetPathway.mockReturnValue(answer(payload(v2())))
    renderAt()
    await screen.findByText("Analyst")
    expect(screen.queryByRole("button", { name: /my target/ })).not.toBeInTheDocument()
    expect(screen.getByText("Skill ladders")).toBeInTheDocument()
  })
})

describe("JF-9 — Training and credentials", () => {
  async function openFor(r: PathwayRole) {
    mockGetPathway.mockReturnValue(answer(payload(v2({ newJobs: { items: [r], reason: null, message: null } }))))
    renderAt()
    const button = await screen.findByRole("button", { name: /training and credentials/i })
    return button
  }

  test("closed: no lookup is made", async () => {
    await openFor(role({ onetSocCode: "11-1021.00" }))
    expect(mockOccupation).not.toHaveBeenCalled()
    expect(mockLocal).not.toHaveBeenCalled()
    expect(mockPrograms).not.toHaveBeenCalled()
  })

  test("no occupation code: says so, makes no O*NET or CareerOneStop request", async () => {
    const button = await openFor(role({ jobId: "j7" }))
    await userEvent.click(button)
    const panel = await screen.findByTestId("pathway-credentials")
    expect(within(panel).getAllByText(CREDENTIAL_TEXT.noCode)).toHaveLength(2)
    expect(mockOccupation).not.toHaveBeenCalled()
    expect(mockLocal).not.toHaveBeenCalled()
    await waitFor(() => expect(mockPrograms).toHaveBeenCalledWith("j7"))
    expect(await within(panel).findByText(CREDENTIAL_TEXT.programsNone)).toBeInTheDocument()
  })

  test("with a code: O*NET education, each CareerOneStop kind in its own state, school programmes", async () => {
    mockOccupation.mockResolvedValue({
      state: "ready",
      reason: null,
      data: { code: "11-1021.00", socCode: "11-1021", title: "GM", description: "", skills: [], missing: [], education: [{ category: 6, label: "Bachelor's degree", percent: 61.4 }] },
    })
    mockLocal.mockImplementation((_code: string, kind: string) => {
      const base = { kind, code: "11-1021.00", source: "CareerOneStop", sourceUrl: "https://www.careeronestop.org", total: null }
      if (kind === "training")
        return Promise.resolve({ ...base, state: "ready", reason: null, data: [
          { title: "Management Certificate", organisation: "City College", location: "Anytown, ST", credential: "Certificate", url: "https://example.edu/mgmt" },
          { title: "Unsafe Link", url: "javascript:alert(1)" },
        ] })
      if (kind === "licenses") return Promise.resolve({ ...base, state: "empty", reason: "none_found", data: [] })
      if (kind === "certifications") return Promise.resolve({ ...base, state: "unavailable", reason: "error", data: [] })
      return Promise.reject(new Error("HTTP 500"))
    })
    mockPrograms.mockResolvedValue({
      programs: [{ program: { id: "p1", code: "BUS-AAS", title: "Business Administration", credential: "AAS" }, institution: { id: "i1", name: "Example Technical College" } }],
      truncated: false,
    })
    const button = await openFor(role({ jobId: "j8", socCode: "11-1021", onetSocCode: "11-1021.00" }))
    await userEvent.click(button)
    const panel = await screen.findByTestId("pathway-credentials")
    expect(await within(panel).findByText(/Bachelor's degree/)).toHaveTextContent("61% of people in this job")
    expect(mockOccupation).toHaveBeenCalledWith("11-1021.00")
    const link = await within(panel).findByRole("link", { name: /Management Certificate/ })
    expect(link).toHaveAttribute("href", "https://example.edu/mgmt")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(within(panel).getByText("Unsafe Link").closest("a")).toBeNull()
    expect(within(panel).getByText(CREDENTIAL_TEXT.localEmpty)).toBeInTheDocument()
    expect(within(panel).getAllByText(CREDENTIAL_TEXT.localUnavailable)).toHaveLength(2)
    expect(await within(panel).findByText(/Business Administration/)).toHaveTextContent("Business Administration (AAS) — Example Technical College")
    expect(mockLocal.mock.calls.map((c) => c[1]).sort()).toEqual(["apprenticeships", "certifications", "licenses", "training"])
  })

  test("CareerOneStop off and O*NET empty both say why", async () => {
    mockOccupation.mockResolvedValue({ state: "empty", reason: "This occupation is not in the loaded O*NET release.", data: null })
    const button = await openFor(role({ socCode: "11-1021" }))
    await userEvent.click(button)
    const panel = await screen.findByTestId("pathway-credentials")
    expect(await within(panel).findByText("This occupation is not in the loaded O*NET release.")).toBeInTheDocument()
    expect(await within(panel).findAllByText(CREDENTIAL_TEXT.localOff)).toHaveLength(4)
  })

  test("school programmes the person cannot see (403) say so, distinct from a failure", async () => {
    mockPrograms.mockRejectedValue(Object.assign(new Error("403"), { response: { status: 403 } }))
    const button = await openFor(role({}))
    await userEvent.click(button)
    expect(await screen.findByText(CREDENTIAL_TEXT.programsHidden)).toBeInTheDocument()
  })

  test("a school programmes failure (500) says it failed", async () => {
    mockPrograms.mockRejectedValue(Object.assign(new Error("500"), { response: { status: 500 } }))
    const button = await openFor(role({}))
    await userEvent.click(button)
    expect(await screen.findByText(CREDENTIAL_TEXT.programsError)).toBeInTheDocument()
  })
})
