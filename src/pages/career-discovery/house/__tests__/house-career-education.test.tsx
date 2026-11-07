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
import DiscoveryShell from "../../DiscoveryShell"
import CostPage from "../../CostPage"
import EducationPage from "../../EducationPage"
import PlanPage from "../../PlanPage"
import { costSearch, recallCost, rememberCost } from "../lastCost"
import type {
  DiscoveryCost,
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoveryPlan,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/verticals/core", () => ({
  ...jest.requireActual("@/verticals/core"),
  useVerticalAccess: jest.fn(),
}))

const m = svc as jest.Mocked<typeof svc>
const access = core.useVerticalAccess as jest.Mock
const B = "/vertical/career-discovery"
const SWITCH = "house_style_career-education"
const LAST = "career_discovery_last_cost"
const Q = "?cip=1107&level=3&school=199193"

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

const COST: DiscoveryCost = {
  cip: "11.07", code: "1107", level: 3, schoolId: 199193, unavailable: false, note: null,
  field: "Computer Science", credential: "Bachelor's degree",
  school: { id: 199193, name: "Example State University", priceCalculatorUrl: null },
  netPrice: null, yearsToComplete: null, totalCost: null, earnings: null, baseline: null, payback: null,
  statement: null, missing: [], missingStatements: [], computable: false, aid: null,
} as unknown as DiscoveryCost

const EDUCATION: DiscoveryEducation = {
  areas: [{ careerArea: "Data & Quantitative", fit: 82.4 }],
  paths: [
    {
      id: "1-1107", careerArea: "Data & Quantitative", areaRank: 1, fit: 82.4,
      occupations: [{ soc: "15-1252", title: "Software Developer", typicalEntry: "Bachelor's degree" }],
      credentials: [{ level: 3, title: "Bachelor's degree" }],
      field: { cip: "11.07", code: "1107", title: "Computer Science" },
      why: "Why.",
      notes: [],
    },
  ],
  note: null,
  crosswalkSource: "c",
  entrySource: "e",
  schoolsSource: "s",
}

