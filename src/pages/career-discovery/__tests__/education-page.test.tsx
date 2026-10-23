/**
 * @jest-environment jsdom
 */
import type { ReactElement } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import DiscoveryShell from "../DiscoveryShell"
import ComingNextPage from "../ComingNextPage"
import EducationPage from "../EducationPage"
import PlanPage from "../PlanPage"
import type {
  DiscoveryEducation,
  DiscoveryJourney,
  DiscoveryPlan,
  DiscoverySchools,
} from "@/types/career-discovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")

const m = svc as jest.Mocked<typeof svc>
const B = "/vertical/career-discovery"

function journey(educationOn: boolean): DiscoveryJourney {
  const stages = [
    ["land", true], ["about", true], ["who", true], ["careers", true], ["pays", true],
    ["goals", true], ["alignment", true], ["education", educationOn], ["cost", false], ["plan", true],
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

const EDUCATION: DiscoveryEducation = {
  areas: [{ careerArea: "Data & Quantitative", fit: 82.4 }],
  paths: [
    {
      id: "1-1107", careerArea: "Data & Quantitative", areaRank: 1, fit: 82.4,
      occupations: [{ soc: "15-1252", title: "Software Developer", typicalEntry: "Bachelor's degree" }],
      credentials: [{ level: 3, title: "Bachelor's degree" }],
      field: { cip: "11.07", code: "1107", title: "Computer Science" },
      why: "Data & Quantitative is your top career area (82% natural fit). Software Developer usually starts with: bachelor's degree. Studying Computer Science leads there, through a bachelor's degree.",
      notes: [],
    },
    {
      id: "1-5138", careerArea: "People & Care", areaRank: 2, fit: null,
      occupations: [{ soc: "29-1141", title: "Registered Nurse", typicalEntry: "Bachelor's degree" }],
      credentials: [{ level: 3, title: "Bachelor's degree" }, { level: 2, title: "Associate degree" }],
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

function schools(over: Partial<DiscoverySchools> = {}): DiscoverySchools {
  return {
    cip: "1107", level: 3, state: "NC", page: 0, perPage: 20, source: "s", total: 25,
    unavailable: false, note: null,
    schools: [
      { id: 1, name: "Example State University", city: "Boone", state: "NC", url: "www.example.edu/",
        program: { title: "Computer Science", credential: "Bachelor's Degree" } },
      { id: 2, name: "Example College", city: null, state: "NC", url: null,
        program: { title: "Computer Science", credential: "Bachelor's Degree" } },
    ],
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })
const axiosError = (status: number, detail: string) =>
  Object.assign(new Error("x"), { response: { status, data: { detail } } })

function renderAt(path: string, education: ReactElement = <EducationPage />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="education" element={education} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="careers" element={<div>careers page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey(false)))
  m.advanceDiscovery.mockReturnValue(ok(journey(false)))
  m.getDiscoveryEducation.mockReturnValue(ok(EDUCATION))
  m.getDiscoverySchools.mockReturnValue(ok(schools()))
})

describe("switch off: the page DISC-1 shipped", () => {
  test("renders exactly the Coming next page and calls nothing new", async () => {
    const before = renderAt(`${B}/education`, <ComingNextPage stage="education" />)
    await screen.findByText("Coming next")
    const want = before.container.innerHTML
    before.unmount()

    const after = renderAt(`${B}/education`)
    await screen.findByText("Coming next")
    expect(after.container.innerHTML).toBe(want)
    expect(m.getDiscoveryEducation).not.toHaveBeenCalled()
    expect(m.getDiscoverySchools).not.toHaveBeenCalled()
  })

  test("My plan shows no education block when the server sends none", async () => {
    const plan: DiscoveryPlan = {
      schoolLevel: null, interests: [], careerAreas: [], goalsCount: 0, alignment: null,
      nextSteps: [], comingNext: [{ stageId: "education", name: "Education paths" }],
    }
    m.getDiscoveryPlan.mockReturnValue(ok(plan))
    renderAt(`${B}/plan`)
    await screen.findByText("My plan")
    expect(screen.queryByRole("heading", { name: "Education paths" })).not.toBeInTheDocument()
    expect(screen.queryByText("Not yet — do Education paths first.")).not.toBeInTheDocument()
  })
})

describe("switch on", () => {
  beforeEach(() => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true)))
  })

  test("shows each path with its why, notes and sources", async () => {
    renderAt(`${B}/education`)
    expect(await screen.findByText("Computer Science")).toBeInTheDocument()
    expect(screen.getByText(/Studying Computer Science leads there/)).toBeInTheDocument()
    expect(screen.getByText("Data & Quantitative · 82% natural fit")).toBeInTheDocument()
    expect(screen.getByText("People & Care")).toBeInTheDocument()
    expect(screen.getByText(/associate degree in nursing/)).toBeInTheDocument()
    expect(screen.getByText("Fields of study: NCES crosswalk.")).toBeInTheDocument()
    expect(screen.getByText("Schools: College Scorecard.")).toBeInTheDocument()
    expect(screen.getByText(/It isn.t saved/)).toBeInTheDocument()
  })

  test("no school lookup until a state is chosen; then exactly that field, level and state", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    const nursing = screen.getAllByRole("button", { name: "Schools: Associate degree" })[0]
    expect(nursing).toBeDisabled()
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    await waitFor(() => expect(m.getDiscoverySchools).toHaveBeenCalledWith({ cip: "1107", level: 3, state: "NC" }))
    const link = await screen.findByRole("link", { name: "Example State University" })
    expect(link).toHaveAttribute("href", "https://www.example.edu/")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByText("Example College")).toBeInTheDocument()
    expect(screen.getByText("Showing 2 of 25 schools, A to Z.")).toBeInTheDocument()
  })

  test("changing the state re-asks for the same path", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    await screen.findByText("Example College")
    await user.selectOptions(screen.getByRole("combobox"), "VA")
    await waitFor(() => expect(m.getDiscoverySchools).toHaveBeenLastCalledWith({ cip: "1107", level: 3, state: "VA" }))
  })

  test("clearing the state clears the list", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    await screen.findByText("Example College")
    await user.selectOptions(screen.getByRole("combobox"), "")
    expect(screen.queryByText("Example College")).not.toBeInTheDocument()
  })

  test("the list sits under the path that asked for it", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/education`)
    await screen.findByText("Registered Nursing")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getByRole("button", { name: "Schools: Associate degree" }))
    const items = screen.getAllByRole("listitem")
    const nursingCard = items.find((li) => within(li).queryByText("Registered Nursing"))
    expect(nursingCard).toBeDefined()
    expect(await within(nursingCard as HTMLElement).findByText("Example College")).toBeInTheDocument()
    expect(m.getDiscoverySchools).toHaveBeenCalledWith({ cip: "5138", level: 2, state: "NC" })
  })

  test("unavailable school lists say so, never 'no schools'", async () => {
    const user = userEvent.setup()
    m.getDiscoverySchools.mockReturnValue(ok(schools({
      schools: [], total: null, unavailable: true, note: "School lists aren't available right now.",
    })))
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    expect(await screen.findByText("School lists unavailable")).toBeInTheDocument()
    expect(screen.getByText("School lists aren't available right now.")).toBeInTheDocument()
  })

  test("a state with none says so", async () => {
    const user = userEvent.setup()
    m.getDiscoverySchools.mockReturnValue(ok(schools({ schools: [], total: 0, note: "No school in this state." })))
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "WY")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    expect(await screen.findByText("No schools found")).toBeInTheDocument()
    expect(screen.getByText("No school in this state.")).toBeInTheDocument()
  })

  test("a small list counts itself", async () => {
    const user = userEvent.setup()
    m.getDiscoverySchools.mockReturnValue(ok(schools({ total: 1, schools: schools().schools.slice(0, 1) })))
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    expect(await screen.findByText("1 school, A to Z.")).toBeInTheDocument()
  })

  test("a failed school lookup is an alert", async () => {
    const user = userEvent.setup()
    m.getDiscoverySchools.mockRejectedValue(axiosError(422, "Unknown field, level or state."))
    renderAt(`${B}/education`)
    await screen.findByText("Computer Science")
    await user.selectOptions(screen.getByRole("combobox"), "NC")
    await user.click(screen.getAllByRole("button", { name: "Schools: Bachelor's degree" })[0])
    expect(await screen.findByRole("alert")).toHaveTextContent("Unknown field, level or state.")
  })

  test("no career areas yet: the server's note and a way back", async () => {
    m.getDiscoveryEducation.mockReturnValue(ok({ ...EDUCATION, paths: [], areas: [], note: "Do Career areas first." }))
    renderAt(`${B}/education`)
    expect(await screen.findByText("Do Career areas first.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to Career areas" })).toHaveAttribute(
      "href", `${B}/careers`
    )
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })

  test("a failed read is an alert, not a blank page", async () => {
    m.getDiscoveryEducation.mockRejectedValue(axiosError(403, "Education paths aren't switched on yet on this tier."))
    renderAt(`${B}/education`)
    expect(await screen.findByRole("alert")).toHaveTextContent("Education paths aren't switched on yet")
  })

  test("My plan lists recorded education paths, or says not yet", async () => {
    const plan: DiscoveryPlan = {
      schoolLevel: null, interests: [], careerAreas: [], goalsCount: 0, alignment: null,
      nextSteps: [], comingNext: [{ stageId: "cost", name: "Cost and payback" }],
      educationPaths: [{ careerArea: "Data & Quantitative", field: "Data Science", credential: "Bachelor's degree" }],
    }
    m.getDiscoveryPlan.mockReturnValue(ok(plan))
    const first = renderAt(`${B}/plan`)
    expect(await screen.findByText(/^Data Science/)).toBeInTheDocument()
    expect(screen.getByText("— Bachelor's degree, for Data & Quantitative")).toBeInTheDocument()
    first.unmount()

    m.getDiscoveryPlan.mockReturnValue(ok({ ...plan, educationPaths: [] }))
    renderAt(`${B}/plan`)
    expect(await screen.findByText("Not yet — do Education paths first.")).toBeInTheDocument()
  })
})
