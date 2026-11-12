/**
 * @jest-environment jsdom
 *
 * CX-5 link — the Careers and Jobs page (JF-8) offers ONE way into the Career
 * Exploration exercise, and only while the server's `career_exercise` switch
 * says on for the signed-in person.
 *
 * Off, still loading, or a failed switch read: the page is today's page, byte
 * for byte. The goldens under `__golden__/cx5-link/` were recorded on the BASE
 * commit (frontend origin/development f7677476, before any CX-5-link source
 * change) with `CX5_LINK_GOLDEN_WRITE=1`, and committed on their own ahead of
 * the code. Never re-record on this branch: a re-recorded golden proves only
 * that the code agrees with itself.
 *
 * The exercise route sits inside the `career-discovery` VerticalShell, so an
 * account without that entitlement is never offered the link and the switch is
 * never read for it.
 */
import fs from "fs"
import path from "path"
import { act, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

type Answer = { ok: boolean } | { fail: number } | "never"
let switchAnswer: Answer = { ok: false }
const switchCalls = jest.fn()

jest.mock("@/services/career-exercise/counselor.service", () => ({
  getCareerExerciseEnabled: () => {
    switchCalls()
    const a = switchAnswer
    if (a === "never") return new Promise(() => {})
    if ("fail" in a) {
      return Promise.reject(Object.assign(new Error(`HTTP ${a.fail}`), { response: { status: a.fail } }))
    }
    return Promise.resolve(a.ok)
  },
}))

let mockDiscoveryAccess = true
jest.mock("@/verticals/core", () => ({
  useVerticalAccess: () => ({ hasAccess: mockDiscoveryAccess, isLoading: false, enabledVerticals: [] }),
}))
jest.mock("@/pages/job-fit/MatchesPage", () => ({ __esModule: true, default: () => <p>JOBS-LIST</p> }))
jest.mock("@/pages/job-fit/FavoritesList", () => ({ FavoritesList: () => <p>FAVORITES</p> }))
jest.mock("@/hooks/career-discovery/useCareerDiscovery", () => ({
  discoveryErrorMessage: () => "Discovery could not load.",
  useDiscoveryStatus: () => ({ data: { enabled: true } }),
  useDiscoveryJourney: () => ({ data: { mayProceed: true } }),
  useDiscoveryCareers: () => ({ data: { families: [{ family: "People & Care", affinity: 82.4 }] } }),
}))

import JobFitHome from "../JobFitHome"

async function settle(ticks = 12) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <JobFitHome />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const DIR = path.join(__dirname, "__golden__", "cx5-link")
const WRITE = process.env.CX5_LINK_GOLDEN_WRITE === "1"

const OFF_CASES: { name: string; answer: Answer; entitled: boolean }[] = [
  { name: "off", answer: { ok: false }, entitled: true },
  { name: "loading", answer: "never", entitled: true },
  { name: "error", answer: { fail: 500 }, entitled: true },
  { name: "forbidden", answer: { fail: 403 }, entitled: true },
  { name: "not-entitled", answer: { ok: true }, entitled: false },
]

beforeEach(() => {
  switchCalls.mockClear()
  switchAnswer = { ok: false }
  mockDiscoveryAccess = true
})

describe("CX-5 link — switch off / loading / failed: the Careers and Jobs page is today's page", () => {
  test.each(OFF_CASES)("$name", async ({ name, answer, entitled }) => {
    switchAnswer = answer
    mockDiscoveryAccess = entitled
    const { container } = mount()
    await settle()
    const html = container.innerHTML
    if (WRITE) {
      fs.mkdirSync(DIR, { recursive: true })
      fs.writeFileSync(path.join(DIR, `${name}.html`), html)
      return
    }
    expect(html).toBe(fs.readFileSync(path.join(DIR, `${name}.html`), "utf8"))
    expect(screen.queryByRole("link", { name: /Career exploration/i })).not.toBeInTheDocument()
  })

  test("the goldens are populated (a vacuous golden proves nothing)", () => {
    for (const { name } of OFF_CASES) {
      const html = fs.readFileSync(path.join(DIR, `${name}.html`), "utf8")
      expect(html).toContain("Careers and Jobs")
      expect(html).toContain("JOBS-LIST")
      expect(html).toContain("Career Pathway")
    }
    expect(fs.readFileSync(path.join(DIR, "off.html"), "utf8")).toContain("Learning and Education")
    expect(fs.readFileSync(path.join(DIR, "not-entitled.html"), "utf8")).not.toContain("Learning and Education")
  })
})

// The behaviour cases below describe the change; they are not run while recording.
const describeBehaviour = WRITE ? describe.skip : describe

describeBehaviour("CX-5 link — switch on", () => {
  test("offers one link to the Career Exploration page, after Learning and Education", async () => {
    switchAnswer = { ok: true }
    mount()
    await settle()
    const steps = screen.getByRole("navigation", { name: "Next steps" })
    const hrefs = within(steps)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual([
      "/vertical/job-fit/pathway",
      "/vertical/career-discovery/education",
      "/vertical/career-discovery/exercise",
    ])
    expect(screen.getAllByRole("link", { name: /Career exploration/i })).toHaveLength(1)
    expect(switchCalls).toHaveBeenCalledTimes(1)
  })

  test("an account without the career-discovery entitlement never reads the switch", async () => {
    switchAnswer = { ok: true }
    mockDiscoveryAccess = false
    mount()
    await settle()
    expect(switchCalls).not.toHaveBeenCalled()
    expect(screen.queryByRole("link", { name: /Career exploration/i })).not.toBeInTheDocument()
  })
})