function plan(comingNext: DiscoveryPlan["comingNext"]): DiscoveryPlan {
  return {
    schoolLevel: null, interests: [], careerAreas: [], goalsCount: 0, alignment: null,
    nextSteps: [], comingNext,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

function renderAt(path: string, extra: ReactElement | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="journey" element={<div>journey page</div>} />
            <Route path="cost" element={<CostPage />} />
            <Route path="education" element={<EducationPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="degree-plan" element={<div>degree plan page</div>} />
          </Route>
        </Routes>
        {extra}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const pageMenu = () => screen.getByRole("navigation", { name: "Career & Education Discovery" })

beforeEach(() => {
  jest.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  access.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey(true, true)))
  m.getDiscoveryCost.mockReturnValue(ok(COST))
  m.getDiscoveryEducation.mockReturnValue(ok(EDUCATION))
  m.advanceDiscovery.mockReturnValue(ok(journey(true, true)))
})

describe("switch OFF — today's page, unchanged", () => {
  test("page menu: ten entries, no Degree plan, Cost always bare even with a remembered school", async () => {
    sessionStorage.setItem(LAST, Q)
    renderAt(`${B}/journey`)
    await screen.findByText("journey page")
    const links = within(pageMenu()).getAllByRole("link")
    expect(links).toHaveLength(10)
    expect(within(pageMenu()).queryByRole("link", { name: "Degree plan" })).not.toBeInTheDocument()
    expect(within(pageMenu()).getByRole("link", { name: "Cost and payback" })).toHaveAttribute("href", `${B}/cost`)
  })

  test("Cost with no school: 'Pick a school first', nothing remembered offered", async () => {
    sessionStorage.setItem(LAST, Q)
    renderAt(`${B}/cost`)
    expect(await screen.findByText("Pick a school first")).toBeInTheDocument()
    expect(screen.queryByText("Choose a school first")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Open the last one you looked at" })).not.toBeInTheDocument()
  })

  test("Cost with a school writes nothing to session storage", async () => {
    renderAt(`${B}/cost${Q}`)
    await screen.findByText(/Computer Science/)
    expect(sessionStorage.getItem(LAST)).toBeNull()
  })

  test("Education: greyed Schools buttons carry no reason line", async () => {
    renderAt(`${B}/education`)
    const btn = await screen.findByRole("button", { name: "Schools: Bachelor's degree" })
    expect(btn).toBeDisabled()
    expect(btn).not.toHaveAttribute("aria-describedby")
    expect(screen.queryByText(/Choose a state above first/)).not.toBeInTheDocument()
  })

  test("My plan with nothing pending still prints today's 'Coming next: .'", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok(plan([])))
    renderAt(`${B}/plan`)
    expect(await screen.findByText("Coming next: .")).toBeInTheDocument()
  })
})

describe("switch ON — the S3a fixes", () => {
  beforeEach(() => localStorage.setItem(SWITCH, "true"))

  test("page menu gains Degree plan after Education paths when education is on", async () => {
    renderAt(`${B}/journey`)
    const plan = await within(pageMenu()).findByRole("link", { name: "Degree plan" })
    expect(plan).toHaveAttribute("href", `${B}/degree-plan`)
    const names = within(pageMenu()).getAllByRole("link").map((a) => a.textContent)
    expect(names).toHaveLength(11)
    expect(names.indexOf("Degree plan")).toBe(names.indexOf("Education paths") + 1)
  })

  test("no Degree plan entry while the server has education off", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(false, false)))
    renderAt(`${B}/journey`)
    await screen.findByText("journey page")
    expect(within(pageMenu()).queryByRole("link", { name: "Degree plan" })).not.toBeInTheDocument()
    expect(within(pageMenu()).getAllByRole("link")).toHaveLength(10)
  })

  test("Cost in the page menu reopens the last school and path from this tab", async () => {
    sessionStorage.setItem(LAST, Q)
    renderAt(`${B}/journey`)
    await screen.findByText("journey page")
    expect(within(pageMenu()).getByRole("link", { name: "Cost and payback" })).toHaveAttribute("href", `${B}/cost${Q}`)
  })

  test("opening a cost remembers it", async () => {
    renderAt(`${B}/cost${Q}`)
    await screen.findByText(/Computer Science/)
    expect(sessionStorage.getItem(LAST)).toBe(Q)
  })

  test("Cost with no school: says why, links to Education paths, no dead end", async () => {
    renderAt(`${B}/cost`)
    expect(await screen.findByText("Choose a school first")).toBeInTheDocument()
    expect(screen.queryByText("Pick a school first")).not.toBeInTheDocument()
    expect(screen.getByText(/prices and pay differ from school to school/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to Education paths" })).toHaveAttribute("href", `${B}/education`)
    expect(screen.queryByRole("link", { name: "Open the last one you looked at" })).not.toBeInTheDocument()
    expect(m.getDiscoveryCost).not.toHaveBeenCalled()
  })

  test("Cost with no school offers the remembered one", async () => {
    sessionStorage.setItem(LAST, Q)
    renderAt(`${B}/cost`)
    const link = await screen.findByRole("link", { name: "Open the last one you looked at" })
    expect(link).toHaveAttribute("href", `${B}/cost${Q}`)
  })

  test("Education: a greyed Schools button says why, and the reason goes once a state is chosen", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/education`)
    const btn = await screen.findByRole("button", { name: "Schools: Bachelor's degree" })
    expect(btn).toBeDisabled()
    const why = screen.getByText("Choose a state above first. Schools are listed by state.")
    expect(btn).toHaveAttribute("aria-describedby", why.id)
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    expect(btn).toBeEnabled()
    expect(btn).not.toHaveAttribute("aria-describedby")
    expect(screen.queryByText(/Choose a state above first/)).not.toBeInTheDocument()
  })

  test("My plan with nothing pending: no 'Coming next' line", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok(plan([])))
    renderAt(`${B}/plan`)
    await screen.findByText("Not yet — do Career areas first.")
    expect(screen.queryByText(/Coming next/)).not.toBeInTheDocument()
  })

  test("My plan with something pending still names it", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok(plan([{ stageId: "cost", name: "Cost and payback" }])))
    renderAt(`${B}/plan`)
    expect(await screen.findByText("Coming next: Cost and payback.")).toBeInTheDocument()
  })
})

describe("lastCost", () => {
  beforeEach(() => sessionStorage.clear())

  test("round-trips a valid query", () => {
    rememberCost(costSearch({ cip: "1107", level: 3, school: 199193 }))
    expect(recallCost()).toEqual({ cip: "1107", level: 3, school: 199193 })
  })

  test("nothing or junk stored reads as none", () => {
    expect(recallCost()).toBeNull()
    sessionStorage.setItem(LAST, "?cip=abc")
    expect(recallCost()).toBeNull()
  })

  test("storage that throws reads as none and never breaks the page", () => {
    const get = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => rememberCost(Q)).not.toThrow()
    expect(recallCost()).toBeNull()
    get.mockRestore()
    set.mockRestore()
  })
})
