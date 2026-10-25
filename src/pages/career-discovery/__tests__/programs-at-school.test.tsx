/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import DiscoveryShell from "../DiscoveryShell"
import EducationPage from "../EducationPage"
import type {
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoveryProgramSchools,
  DiscoveryProgramsCatalog,
  ProgramCard,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")

const m = svc as jest.Mocked<typeof svc>
const B = "/vertical/career-discovery"

function journey(): DiscoveryJourney {
  const ids = ["land", "about", "who", "careers", "pays", "goals", "alignment", "education", "cost", "plan"]
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: { land: "complete" },
    stages: ids.map((id) => ({
      id, name: id, question: `${id}?`, outcome: "o", available: id !== "cost", state: "not_started" as const,
    })),
    nextAction: { id: "about", name: "About me", question: "q", outcome: "o", available: true },
    artefactKeys: [], createdAt: null, updatedAt: null,
  }
}

function education(programsAvailable?: boolean): DiscoveryEducation {
  return {
    areas: [{ careerArea: "Data & Quantitative", fit: 82.4 }],
    paths: [{
      id: "1-1107", careerArea: "Data & Quantitative", areaRank: 1, fit: 82.4,
      occupations: [{ soc: "15-1252", title: "Software Developer", typicalEntry: "Bachelor's degree" }],
      credentials: [{ level: 3, title: "Bachelor's degree" }],
      field: { cip: "11.07", code: "1107", title: "Computer Science" },
      why: "Public path why.", notes: [],
    }],
    note: null, crosswalkSource: "c", entrySource: "e", schoolsSource: "s",
    ...(programsAvailable === undefined ? {} : { programsAvailable }),
  }
}

const SCHOOLS: DiscoveryProgramSchools = {
  available: true,
  schools: [
    { id: "sch-a", name: "Alpha Community College", suggested: true },
    { id: "sch-c", name: "Gamma University", suggested: false },
  ],
  chosenSchoolId: null,
  note: null,
}

function card(over: Partial<ProgramCard>): ProgramCard {
  return {
    id: "p-data", code: "DAT100", title: "Data Analytics", credential: "AAS", totalCredits: 64,
    careers: [{ roleFamily: "Data & Quantitative", role: { id: "r1", title: "Data Analyst" }, socCode: "15-2051" }],
    components: {
      fit: { status: "scored", score: 87, role: { id: "r1", title: "Data Analyst" }, used: ["prism"], missing: [] },
      affinity: { status: "scored", score: 82.4, family: "Data & Quantitative" },
      goal: { status: "scored", score: 0, goalFamilies: ["People & Care"], matched: [] },
    },
    score: 83.2, rank: 1,
    why: "Data Analytics (AAS, 64 credits) leads to Data & Quantitative, including Data Analyst.",
    note: null,
    ...over,
  }
}

function catalog(over: Partial<DiscoveryProgramsCatalog> = {}): DiscoveryProgramsCatalog {
  return {
    mode: "catalog",
    school: { id: "sch-a", name: "Alpha Community College" },
    catalog: { id: "cat-a", catalogYear: "2025", version: 1 },
    programs: [
      card({}),
      card({
        id: "p-art", code: "ART100", title: "Studio Art", credential: "Certificate", totalCredits: 30,
        careers: [], score: null, rank: null, note: "Not enough to rank this program yet.",
        why: "Studio Art (Certificate, 30 credits) hasn't been linked to careers yet.",
        components: {
          fit: { status: "no_linked_role", reason: "This program isn't linked to a specific role you can open." },
          affinity: { status: "no_families", reason: "This program hasn't been linked to careers yet." },
          goal: { status: "no_families", reason: "This program hasn't been linked to careers yet." },
        },
      }),
    ],
    weights: { fit: 50, affinity: 30, goal: 20 },
    engineVersion: "v1",
    fit: { available: true, state: "ok", asOf: "2026-10-20T10:00:00", reason: null },
    chosenProgramId: null,
    socCodeNote: "SOC codes are checked for format only.",
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })
const axiosError = (status: number, detail: string) =>
  Object.assign(new Error("x"), { response: { status, data: { detail } } })

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`${B}/education`]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="education" element={<EducationPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey()))
  m.getDiscoveryEducation.mockReturnValue(ok(education(true)))
  m.getProgramSchools.mockReturnValue(ok(SCHOOLS))
  m.getProgramSuggestions.mockReturnValue(ok(catalog()))
  m.saveProgramChoice.mockReturnValue(
    ok({ saved: { schoolId: "sch-a", catalogId: "cat-a", programId: "p-data" } })
  )
})

