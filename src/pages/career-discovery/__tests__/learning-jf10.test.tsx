/**
 * @jest-environment jsdom
 */
/**
 * JF-10 — Learning and Education, behind `job_fit_v2` (decided by the server).
 *
 * Switch off: the server sends no mark, and Education paths, Cost and payback and
 * My plan render byte for byte as before. `golden/jf10-off.json` was written by
 * THIS file against the base pages (origin/development 64daaadf, before any JF-10
 * edit) with JF10_WRITE_GOLDEN=1. A changed golden in a diff is the alarm.
 *
 * Switch on: the four buttons, the honest "no home state on file" note, local
 * training / licences / apprenticeships on demand, empty answers that say why —
 * and Cost and payback's figures exactly as the base renders them.
 */
import fs from "fs"
import path from "path"
import type { ReactElement } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import * as localSvc from "@/services/career-discovery/learningLocal.service"
import * as core from "@/verticals/core"
import {
  learningBlockOf,
  learningOf,
  publishedCost,
  type LearningBlock,
  type LocalListing,
} from "@/lib/career-discovery/learningSection"
import DiscoveryShell from "../DiscoveryShell"
import CostPage from "../CostPage"
import EducationPage from "../EducationPage"
import PlanPage from "../PlanPage"
import type {
  DiscoveryCost,
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoveryPlan,
  DiscoverySchools,
  DiscoveryStage,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/services/career-discovery/learningLocal.service")
jest.mock("@/verticals/core", () => ({
  ...jest.requireActual("@/verticals/core"),
  useVerticalAccess: jest.fn(),
}))

const m = svc as jest.Mocked<typeof svc>
const local = localSvc as jest.Mocked<typeof localSvc>
const access = core.useVerticalAccess as jest.Mock
const B = "/vertical/career-discovery"
const GOLDEN = path.join(__dirname, "golden", "jf10-off.json")

const BUTTONS = [
  { stageId: "education", label: "Learning and Education Path", available: true },
  { stageId: "cost", label: "Cost and Payback", available: true },
  { stageId: "plan", label: "My Plan", available: true },
  { stageId: "goals", label: "My Goals", available: true },
]

function journey(marked: boolean, costOn = true): DiscoveryJourney {
  const ids = ["land", "about", "who", "careers", "pays", "goals", "alignment", "education", "cost", "plan"]
  const stages = ids.map((id) => {
    const s: DiscoveryStage & { learning?: unknown } = {
      id, name: id, question: `${id}?`, outcome: "o", available: id !== "cost" || costOn,
      state: "not_started" as const,
    }
    if (marked && id === "education") {
      s.name = "Learning and Education"
      s.learning = {
        title: "Learning and Education",
        buttons: BUTTONS.map((b) => (b.stageId === "cost" ? { ...b, available: costOn } : b)),
      }
    }
    return s
  })
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: { land: "complete" }, stages,
    nextAction: { id: "about", name: "About me", question: "q", outcome: "o", available: true },
    artefactKeys: [], createdAt: null, updatedAt: null,
  }
}

const EDUCATION: DiscoveryEducation = {
  areas: [{ careerArea: "Data & Quantitative", fit: 82.4 }],
  paths: [
    {
      id: "1-1107", careerArea: "Data & Quantitative", areaRank: 1, fit: 82.4,
      occupations: [
        { soc: "15-1252", title: "Software Developer", typicalEntry: "Bachelor's degree" },
        { soc: "15-1254", title: "Web Developer", typicalEntry: "Bachelor's degree" },
      ],
      credentials: [{ level: 3, title: "Bachelor's degree" }],
      field: { cip: "11.07", code: "1107", title: "Computer Science" },
      why: "Data & Quantitative is your top career area.",
      notes: [],
    },
    {
      id: "2-5138", careerArea: "People & Care", areaRank: 2, fit: null,
      occupations: [{ soc: "29-1141", title: "Registered Nurse", typicalEntry: "Bachelor's degree" }],
      credentials: [{ level: 2, title: "Associate degree" }],
      field: { cip: "51.38", code: "5138", title: "Registered Nursing" },
      why: "People & Care is your second career area.",
      notes: ["An associate degree in nursing also leads to the RN licence exam."],
    },
  ],
  note: null,
  crosswalkSource: "Fields of study: NCES crosswalk.",
  entrySource: "Typical entry education: BLS.",
  schoolsSource: "Schools: College Scorecard.",
}

const BLOCK: LearningBlock = {
  title: "Learning and Education",
  homeState: null,
  homeStateReason: "not_on_file",
  homeStateNote: "We don't have a home state for you, so nothing is filtered by state yet.",
  localKinds: ["training", "licenses", "apprenticeships"],
  localSource: "CareerOneStop, sponsored by the U.S. Department of Labor",
  localSourceUrl: "https://www.careeronestop.org",
}

