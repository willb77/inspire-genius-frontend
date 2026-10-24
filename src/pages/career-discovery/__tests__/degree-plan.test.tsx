/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import * as pdf from "@/lib/exportDegreePlan"
import DiscoveryShell from "../DiscoveryShell"
import DegreePlanPage from "../DegreePlanPage"
import EducationPage from "../EducationPage"
import type {
  DegreePlanReady,
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoveryProgramsCatalog,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/lib/exportDegreePlan", () => ({
  ...jest.requireActual("@/lib/exportDegreePlan"),
  exportDegreePlanPdf: jest.fn(),
}))

const m = svc as jest.Mocked<typeof svc>
const exportPdf = pdf.exportDegreePlanPdf as jest.MockedFunction<typeof pdf.exportDegreePlanPdf>
const B = "/vertical/career-discovery"

function journey(educationOn = true): DiscoveryJourney {
  const ids = ["land", "about", "who", "careers", "pays", "goals", "alignment", "education", "cost", "plan"]
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: { land: "complete" },
    stages: ids.map((id) => ({
      id, name: id, question: `${id}?`, outcome: "o",
      available: id === "education" ? educationOn : id !== "cost", state: "not_started" as const,
    })),
    nextAction: { id: "about", name: "About me", question: "q", outcome: "o", available: true },
    artefactKeys: [], createdAt: null, updatedAt: null,
  }
}

function planData(over: Partial<DegreePlanReady> = {}): DegreePlanReady {
  return {
    available: true, reason: null, note: null,
    school: { id: "sch-a" },
    catalog: { id: "cat-a", catalogYear: "2025", version: 1 },
    inputs: {
      programIds: ["p-data"], load: "full_time", creditsPerTerm: 15,
      startTerm: { season: "fall", year: 2026 }, summer: false, droppedCompleted: 0,
    },
    options: {
      loads: { full_time: { min: 12, max: 15, default: 15 }, part_time: { min: 6, max: 9, default: 9 } },
      maxExtraPrograms: 2,
      programs: [
        { id: "p-data", code: "DAT100", title: "Data Analytics", credential: "AAS" },
        { id: "p-nur", code: "NUR100", title: "Nursing", credential: "AAS" },
      ],
    },
    checklist: [
      { id: "k-mat", code: "MAT 110", title: "College Algebra", credits: 3, completed: true },
      { id: "k-d101", code: "DAT 101", title: "Intro to Data", credits: 3, completed: false },
    ],
    plan: {
      engineVersion: "v1",
      load: { kind: "full_time", creditsPerTerm: 15, min: 12, max: 15, default: 15 },
      start: { season: "fall", year: 2026, label: "Fall 2026" },
      summer: false,
      refused: null,
      programs: [{ id: "p-data", code: "DAT100", title: "Data Analytics", credential: "AAS",
                   totalCredits: 64, requirementsMinimum: 60, openElectiveCredits: 4 }],
      terms: [
        { season: "fall", year: 2026, label: "Fall 2026", credits: 3, overLoad: false, note: null,
          courses: [{ id: "k-d101", code: "DAT 101", title: "Intro to Data", credits: 3,
                      whyNow: "Required: DAT100 — Core. Now, because you've done MAT 110.",
                      satisfies: [], after: [], alreadyDone: ["MAT 110"], with: [], unlocks: [],
                      offered: ["fall"], anyTerm: false, minGrades: [] }] },
        { season: "spring", year: 2027, label: "Spring 2027", credits: 0, overLoad: false,
          note: "No course can be taken this term: what is left waits for another season.", courses: [] },
      ],
      termsLeft: 1, creditsDone: 3, creditsLeft: 3,
      completedCounted: ["MAT 110"], completedNotCounted: [],
      expectedCompletion: { season: "fall", year: 2026, label: "Fall 2026" },
      alreadyComplete: false,
      notes: ["DAT100 lists 64 credits in all; its named requirements add up to 60."],
    },
    careers: [{ program: "DAT100", roleFamily: "Data & Quantitative", socCode: "15-2051",
                role: { id: "r1", title: "Data Analyst" }, overallFit: 81.4, prismFit: 77, fitMissing: [] }],
    fit: { available: true, state: "ok", asOf: "2026-10-20T10:00:00", reason: null },
    costToFinish: { available: true, terms: 1, low: 2000, high: 6000, perTerm: { low: 2000, high: 6000 },
                    basis: "net price per year ÷ 2 per term × the terms left in this plan" },
    gaps: { available: true, targetRole: null, targetRolePending: true, gapsPending: true, counts: {},
            items: [], note: "No behaviour or skill gaps are on file yet." },
    socCodeNote: "SOC codes are checked for format only.",
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })
const axiosError = (status: number, detail: string) =>
  Object.assign(new Error("x"), { response: { status, data: { detail } } })

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`${B}/${path}`]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="degree-plan" element={<DegreePlanPage />} />
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
  m.getDegreePlan.mockReturnValue(ok(planData()))
  m.saveDegreePlanInputs.mockReturnValue(
    ok({ saved: { catalogId: "cat-a", programIds: ["p-data"], completedCourseIds: ["k-mat"],
                  load: "full_time", creditsPerTerm: 15, startTerm: { season: "fall", year: 2026 },
                  summer: false } })
  )
})

