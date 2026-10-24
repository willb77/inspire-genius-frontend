/**
 * @jest-environment jsdom
 */
import type { ReactElement } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import * as core from "@/verticals/core"
import DiscoveryShell from "../DiscoveryShell"
import ComingNextPage from "../ComingNextPage"
import CostPage from "../CostPage"
import { costQueryFrom } from "../costQuery"
import EducationPage from "../EducationPage"
import type {
  DiscoveryCost,
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoverySchools,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/verticals/core", () => ({
  ...jest.requireActual("@/verticals/core"),
  useVerticalAccess: jest.fn(),
}))

const m = svc as jest.Mocked<typeof svc>
const access = core.useVerticalAccess as jest.Mock
const B = "/vertical/career-discovery"
const COST = `${B}/cost?cip=1107&level=3&school=199193`

function journey(educationOn: boolean, costOn: boolean): DiscoveryJourney {
  const stages = [
    ["land", true], ["about", true], ["who", true], ["careers", true], ["pays", true],
    ["goals", true], ["alignment", true], ["education", educationOn], ["cost", costOn], ["plan", true],
  ] as const
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: { land: "complete" },
    stages: stages.map(([id, available]) => ({
      id, name: id, question: `${id}?`, outcome: "o", available, state: "not_started" as const,
    })),
    nextAction: { id: "about", name: "About me", question: "q", outcome: "o", available: true },
    artefactKeys: [], createdAt: null, updatedAt: null,
  }
}

const AID = {
  grant: { vertical: "grant", path: "/vertical/grant/dashboard", label: "Work out your aid with GRANT" },
  studentAid: "https://studentaid.gov/h/apply-for-aid/fafsa",
  netPriceCalculator: "https://npc.example/",
}

function cost(over: Partial<DiscoveryCost> = {}): DiscoveryCost {
  return {
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
    missing: [], missingStatements: [], computable: true, aid: AID,
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

function renderAt(path: string, page: ReactElement = <CostPage />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="cost" element={page} />
            <Route path="education" element={<EducationPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  access.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey(true, false)))
  m.getDiscoveryCost.mockReturnValue(ok(cost()))
})

describe("switch off: the page DISC-2 shipped", () => {
  test.each([
    [false, false],
    [true, false],
  ])("education %s, cost off: exactly the Coming next page, nothing called", async (edu, c) => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(edu, c)))
    const before = renderAt(COST, <ComingNextPage stage="cost" />)
    await screen.findByText("Coming next")
    const want = before.container.innerHTML
    before.unmount()

    const after = renderAt(COST)
    await screen.findByText("Coming next")
    expect(after.container.innerHTML).toBe(want)
    expect(m.getDiscoveryCost).not.toHaveBeenCalled()
  })

  test("Education paths shows no cost link while cost is off", async () => {
    const edu: DiscoveryEducation = {
      areas: [], note: null, crosswalkSource: "c", entrySource: "e", schoolsSource: "s",
      paths: [{
        id: "1-1107", careerArea: "Data & Quantitative", areaRank: 1, fit: 80,
        occupations: [], credentials: [{ level: 3, title: "Bachelor's degree" }],
        field: { cip: "11.07", code: "1107", title: "Computer Science" }, why: "w", notes: [],
      }],
    }
    const schools: DiscoverySchools = {
      cip: "1107", level: 3, state: "NC", page: 0, perPage: 20, source: "s", total: 1,
      unavailable: false, note: null,
      schools: [{ id: 199193, name: "Example State University", city: null, state: "NC", url: null,
        program: { title: "Computer Science", credential: "Bachelor's Degree" } }],
    }
    m.getDiscoveryEducation.mockReturnValue(ok(edu))
    m.getDiscoverySchools.mockReturnValue(ok(schools))
    for (const costOn of [false, true]) {
      m.getDiscoveryJourney.mockReturnValue(ok(journey(true, costOn)))
      const view = renderAt(`${B}/education`)
      await userEvent.selectOptions(await screen.findByRole("combobox"), "NC")
      await userEvent.click(screen.getByRole("button", { name: "Schools: Bachelor's degree" }))
      const row = (await screen.findByText("Example State University")).closest("li") as HTMLElement
      // Scoped to the school's row: the stage nav has its own "Cost and payback" link.
      const link = within(row).queryByRole("link", { name: "Cost and payback" })
      if (costOn) {
        expect(link).toHaveAttribute("href", `${B}/cost?cip=1107&level=3&school=199193`)
      } else {
        expect(link).toBeNull()
      }
      view.unmount()
    }
  })
})