describe("switch off: Education paths exactly as before", () => {
  test.each([undefined, false])("programsAvailable=%s → no section, no program call", async (flag) => {
    m.getDiscoveryEducation.mockReturnValue(ok(education(flag)))
    renderPage()
    await screen.findByText("Computer Science")
    expect(screen.queryByText("Programs at your school")).not.toBeInTheDocument()
    expect(m.getProgramSchools).not.toHaveBeenCalled()
    expect(m.getProgramSuggestions).not.toHaveBeenCalled()
  })
})

describe("switch on", () => {
  test("preselects the one suggested school and shows ranked programs with their why", async () => {
    renderPage()
    expect(await screen.findByRole("heading", { name: "Programs at your school" })).toBeInTheDocument()
    await screen.findByText("1. Data Analytics")
    expect(m.getProgramSuggestions).toHaveBeenCalledWith("sch-a")
    expect(screen.getByRole("combobox", { name: /your school/i })).toHaveValue("sch-a")
    expect(screen.getByText(/leads to Data & Quantitative, including Data Analyst/)).toBeInTheDocument()
    expect(screen.getByText("Overall fit: 87% with Data Analyst")).toBeInTheDocument()
    expect(screen.getByText("Career area: 82% natural fit (Data & Quantitative)")).toBeInTheDocument()
    expect(screen.getByText("Your goals: they point to other career areas")).toBeInTheDocument()
    expect(screen.getByText(/DAT100 · AAS · 64 credits/)).toBeInTheDocument()
    expect(screen.getByText("Data Analyst · 15-2051")).toBeInTheDocument()
    expect(screen.getByText(/Fit as of your last Career Fit visit \(2026-10-20\)/)).toBeInTheDocument()
    // The unranked program says why it has no number, and keeps the server's order.
    const items = screen.getAllByRole("listitem").filter((li) => within(li).queryByRole("button"))
    expect(within(items[1]).getByText(/Not enough to rank this program yet/)).toBeInTheDocument()
    expect(
      within(items[1]).getByText("Overall fit: This program isn't linked to a specific role you can open.")
    ).toBeInTheDocument()
    // The public paths still stand below.
    expect(screen.getByText("Computer Science")).toBeInTheDocument()
  })

  test("with no saved or single suggested school, asks before calling", async () => {
    m.getProgramSchools.mockReturnValue(
      ok({ ...SCHOOLS, schools: SCHOOLS.schools.map((s) => ({ ...s, suggested: false })) })
    )
    renderPage()
    const select = await screen.findByRole("combobox", { name: /your school/i })
    expect(select).toHaveValue("")
    expect(m.getProgramSuggestions).not.toHaveBeenCalled()
    await userEvent.selectOptions(select, "sch-c")
    await waitFor(() => expect(m.getProgramSuggestions).toHaveBeenCalledWith("sch-c"))
  })

  test("a saved school wins over the suggestion", async () => {
    m.getProgramSchools.mockReturnValue(ok({ ...SCHOOLS, chosenSchoolId: "sch-c" }))
    renderPage()
    await screen.findByText("1. Data Analytics")
    expect(m.getProgramSuggestions).toHaveBeenCalledWith("sch-c")
  })

  test("choosing a program saves ids only and marks it", async () => {
    renderPage()
    await screen.findByText("1. Data Analytics")
    await userEvent.click(screen.getAllByRole("button", { name: "Choose this program" })[0])
    await waitFor(() =>
      expect(m.saveProgramChoice).toHaveBeenCalledWith({ schoolId: "sch-a", programId: "p-data" })
    )
  })

  test("the saved choice reads as 'Your choice' and can't be re-sent", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog({ chosenProgramId: "p-data" })))
    renderPage()
    expect(await screen.findByRole("button", { name: "Your choice" })).toBeDisabled()
  })

  test("a failed save is said out loud", async () => {
    m.saveProgramChoice.mockReturnValue(Promise.reject(axiosError(404, "Not found.")))
    renderPage()
    await screen.findByText("1. Data Analytics")
    await userEvent.click(screen.getAllByRole("button", { name: "Choose this program" })[0])
    expect(await screen.findByRole("alert")).toHaveTextContent("Not found.")
  })

  test("no published catalog: the server's note, above the public paths", async () => {
    m.getProgramSuggestions.mockReturnValue(ok({
      mode: "public_paths", reason: "no_catalog",
      note: "That school hasn't published its catalog here yet, so these are public education paths rather than its own programs.",
      school: { id: "sch-a", name: "Alpha Community College" },
    }))
    renderPage()
    expect(await screen.findByText("Public education paths for now")).toBeInTheDocument()
    expect(screen.getByText(/hasn't published its catalog here yet/)).toBeInTheDocument()
    expect(screen.getByText("Computer Science")).toBeInTheDocument()
  })

  test("catalogs not available on this tier: one plain note, no school list", async () => {
    // Even a saved school id from an earlier visit must not lead to a program call.
    m.getProgramSchools.mockReturnValue(ok({
      available: false, schools: [], chosenSchoolId: "sch-a",
      note: "School catalogs aren't available here yet, so these are public education paths rather than a school's own programs.",
    }))
    renderPage()
    expect(await screen.findByText(/School catalogs aren't available here yet/)).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /your school/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Programs at your school" })).not.toBeInTheDocument()
    expect(m.getProgramSuggestions).not.toHaveBeenCalled()
  })

  test("no school has published yet: the server's note instead of an empty select", async () => {
    m.getProgramSchools.mockReturnValue(ok({
      available: true, schools: [], chosenSchoolId: null,
      note: "No school has published its catalog here yet.",
    }))
    renderPage()
    expect(await screen.findByText("No school has published its catalog here yet.")).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /your school/i })).not.toBeInTheDocument()
  })

  test("fit not available: the reason is shown, not a missing number", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog({
      fit: { available: false, state: "no_fit_scores", asOf: null,
             reason: "Open Career Fit once to see your fit with these roles here." },
    })))
    renderPage()
    expect(await screen.findByText("Open Career Fit once to see your fit with these roles here.")).toBeInTheDocument()
  })

  test("failed reads are alerts, never blank", async () => {
    m.getProgramSchools.mockReturnValue(Promise.reject(axiosError(503, "School catalogs aren't set up.")))
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent("School catalogs aren't set up.")
  })

  test("a failed program list is an alert", async () => {
    m.getProgramSuggestions.mockReturnValue(Promise.reject(axiosError(403, "Program suggestions aren't switched on yet on this tier.")))
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent("Program suggestions aren't switched on")
  })

  test("the section also shows when there are no public paths yet", async () => {
    m.getDiscoveryEducation.mockReturnValue(ok({ ...education(true), paths: [], note: "Do Career areas first." }))
    renderPage()
    expect(await screen.findByRole("heading", { name: "Programs at your school" })).toBeInTheDocument()
    expect(screen.getByText("Do Career areas first.")).toBeInTheDocument()
  })
})