describe("the page", () => {
  test("education off: the same Coming next page, and no plan call", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(false)))
    renderAt("degree-plan")
    expect(await screen.findByText("Coming next")).toBeInTheDocument()
    expect(m.getDegreePlan).not.toHaveBeenCalled()
  })

  test("not switched on (403): said plainly with the server's words, not as a failure", async () => {
    m.getDegreePlan.mockReturnValue(
      Promise.reject(axiosError(403, "The degree plan isn't switched on yet on this tier.")) as never
    )
    renderAt("degree-plan")
    expect(await screen.findByText("Not switched on here yet")).toBeInTheDocument()
    expect(screen.getByText("The degree plan isn't switched on yet on this tier.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  test("any other failure is an alert", async () => {
    m.getDegreePlan.mockReturnValue(Promise.reject(axiosError(500, "Boom.")) as never)
    renderAt("degree-plan")
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom.")
  })

  test("no program chosen: the server's note and a way back", async () => {
    m.getDegreePlan.mockReturnValue(ok({ available: true, reason: "no_program",
      note: "Choose a program at your school first.", plan: null }))
    renderAt("degree-plan")
    expect(await screen.findByText("Choose a program at your school first.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to Education paths" })).toBeInTheDocument()
  })

  test("shows the terms, credits, completion, careers with both fits, cost and gaps", async () => {
    renderAt("degree-plan")
    expect(await screen.findByRole("heading", { name: "Your plan" })).toBeInTheDocument()
    expect(screen.getByText("Credits done").nextSibling).toHaveTextContent("3")
    expect(screen.getByText("Expected to finish").nextSibling).toHaveTextContent("Fall 2026")
    const terms = screen.getByRole("region", { name: "Terms" })
    expect(within(terms).getByText(/Required: DAT100 — Core\. Now, because you've done MAT 110\./)).toBeInTheDocument()
    expect(within(terms).getByText(/what is left waits for another season/)).toBeInTheDocument()
    expect(screen.getByText(/Overall fit 81%/)).toBeInTheDocument()
    expect(screen.getByText(/PRISM fit 77%/)).toBeInTheDocument()
    expect(screen.getByText("$2,000 to $6,000 after grants, over 1 term.")).toBeInTheDocument()
    expect(screen.getByText("No behaviour or skill gaps are on file yet.")).toBeInTheDocument()
  })

  test("a refusal is shown by name, with no terms", async () => {
    const d = planData()
    d.plan = { ...d.plan, refused: { code: "missing_course", names: ["CAP 299"],
      statement: "This catalog is missing CAP 299, which the plan needs." }, terms: [] }
    m.getDegreePlan.mockReturnValue(ok(d))
    renderAt("degree-plan")
    expect(await screen.findByRole("alert")).toHaveTextContent("missing CAP 299")
    expect(screen.queryByRole("region", { name: "Terms" })).not.toBeInTheDocument()
  })

  test("fits absent say why, and a cost refusal shows its statements", async () => {
    m.getDegreePlan.mockReturnValue(ok(planData({
      careers: [{ program: "DAT100", roleFamily: "Data & Quantitative", socCode: null, role: null,
                  overallFit: null, prismFit: null, fitMissing: [] }],
      fit: { available: false, state: "not_enabled", asOf: null,
             reason: "Overall fit isn't available to you here (it needs Career Fit)." },
      costToFinish: { available: false, reason: "refused", note: "We can't put a cost on this yet.",
                      missingStatements: ["Scorecard does not list this field here."] },
    })))
    renderAt("degree-plan")
    expect(await screen.findByText(/it needs Career Fit/)).toBeInTheDocument()
    expect(screen.queryByText(/Overall fit \d/)).not.toBeInTheDocument()
    expect(screen.getByText("Scorecard does not list this field here.")).toBeInTheDocument()
  })

  test("saving sends ids and settings only", async () => {
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.click(screen.getByRole("checkbox", { name: /DAT 101/ }))
    await userEvent.selectOptions(screen.getByLabelText("Load"), "part_time")
    await userEvent.click(screen.getByRole("checkbox", { name: /Nursing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }))
    await waitFor(() => expect(m.saveDegreePlanInputs).toHaveBeenCalledTimes(1))
    expect(m.saveDegreePlanInputs).toHaveBeenCalledWith({
      completedCourseIds: ["k-mat", "k-d101"], load: "part_time", creditsPerTerm: 9,
      startTerm: { season: "fall", year: 2026 }, summer: false, extraProgramIds: ["p-nur"],
    })
  })

  test("credits outside the load band are refused before sending", async () => {
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    const credits = screen.getByLabelText("Credits a term")
    await userEvent.clear(credits)
    await userEvent.type(credits, "18")
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }))
    expect(await screen.findByText("Full-time is 12 to 15 credits a term.")).toBeInTheDocument()
    expect(m.saveDegreePlanInputs).not.toHaveBeenCalled()
  })

  test("a summer start needs summer terms", async () => {
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.selectOptions(screen.getByLabelText("Start term"), "summer")
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }))
    expect(await screen.findByText("Turn on summer terms to start in a summer.")).toBeInTheDocument()
    expect(m.saveDegreePlanInputs).not.toHaveBeenCalled()
  })

  test("a server refusal on save is shown", async () => {
    m.saveDegreePlanInputs.mockReturnValue(
      Promise.reject(axiosError(422, "Not in your school's catalog: zzz.")) as never
    )
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Not in your school's catalog: zzz.")
  })

  test("too many extra programs can't be sent", async () => {
    const d = planData()
    d.options = { ...d.options, maxExtraPrograms: 1, programs: [
      ...d.options.programs, { id: "p-art", code: "ART100", title: "Studio Art", credential: "certificate" }] }
    m.getDegreePlan.mockReturnValue(ok(d))
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.click(screen.getByRole("checkbox", { name: /Nursing/ }))
    await userEvent.click(screen.getByRole("checkbox", { name: /Studio Art/ }))
    expect(screen.getByText(/Choose at most 1 programs/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Update my plan" })).toBeDisabled()
  })

  test("Download PDF builds it from the plan on the page", async () => {
    exportPdf.mockResolvedValue(undefined)
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }))
    expect(exportPdf).toHaveBeenCalledWith(expect.objectContaining({ catalog: planData().catalog }))
  })

  test("a PDF failure is said", async () => {
    exportPdf.mockRejectedValue(new Error("no"))
    renderAt("degree-plan")
    await screen.findByRole("heading", { name: "Your plan" })
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("The PDF couldn't be made.")
  })
})