describe("switch on", () => {
  beforeEach(() => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true, true)))
  })

  test("without a school it points back to Education paths and asks nothing", async () => {
    renderAt(`${B}/cost`)
    await screen.findByText("Pick a school first")
    expect(screen.getByRole("link", { name: "Go to Education paths" })).toBeInTheDocument()
    expect(m.getDiscoveryCost).not.toHaveBeenCalled()
  })

  test("shows the server's ranges, sends no income, and hides GRANT without access", async () => {
    renderAt(COST)
    await screen.findByText("Payback")
    expect(m.getDiscoveryCost).toHaveBeenCalledWith({ cip: "1107", level: 3, school: 199193 })
    expect(screen.getByText("In all: $24,596 to $154,044")).toBeInTheDocument()
    expect(screen.getByText("about 4 months to about 3.8 years once you are working.")).toBeInTheDocument()
    expect(screen.queryByTestId("approximation-label")).toBeNull()
    expect(screen.queryByRole("link", { name: AID.grant.label })).toBeNull()
    expect(screen.getByRole("link", { name: "Federal student aid (FAFSA)" })).toBeInTheDocument()
  })

  test("links GRANT for people entitled to it", async () => {
    access.mockReturnValue({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] })
    renderAt(COST)
    const link = await screen.findByRole("link", { name: AID.grant.label })
    expect(link).toHaveAttribute("href", "/vertical/grant/dashboard")
  })

  test("labels the market approximation when program earnings are missing", async () => {
    m.getDiscoveryCost.mockReturnValue(ok(cost({
      earnings: {
        basis: "market", early: 61000, later: 132000, earlyYearsAfter: null, laterYearsAfter: null,
        approximation: true, source: "approximating BLS OEWS May 2024",
        label: "Approximation: ... OEWS ... Not live data.", occupations: [],
      },
    })))
    renderAt(COST)
    const label = await screen.findByTestId("approximation-label")
    expect(label).toHaveTextContent("Approximation")
    expect(screen.getByText(/The jobs it leads to/)).toBeInTheDocument()
  })

  test("a refusal shows every reason and no figure", async () => {
    m.getDiscoveryCost.mockReturnValue(ok(cost({
      computable: false, payback: null, totalCost: null, statement: null, netPrice: null,
      missing: ["net-price"], missingStatements: ["College Scorecard has no net price for this school."],
      note: "We can't put a payback on this path yet.",
    })))
    renderAt(COST)
    await screen.findByText("No payback figure for this path")
    expect(screen.getByText("College Scorecard has no net price for this school.")).toBeInTheDocument()
    expect(screen.getByText("We can't put a payback on this path yet.")).toBeInTheDocument()
    expect(screen.queryByText("Payback")).toBeNull()
  })

  test("payback that is never reached says so", async () => {
    m.getDiscoveryCost.mockReturnValue(ok(cost({
      payback: { low: null, high: null, unit: "years", reachable: false, highUnreachable: false, basis: "b", note: "n" },
    })))
    renderAt(COST)
    await screen.findByText("At those earnings it doesn't clearly pay back.")
  })

  test("only the later earnings pay back", async () => {
    m.getDiscoveryCost.mockReturnValue(ok(cost({
      payback: { low: 2.5, high: null, unit: "years", reachable: true, highUnreachable: true, basis: "b", note: "n" },
    })))
    renderAt(COST)
    await screen.findByText("about 2.5 years at best; at the early earnings it doesn't pay back.")
  })

  test("unavailable is a note, never a blank", async () => {
    m.getDiscoveryCost.mockReturnValue(ok({
      cip: "11.07", code: "1107", level: 3, schoolId: 199193, unavailable: true,
      note: "School lists aren't available right now.",
    }))
    renderAt(COST)
    await screen.findByText("Cost figures unavailable")
    expect(screen.getByText("School lists aren't available right now.")).toBeInTheDocument()
  })

  test("a server error is said out loud", async () => {
    m.getDiscoveryCost.mockReturnValue(
      Promise.reject(Object.assign(new Error("x"), { response: { status: 403, data: { detail: "Cost and payback isn't switched on yet on this tier." } } }))
    )
    renderAt(COST)
    expect(await screen.findByRole("alert")).toHaveTextContent("Cost and payback isn't switched on yet")
  })
})

describe("costQueryFrom", () => {
  test.each([
    ["cip=1107&level=3&school=199193", { cip: "1107", level: 3, school: 199193 }],
    ["cip=110&level=3&school=1", null],
    ["cip=1107&level=9&school=1", null],
    ["cip=1107&level=3&school=0", null],
    ["cip=1107&level=3", null],
    ["cip=11a7&level=3&school=1", null],
  ])("%s", (qs, want) => {
    expect(costQueryFrom(new URLSearchParams(qs))).toEqual(want)
  })
})