const SCHOOLS: DiscoverySchools = {
  cip: "1107", level: 3, state: "NC", page: 0, perPage: 20, source: "s", total: 2,
  unavailable: false, note: null,
  schools: [
    { id: 1, name: "Example State University", city: "Boone", state: "NC", url: "www.example.edu/",
      program: { title: "Computer Science", credential: "Bachelor's Degree" } },
  ],
}

const COST: DiscoveryCost = {
  cip: "11.07", code: "1107", level: 3, schoolId: 199193, unavailable: false, note: null,
  field: "Computer Science", credential: "Bachelor's degree",
  school: { id: 199193, name: "Example State University", priceCalculatorUrl: "https://npc.example/" },
  netPrice: { low: 6149, high: 25674, average: 16486, byIncome: [], source: "Net price: Scorecard.", note: "Depends on aid." },
  yearsToComplete: { low: 4, high: 6, source: "Years: curated." },
  totalCost: { low: 24596, high: 154044, average: 82430, basis: "b" },
  earnings: {
    basis: "program", early: 90903, later: 123373, earlyYearsAfter: 1, laterYearsAfter: 5,
    approximation: false, source: "Earnings: Scorecard.", label: null,
  },
  baseline: { annual: 50232, source: "Comparison: $966 a week." },
  payback: { low: 0.3, high: 3.8, unit: "years", reachable: true, highUnreachable: false, basis: "b", note: "Not how long the course takes." },
  statement: "Computer Science here costs a range.",
  missing: [], missingStatements: [], computable: true,
  aid: { grant: { vertical: "grant", path: "/vertical/grant/dashboard", label: "Work out your aid with GRANT" },
    studentAid: "https://studentaid.gov/h/apply-for-aid/fafsa", netPriceCalculator: "https://npc.example/" },
} as DiscoveryCost

const PLAN: DiscoveryPlan = {
  schoolLevel: "high_school", interests: ["art"], careerAreas: [], goalsCount: 0, alignment: null,
  nextSteps: [], comingNext: [],
  educationPaths: [{ careerArea: "Data & Quantitative", field: "Computer Science", credential: "Bachelor's degree" }],
}