describe("service", () => {
  test("the three calls hit the engine's Discovery prefix", async () => {
    const real = jest.requireActual<typeof svc>("@/services/career-discovery/careerDiscovery.service")
    // jest.setup mocks @/lib/agentApi globally; give its get/put their own recorders here.
    const { agentApi } = jest.requireMock<{ agentApi: Record<string, unknown> }>("@/lib/agentApi")
    const saved = { get: agentApi.get, put: agentApi.put }
    const get = jest.fn().mockResolvedValue({ data: { status: true, data: {} } })
    const put = jest.fn().mockResolvedValue({ data: { status: true, data: {} } })
    Object.assign(agentApi, { get, put })
    try {
      await real.getProgramSchools()
      await real.getProgramSuggestions("sch-a")
      await real.getProgramSuggestions(null)
      await real.saveProgramChoice({ schoolId: "sch-a", programId: "p" })
    } finally {
      Object.assign(agentApi, saved)
    }
    expect(get).toHaveBeenNthCalledWith(1, "/v1/agents/career-discovery/education/programs/schools")
    expect(get).toHaveBeenNthCalledWith(2, "/v1/agents/career-discovery/education/programs", {
      params: { school: "sch-a" },
    })
    expect(get).toHaveBeenNthCalledWith(3, "/v1/agents/career-discovery/education/programs", { params: {} })
    expect(put).toHaveBeenCalledWith("/v1/agents/career-discovery/education/programs/choice", {
      schoolId: "sch-a", programId: "p",
    })
  })
})

describe("CURU-F1: a choice carried to a new catalog version", () => {
  const carried = { ...{
  fromCatalog: { id: "cat-a", catalogYear: "2025", version: 1 },
  toCatalog: { id: "cat-a2", catalogYear: "2025", version: 2 },
  programsNotCarried: [],
  coursesNotCarried: ["ELE 1"],
  note: "Your school published version 2 of its 2025 catalog, so your saved plan was moved to it from version 1. 1 course you'd ticked is no longer in it: ELE 1.",
}, coursesNotCarried: [],
    note: "Your school published version 2 of its 2025 catalog, so your saved plan was moved to it from version 1. Everything you'd chosen and ticked is still in it." }

  test("the list says the choice moved, and the carried program is still 'Your choice'", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog({
      catalog: { id: "cat-a2", catalogYear: "2025", version: 2 },
      chosenProgramId: "p-data", carriedForward: carried })))
    renderPage()
    expect(await screen.findByText("Your choice moved to the new catalog")).toBeInTheDocument()
    expect(screen.getByText(carried.note)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Your choice" })).toBeDisabled()
  })

  test("no carriedForward, no notice", async () => {
    renderPage()
    await screen.findByText("1. Data Analytics")
    expect(screen.queryByText("Your choice moved to the new catalog")).not.toBeInTheDocument()
  })
})
