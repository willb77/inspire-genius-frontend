/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import DiscoveryShell from "../DiscoveryShell"
import JourneyPage from "../JourneyPage"
import AboutPage from "../AboutPage"
import { splitInterests } from "../splitInterests"
import WhoPage from "../WhoPage"
import CareersPage from "../CareersPage"
import PaysPage from "../PaysPage"
import GoalsPage from "../GoalsPage"
import AlignmentPage from "../AlignmentPage"
import ComingNextPage from "../ComingNextPage"
import PlanPage from "../PlanPage"
import type { DiscoveryJourney } from "@/types/career-discovery"
import { discoveryErrorMessage } from "@/hooks/career-discovery/useCareerDiscovery"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/components/lumen/portrait", () => ({
  PortraitAnchorNote: () => <div>anchor</div>,
  PortraitCorroborating: () => <div>corroborating</div>,
  PortraitDimensions: () => <div>dimensions</div>,
  PortraitNoPrism: ({ children }: { children: React.ReactNode }) => <div>no prism {children}</div>,
}))
jest.mock("@/components/shared/ProvenanceNote", () => ({ ProvenanceNote: () => <div>provenance</div> }))

const m = svc as jest.Mocked<typeof svc>
const B = "/vertical/career-discovery"

const STAGES = [
  ["land", "Start here", true], ["about", "About me", true], ["who", "Who I am", true],
  ["careers", "Career areas", true], ["pays", "What it pays", true], ["goals", "My goals", true],
  ["alignment", "Goals vs wiring", true], ["education", "Education paths", false],
  ["cost", "Cost and payback", false], ["plan", "My plan", true],
] as const

function journey(over: Partial<DiscoveryJourney> = {}): DiscoveryJourney {
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: { land: "complete" },
    stages: STAGES.map(([id, name, available]) => ({
      id, name, question: `${name}?`, outcome: "o", available, state: "not_started" as const,
    })),
    nextAction: { id: "about", name: "About me", question: "Where am I starting from?", outcome: "o", available: true },
    artefactKeys: [], createdAt: null, updatedAt: null,
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })
const STAGE_CALLS = () => [m.getDiscoveryPortrait, m.getDiscoveryCareers, m.getDiscoveryPays,
  m.getDiscoveryGoals, m.getDiscoveryAlignment, m.getDiscoveryPlan]

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="journey" element={<JourneyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="who" element={<WhoPage />} />
            <Route path="careers" element={<CareersPage />} />
            <Route path="pays" element={<PaysPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="alignment" element={<AlignmentPage />} />
            <Route path="education" element={<ComingNextPage stage="education" />} />
            <Route path="cost" element={<ComingNextPage stage="cost" />} />
            <Route path="plan" element={<PlanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const axiosError = (status: number, detail: string) =>
  Object.assign(new Error("x"), { response: { status, data: { detail } } })

beforeEach(() => {
  jest.resetAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey()))
  m.advanceDiscovery.mockReturnValue(ok(journey()))
})

describe("the shell's gates", () => {
  test("switch off: says so, and no journey or stage call is made", async () => {
    m.getDiscoveryStatus.mockReturnValue(ok({ enabled: false }))
    renderAt(`${B}/careers`)
    expect(await screen.findByText("Not switched on yet")).toBeInTheDocument()
    expect(m.getDiscoveryJourney).not.toHaveBeenCalled()
    for (const fn of STAGE_CALLS()) expect(fn).not.toHaveBeenCalled()
  })

  test("a status failure is an alert, not a blank page", async () => {
    m.getDiscoveryStatus.mockRejectedValue(axiosError(403, "vertical 'career-discovery' not enabled for this user"))
    renderAt(`${B}/journey`)
    expect(await screen.findByRole("alert")).toHaveTextContent("not enabled for this user")
  })

  test("migration absent (503) is said plainly", async () => {
    m.getDiscoveryJourney.mockRejectedValue(axiosError(503, "Career & Education Discovery isn't set up on this tier yet."))
    renderAt(`${B}/journey`)
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't set up on this tier")
  })

  test.each(["careers", "pays", "goals", "alignment", "plan", "who", "about"])(
    "no age range: %s sends the person to the first step, calling nothing",
    async (page) => {
      m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: null, mayProceed: false })))
      renderAt(`${B}/${page}`)
      expect(await screen.findByText("Start on the first step")).toBeInTheDocument()
      for (const fn of STAGE_CALLS()) expect(fn).not.toHaveBeenCalled()
    }
  )

  test.each(["journey", "careers", "plan", "about"])("under 13: %s explains the floor and calls nothing", async (page) => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: "under_13", mayProceed: false, stageStatus: {} })))
    renderAt(`${B}/${page}`)
    expect(await screen.findByText("Discovery is for ages 13 and over")).toBeInTheDocument()
    expect(screen.queryByLabelText("Year of birth")).not.toBeInTheDocument()
    for (const fn of STAGE_CALLS()) expect(fn).not.toHaveBeenCalled()
  })
})