function listing(over: Partial<LocalListing> = {}): LocalListing {
  return {
    state: "ready", reason: null, kind: "training", code: "15-1252", area: { zip: null, state: "NC" },
    source: BLOCK.localSource, sourceUrl: BLOCK.localSourceUrl, total: 1, note: null,
    data: [{ id: "p1", title: "Software Development AAS", organisation: "Wake Tech",
      location: "Raleigh, NC", credential: "Associate degree", url: "https://wake.example/" }],
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

function renderAt(where: string, page: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[where]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="education" element={page} />
            <Route path="cost" element={page} />
            <Route path="plan" element={page} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** The Cost and payback page body: the element whose first child is its header. */
function costBody(): string {
  const h1 = screen.getByRole("heading", { level: 1, name: "Cost and payback" })
  return (h1.parentElement?.parentElement as HTMLElement).outerHTML
}

beforeEach(() => {
  jest.resetAllMocks()
  access.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey(false)))
  m.advanceDiscovery.mockReturnValue(ok(journey(false)))
  m.getDiscoveryEducation.mockReturnValue(ok(EDUCATION))
  m.getDiscoverySchools.mockReturnValue(ok(SCHOOLS))
  m.getDiscoveryCost.mockReturnValue(ok(COST))
  m.getDiscoveryPlan.mockReturnValue(ok(PLAN))
  local.getLearningLocal.mockImplementation((q) => ok(listing({ kind: q.kind })))
})

// ─── switch off: byte for byte as the base ──────────────────────────────

async function offScenes(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  let r = renderAt(`${B}/education`, <EducationPage />)
  await screen.findByText("Computer Science")
  out.education = r.container.innerHTML
  await userEvent.selectOptions(screen.getByRole("combobox"), "NC")
  await userEvent.click(screen.getByRole("button", { name: "Schools: Bachelor's degree" }))
  await screen.findByText("Example State University")
  out.educationSchools = r.container.innerHTML
  r.unmount()

  r = renderAt(`${B}/cost?cip=1107&level=3&school=199193`, <CostPage />)
  await screen.findByText("Payback")
  out.cost = r.container.innerHTML
  out.costBody = costBody()
  r.unmount()

  r = renderAt(`${B}/cost`, <CostPage />)
  await screen.findByText("Pick a school first")
  out.costNoQuery = r.container.innerHTML
  r.unmount()

  r = renderAt(`${B}/plan`, <PlanPage />)
  await screen.findByText("Computer Science")
  out.plan = r.container.innerHTML
  r.unmount()
  return out
}

describe("switch off: no mark from the server", () => {
  test("Education paths, Cost and payback and My plan render byte for byte as the base", async () => {
    const got = await offScenes()
    if (process.env.JF10_WRITE_GOLDEN === "1") {
      fs.mkdirSync(path.dirname(GOLDEN), { recursive: true })
      fs.writeFileSync(GOLDEN, JSON.stringify(got, null, 1) + "\n")
    }
    const want = JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Record<string, string>
    expect(Object.keys(got)).toEqual(Object.keys(want))
    for (const k of Object.keys(want)) expect([k, got[k]]).toEqual([k, want[k]])
    expect(local.getLearningLocal).not.toHaveBeenCalled()
  })
})

// ─── switch on ──────────────────────────────────────────────────────────

describe("switch on: Learning and Education", () => {
  beforeEach(() => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true)))
    m.getDiscoveryEducation.mockReturnValue(ok({ ...EDUCATION, learning: BLOCK } as DiscoveryEducation))
  })

  test("renamed, with the four buttons and the current one marked", async () => {
    renderAt(`${B}/education`, <EducationPage />)
    expect(await screen.findByRole("heading", { level: 1, name: "Learning and Education" })).toBeInTheDocument()
    const nav = screen.getByRole("navigation", { name: "Learning and Education" })
    const links = within(nav).getAllByRole("link")
    expect(links.map((a) => a.textContent)).toEqual([
      "Learning and Education Path", "Cost and Payback", "My Plan", "My Goals",
    ])
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      `${B}/education`, `${B}/cost`, `${B}/plan`, `${B}/goals`,
    ])
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).not.toHaveAttribute("aria-current")
  })

  test("no state is guessed: none selected, and the page says why", async () => {
    renderAt(`${B}/education`, <EducationPage />)
    await screen.findByText(BLOCK.homeStateNote)
    expect(screen.getByRole("combobox")).toHaveValue("")
    expect(screen.getByRole("option", { name: "Choose your state" })).toBeInTheDocument()
    expect(screen.getByText("Your state (or any other state)")).toBeInTheDocument()
    expect(m.getDiscoverySchools).not.toHaveBeenCalled()
    // Greyed out, and it says why.
    const btns = screen.getAllByRole("button", { name: "Training, licences and apprenticeships" })
    expect(btns[0]).toBeDisabled()
    expect(screen.getAllByText("Choose a state above first. These are listed by state.").length).toBe(2)
    expect(local.getLearningLocal).not.toHaveBeenCalled()
  })

  test("after a state and a click: the three kinds for that occupation, with credential", async () => {
    local.getLearningLocal.mockImplementation((q) =>
      ok(q.kind === "training" ? listing() : listing({ kind: q.kind, state: "empty", reason: "none_found",
        data: [], total: 0, note: `CareerOneStop lists no ${q.kind} for this occupation in NC. Try a neighbouring state.` })))
    renderAt(`${B}/education`, <EducationPage />)
    await screen.findByText(BLOCK.homeStateNote)
    await userEvent.selectOptions(screen.getByRole("combobox"), "NC")
    expect(screen.queryByText(BLOCK.homeStateNote)).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Training, licences and apprenticeships" })[0])
    await screen.findByText("Software Development AAS")
    expect(local.getLearningLocal.mock.calls.map((c) => c[0])).toEqual([
      { soc: "15-1252", kind: "training", state: "NC" },
      { soc: "15-1252", kind: "licenses", state: "NC" },
      { soc: "15-1252", kind: "apprenticeships", state: "NC" },
    ])
    expect(screen.getByText("Credential: Associate degree")).toBeInTheDocument()
    expect(screen.getByText("This listing doesn't publish costs. Check with each provider.")).toBeInTheDocument()
    // Empty answers say why — never a bare list.
    expect(await screen.findByText(/lists no licenses for this occupation in NC/)).toBeInTheDocument()
    expect(screen.getByText(/lists no apprenticeships for this occupation in NC/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: BLOCK.localSource })).toHaveAttribute("href", BLOCK.localSourceUrl)
    // Another job on the same path re-asks for that occupation.
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "For which job?" }), "15-1254")
    await waitFor(() =>
      expect(local.getLearningLocal).toHaveBeenCalledWith({ soc: "15-1254", kind: "training", state: "NC" })
    )
  })

  test("a published cost is shown as the source wrote it", async () => {
    local.getLearningLocal.mockImplementation((q) =>
      ok(listing({ kind: q.kind, data: [{ id: "x", title: "CNA course", cost: 1450, url: null }] })))
    renderAt(`${B}/education`, <EducationPage />)
    await screen.findByText(BLOCK.homeStateNote)
    await userEvent.selectOptions(screen.getByRole("combobox"), "NC")
    await userEvent.click(screen.getAllByRole("button", { name: "Training, licences and apprenticeships" })[1])
    expect((await screen.findAllByText("Cost: $1,450")).length).toBeGreaterThan(0)
    expect(screen.queryByText("This listing doesn't publish costs. Check with each provider.")).toBeNull()
    expect(screen.getAllByText("For: Registered Nurse").length).toBe(1)
  })

  test("OD-5 off: the server's reason, not a blank", async () => {
    local.getLearningLocal.mockImplementation((q) =>
      ok(listing({ kind: q.kind, state: "off", reason: "not_configured", data: [], total: null,
        note: "Local listings from CareerOneStop aren't set up on this tier yet." })))
    renderAt(`${B}/education`, <EducationPage />)
    await screen.findByText(BLOCK.homeStateNote)
    await userEvent.selectOptions(screen.getByRole("combobox"), "NC")
    await userEvent.click(screen.getAllByRole("button", { name: "Training, licences and apprenticeships" })[0])
    expect((await screen.findAllByText("Local listings from CareerOneStop aren't set up on this tier yet.")).length).toBe(3)
  })

  test("a failed local read is an alert", async () => {
    local.getLearningLocal.mockReturnValue(Promise.reject(Object.assign(new Error("x"), { response: { status: 500 } })))
    renderAt(`${B}/education`, <EducationPage />)
    await screen.findByText(BLOCK.homeStateNote)
    await userEvent.selectOptions(screen.getByRole("combobox"), "NC")
    await userEvent.click(screen.getAllByRole("button", { name: "Training, licences and apprenticeships" })[0])
    expect((await screen.findAllByRole("alert")).length).toBe(3)
  })

  test("Cost and Payback: the buttons above, and the figures exactly as the base renders them", async () => {
    const want = JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Record<string, string>
    renderAt(`${B}/cost?cip=1107&level=3&school=199193`, <CostPage />)
    await screen.findByText("Payback")
    expect(costBody()).toBe(want.costBody)
    const nav = screen.getByRole("navigation", { name: "Learning and Education" })
    expect(within(nav).getByRole("link", { name: "Cost and Payback" })).toHaveAttribute("aria-current", "page")
  })

  test("Cost and Payback without a school points back by the new name", async () => {
    renderAt(`${B}/cost`, <CostPage />)
    await screen.findByText("Pick a school first")
    expect(screen.getByRole("link", { name: "Go to Learning and Education Path" })).toBeInTheDocument()
  })

  test("My Plan stays (D8), with the buttons and the renamed section", async () => {
    renderAt(`${B}/plan`, <PlanPage />)
    await screen.findByText("Computer Science")
    const nav = screen.getByRole("navigation", { name: "Learning and Education" })
    expect(within(nav).getByRole("link", { name: "My Plan" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText("Learning and Education Path", { selector: "[class*='text-base']" })).toBeInTheDocument()
  })

  test("My Plan with no paths yet says so by the new name", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok({ ...PLAN, educationPaths: [] }))
    renderAt(`${B}/plan`, <PlanPage />)
    expect(await screen.findByText("Not yet — do Learning and Education Path first.")).toBeInTheDocument()
  })

  test("a button whose stage is not switched on is greyed out and says why", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true, false)))
    renderAt(`${B}/plan`, <PlanPage />)
    await screen.findByText("Computer Science")
    expect(screen.getByRole("button", { name: "Cost and Payback" })).toBeDisabled()
    expect(screen.getByText("Not switched on here yet.")).toBeInTheDocument()
  })
})