// ─── the link from Programs at your school ──────────────────────────────

function education(): DiscoveryEducation {
  return {
    areas: [], paths: [], note: "Do Career areas first.", crosswalkSource: "c", entrySource: "e",
    schoolsSource: "s", programsAvailable: true,
  }
}

function catalog(chosen: string | null): DiscoveryProgramsCatalog {
  return {
    mode: "catalog", school: { id: "sch-a", name: "Alpha" },
    catalog: { id: "cat-a", catalogYear: "2025", version: 1 }, programs: [],
    weights: { fit: 50, affinity: 30, goal: 20 }, engineVersion: "v1",
    fit: { available: false, state: "not_enabled", asOf: null, reason: "r" },
    chosenProgramId: chosen, socCodeNote: "s",
  }
}

describe("the way in from Programs at your school", () => {
  beforeEach(() => {
    m.getDiscoveryEducation.mockReturnValue(ok(education()))
    m.getProgramSchools.mockReturnValue(ok({ available: true, schools: [{ id: "sch-a", name: "Alpha", suggested: true }],
                                             chosenSchoolId: "sch-a", note: null }))
  })

  test("a chosen program links to the plan when the server offers it", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog("p-data")))
    renderAt("education")
    expect(await screen.findByRole("link", { name: /See your degree plan/ })).toBeInTheDocument()
  })

  test("no link when the plan isn't switched on (403)", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog("p-data")))
    m.getDegreePlan.mockReturnValue(Promise.reject(axiosError(403, "off")) as never)
    renderAt("education")
    await screen.findByText(/2025 catalog/)
    await waitFor(() => expect(m.getDegreePlan).toHaveBeenCalled())
    expect(screen.queryByRole("link", { name: /See your degree plan/ })).not.toBeInTheDocument()
  })

  test("no program chosen: no link and no plan call", async () => {
    m.getProgramSuggestions.mockReturnValue(ok(catalog(null)))
    renderAt("education")
    await screen.findByText(/2025 catalog/)
    expect(m.getDegreePlan).not.toHaveBeenCalled()
    expect(screen.queryByRole("link", { name: /See your degree plan/ })).not.toBeInTheDocument()
  })
})