describe("the first step", () => {
  test("asks for a birth year neutrally and sends it once", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: null, mayProceed: false })))
    m.recordDiscoveryAge.mockReturnValue(ok(journey()))
    renderAt(`${B}/journey`)
    const input = await screen.findByLabelText("Year of birth")
    // Neutral: the floor is not shown before the answer.
    expect(screen.queryByText(/13/)).not.toBeInTheDocument()
    await userEvent.type(input, "2010")
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    await waitFor(() => expect(m.recordDiscoveryAge).toHaveBeenCalledWith(2010))
  })

  test("refuses a non-year before calling the server", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: null, mayProceed: false })))
    renderAt(`${B}/journey`)
    await userEvent.type(await screen.findByLabelText("Year of birth"), "abc")
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(await screen.findByText("Enter the year you were born.")).toBeInTheDocument()
    expect(m.recordDiscoveryAge).not.toHaveBeenCalled()
  })

  test("with an age range, shows the map with two stages coming next", async () => {
    renderAt(`${B}/journey`)
    expect(await screen.findByText("Next: About me")).toBeInTheDocument()
    expect(screen.getAllByText("Coming next")).toHaveLength(2)
  })
})

describe("stage pages for a 13+ person", () => {
  test("About me saves school level and split interests", async () => {
    m.saveDiscoveryAbout.mockReturnValue(ok(journey({ schoolLevel: "high_school" })))
    renderAt(`${B}/about`)
    await userEvent.selectOptions(await screen.findByLabelText("Where are you now?"), "high_school")
    await userEvent.type(screen.getByLabelText(/What are you into/), "art, robots")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(m.saveDiscoveryAbout).toHaveBeenCalledWith({ schoolLevel: "high_school", interests: ["art", "robots"] })
    )
  })

  test("About me requires a school level", async () => {
    renderAt(`${B}/about`)
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    expect(await screen.findByText("Pick where you are now.")).toBeInTheDocument()
    expect(m.saveDiscoveryAbout).not.toHaveBeenCalled()
  })

  test("Who I am records itself once a PRISM is read", async () => {
    m.getDiscoveryPortrait.mockReturnValue(ok({ sources: {}, prism: { dims: 1 }, corroborating: [] } as never))
    renderAt(`${B}/who`)
    expect(await screen.findByText("dimensions")).toBeInTheDocument()
    await waitFor(() => expect(m.advanceDiscovery).toHaveBeenCalledWith({ stageId: "who" }))
  })

  test("Who I am without PRISM offers the assessment and records nothing", async () => {
    m.getDiscoveryPortrait.mockReturnValue(ok({ sources: {}, prism: null, corroborating: [] } as never))
    renderAt(`${B}/who`)
    expect(await screen.findByText(/no prism/)).toBeInTheDocument()
    expect(m.advanceDiscovery).not.toHaveBeenCalled()
  })

  test("Career areas lists ranked families", async () => {
    m.getDiscoveryCareers.mockReturnValue(ok({ families: [{ family: "Health", affinity: 81.4 }], note: "n" }))
    renderAt(`${B}/careers`)
    expect(await screen.findByText("1. Health")).toBeInTheDocument()
    expect(screen.getByText("81% natural fit")).toBeInTheDocument()
  })

  test("Career areas with no PRISM says why", async () => {
    m.getDiscoveryCareers.mockReturnValue(ok({ families: [], note: "Add your PRISM." }))
    renderAt(`${B}/careers`)
    expect(await screen.findByText("Add your PRISM.")).toBeInTheDocument()
  })

  test("a stage failure is rendered", async () => {
    m.getDiscoveryCareers.mockRejectedValue(axiosError(403, "Discovery is for people aged 13 and over"))
    renderAt(`${B}/careers`)
    expect(await screen.findByRole("alert")).toHaveTextContent("aged 13 and over")
  })

  test("What it pays never shows a bare number", async () => {
    m.getDiscoveryPays.mockReturnValue(ok({
      ranked: true, note: "ref",
      areas: [
        { family: "Health", affinity: 80, note: null, range: { low: 30000, median: 50000, high: 90000, source: "Curated", asOf: "2024" } },
        { family: "Arts", affinity: 70, note: "none", range: null },
      ],
    }))
    renderAt(`${B}/pays`)
    expect(await screen.findByText("Curated, 2024")).toBeInTheDocument()
    expect(screen.getByText("No pay data on file for this area yet.")).toBeInTheDocument()
  })

  test("My goals reads the count and links to Goals Studio", async () => {
    m.getDiscoveryGoals.mockReturnValue(ok({ count: 1, titles: ["Become a nurse"] }))
    renderAt(`${B}/goals`)
    expect(await screen.findByText("Become a nurse")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Goals Studio" })).toHaveAttribute("href", "/my/goals")
  })

  test("My goals with none says so", async () => {
    m.getDiscoveryGoals.mockReturnValue(ok({ count: 0, titles: [] }))
    renderAt(`${B}/goals`)
    expect(await screen.findByText("No goals yet")).toBeInTheDocument()
  })

  test("Goals vs wiring starts a check and shows a stored result", async () => {
    m.getDiscoveryAlignment.mockReturnValue(ok({
      result: { goals: [{ title: "Nurse", verdict: "at-tension", statement: "s" }], note: "fine" },
      job: null,
    }))
    m.startDiscoveryAlignment.mockReturnValue(ok({ jobId: "j", kind: "alignment", status: "queued" as const }))
    renderAt(`${B}/alignment`)
    expect(await screen.findByText("At tension with your wiring")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Check again" }))
    await waitFor(() => expect(m.startDiscoveryAlignment).toHaveBeenCalled())
  })

  test("Goals vs wiring polls a running job", async () => {
    m.getDiscoveryAlignment.mockReturnValue(ok({ result: null, job: { jobId: "j1", kind: "alignment", status: "running" as const } }))
    m.getDiscoveryAlignmentJob.mockReturnValue(ok({ jobId: "j1", kind: "alignment", status: "running" as const }))
    renderAt(`${B}/alignment`)
    expect(await screen.findByText(/Working it out/)).toBeInTheDocument()
    await waitFor(() => expect(m.getDiscoveryAlignmentJob).toHaveBeenCalledWith("j1"))
  })

  test("a failed check is said out loud", async () => {
    m.getDiscoveryAlignment.mockReturnValue(ok({ result: null, job: { jobId: "j1", kind: "alignment", status: "error" as const } }))
    renderAt(`${B}/alignment`)
    expect(await screen.findByRole("alert")).toHaveTextContent("didn't finish")
  })

  test.each(["education", "cost"])("%s is an honest coming-next page with no figures", async (page) => {
    const { container } = renderAt(`${B}/${page}`)
    expect(await screen.findByText("Coming next", { selector: "div" })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\$\d|\d+%/)
    for (const fn of STAGE_CALLS()) expect(fn).not.toHaveBeenCalled()
  })

  test("My plan composes what was done and records itself", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok({
      schoolLevel: "high_school", interests: ["art"],
      careerAreas: [{ family: "Health", range: { low: 1, median: 2, high: 3, source: "Curated", asOf: "2024" } }],
      goalsCount: 2, alignment: { note: "mostly supported" },
      nextSteps: [{ stageId: "alignment", name: "Goals vs wiring", question: "Do my goals suit me?" }],
      comingNext: [{ stageId: "education", name: "Education paths" }, { stageId: "cost", name: "Cost and payback" }],
    }))
    renderAt(`${B}/plan`)
    expect(await screen.findByText("High school")).toBeInTheDocument()
    expect(screen.getByText("Health")).toBeInTheDocument()
    const next = screen.getByText("Next steps").closest("[data-slot=\"card\"]") as HTMLElement
    expect(within(next).getByRole("link", { name: "Goals vs wiring" })).toHaveAttribute("href", `${B}/alignment`)
    expect(screen.getByText("Coming next: Education paths and Cost and payback.")).toBeInTheDocument()
    await waitFor(() => expect(m.advanceDiscovery).toHaveBeenCalledWith({ stageId: "plan" }))
  })

  test("My plan with nothing yet does not record itself", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok({
      schoolLevel: null, interests: [], careerAreas: [], goalsCount: 0, alignment: null,
      nextSteps: [], comingNext: [],
    }))
    renderAt(`${B}/plan`)
    expect(await screen.findByText("Not yet — do Career areas first.")).toBeInTheDocument()
    expect(m.advanceDiscovery).not.toHaveBeenCalled()
  })
})

describe("helpers", () => {
  test("splitInterests", () => {
    expect(splitInterests(" art, ,robots\nmusic ")).toEqual(["art", "robots", "music"])
  })

  test("discoveryErrorMessage prefers the server's words", () => {
    expect(discoveryErrorMessage(axiosError(503, "not set up"))).toBe("not set up")
    expect(discoveryErrorMessage(new Error("x"))).toMatch(/Refresh/)
  })
})