describe("the readers", () => {
  test("learningOf needs a real mark on the education stage", () => {
    expect(learningOf(undefined)).toBeNull()
    expect(learningOf(journey(false).stages)).toBeNull()
    expect(learningOf(journey(true).stages)?.buttons).toHaveLength(4)
    const empty = journey(true).stages.map((s) =>
      s.id === "education" ? { ...s, learning: { title: "t", buttons: [] } } : s)
    expect(learningOf(empty)).toBeNull()
  })

  test("learningBlockOf reads only the server's block", () => {
    expect(learningBlockOf(EDUCATION)).toBeNull()
    expect(learningBlockOf(undefined)).toBeNull()
    expect(learningBlockOf({ ...EDUCATION, learning: BLOCK } as DiscoveryEducation)).toEqual(BLOCK)
  })

  test("publishedCost never invents a figure", () => {
    expect(publishedCost({ id: null, title: "t" })).toBeNull()
    expect(publishedCost({ id: null, title: "t", cost: "" })).toBeNull()
    expect(publishedCost({ id: null, title: "t", cost: null })).toBeNull()
    expect(publishedCost({ id: null, title: "t", cost: "$2,000 per term" })).toBe("$2,000 per term")
    expect(publishedCost({ id: null, title: "t", cost: 2000 })).toBe("$2,000")
  })
})
