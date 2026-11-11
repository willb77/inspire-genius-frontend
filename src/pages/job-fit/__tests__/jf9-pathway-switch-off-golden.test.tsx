/**
 * @jest-environment jsdom
 *
 * JF-9 — with job_fit_v2 OFF the Pathway page is today's page, byte for byte.
 *
 * The server is the switch: the page draws the JF-9 sections only when the
 * pathway payload carries `v2` (version "pathway-v2"), which the server sends
 * only when job_fit_v2 applies to the caller. Every case here answers WITHOUT
 * `v2`, as the server does with the switch off.
 *
 * The goldens under `__golden__/jf9/` were recorded on the BASE commit
 * (frontend origin/development 64daaadf, before any JF-9 source change) with
 * `JF9_GOLDEN_WRITE=1`, and committed on their own ahead of the code. Each
 * holds `container.innerHTML`; the no-`from` cases also hold the ordered
 * service calls, so a changed request with the switch off fails here too.
 * A `?from=` URL is only ever produced by the v2 job page, so for those cases
 * the DOM is what is pinned.
 *
 * Never re-record on a JF-9 branch: a re-recorded golden proves only that the
 * code agrees with itself.
 */
import fs from "fs"
import path from "path"
import { act, render } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const requests: string[] = []
const log = (entry: string) => requests.push(entry)

type Answer = { ok: unknown } | { fail: number } | "never"
let pathwayAnswer: Answer = { ok: {} }
let targetsSwitch = false

function answer(a: Answer): Promise<unknown> {
  if (a === "never") return new Promise(() => {})
  if ("fail" in a) {
    return Promise.reject(Object.assign(new Error(`HTTP ${a.fail}`), { response: { status: a.fail } }))
  }
  return Promise.resolve({ data: { data: a.ok } })
}

jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: {
    getPathway: (...args: unknown[]) => {
      log(`fit.getPathway(${args.map((a) => JSON.stringify(a)).join(",")})`)
      return answer(pathwayAnswer)
    },
    getDetail: (jobId: string) => {
      log(`fit.getDetail(${jobId})`)
      return new Promise(() => {})
    },
  },
}))
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => {
    log("switch.goalTargets()")
    return Promise.resolve(targetsSwitch)
  },
}))
jest.mock("@/services/goals/targets.service", () => ({
  getMyTargets: () => {
    log("goals.getMyTargets()")
    return Promise.resolve([])
  },
  getRoadmap: () => Promise.resolve(null),
  makeTarget: () => Promise.resolve(null),
  rebuildRoadmap: () => Promise.resolve(null),
  removeTarget: () => Promise.resolve(null),
}))
jest.mock("@/services/career-pathways/careerPathways.service", () => ({
  getCareerPathwaysStatus: () => {
    log("careerPathways.status()")
    return Promise.resolve({ enabled: false, externalSharing: false })
  },
}))

import PathwayPage from "../PathwayPage"

const CONTENT = {
  suggestions: [
    { roleTitle: "Team Lead", roleFamily: "Operations", pivotDifficulty: "moderate", rationale: "A step up.", jobId: "j1" },
    { roleTitle: "Planner", rationale: "Adjacent.", jobId: null },
  ],
  skillLadders: [{ skill: "Delegation", steps: ["Step one.", "Step two."] }],
  note: "Fixture pathway note.",
  gated: false,
}
const EMPTY = { suggestions: [], skillLadders: [], note: "Fixture empty note.", gated: true }

async function settle(ticks = 12) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

function mount(at: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/vertical/job-fit/pathway" element={<PathwayPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const P = "/vertical/job-fit/pathway"
const CASES: { name: string; at: string; answer: Answer; targets?: boolean }[] = [
  { name: "content", at: P, answer: { ok: CONTENT } },
  { name: "content-targets", at: P, answer: { ok: CONTENT }, targets: true },
  { name: "empty", at: P, answer: { ok: EMPTY } },
  { name: "empty-targets", at: P, answer: { ok: EMPTY }, targets: true },
  { name: "bare", at: P, answer: { ok: {} } },
  { name: "error", at: P, answer: { fail: 500 } },
  { name: "loading", at: P, answer: "never" },
  { name: "from-content", at: `${P}?from=j1`, answer: { ok: CONTENT } },
  { name: "from-content-targets", at: `${P}?from=j1`, answer: { ok: CONTENT }, targets: true },
  { name: "from-empty", at: `${P}?from=j1`, answer: { ok: EMPTY } },
]

const DIR = path.join(__dirname, "__golden__", "jf9")
const WRITE = process.env.JF9_GOLDEN_WRITE === "1"

describe("JF-9 — switch off: the Pathway page is today's page", () => {
  beforeEach(() => {
    requests.length = 0
  })

  test.each(CASES)("$name", async ({ name, at, answer: a, targets }) => {
    pathwayAnswer = a
    targetsSwitch = !!targets
    const { container } = mount(at)
    await settle()
    const html = container.innerHTML
    const reqs = requests.join("\n") + "\n"
    const pinRequests = !at.includes("?from=")
    if (WRITE) {
      fs.mkdirSync(DIR, { recursive: true })
      fs.writeFileSync(path.join(DIR, `${name}.html`), html)
      if (pinRequests) fs.writeFileSync(path.join(DIR, `${name}.requests.txt`), reqs)
      return
    }
    expect(html).toBe(fs.readFileSync(path.join(DIR, `${name}.html`), "utf8"))
    if (pinRequests) expect(reqs).toBe(fs.readFileSync(path.join(DIR, `${name}.requests.txt`), "utf8"))
  })

  test("the goldens are populated (a vacuous golden proves nothing)", () => {
    const content = fs.readFileSync(path.join(DIR, "content.html"), "utf8")
    expect(content).toContain("Team Lead")
    expect(content).toContain("Skill ladders")
    expect(fs.readFileSync(path.join(DIR, "content.requests.txt"), "utf8")).toContain("fit.getPathway()")
    expect(fs.readFileSync(path.join(DIR, "error.html"), "utf8")).toContain("available yet")
    expect(fs.readFileSync(path.join(DIR, "from-content.html"), "utf8")).toContain("Team Lead")
  })
})
