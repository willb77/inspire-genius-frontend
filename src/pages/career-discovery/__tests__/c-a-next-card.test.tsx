/**
 * @jest-environment jsdom
 *
 * Careers and Jobs Phase C-a — the Next card above every Discovery page.
 * CSA: docs/analysis/2026-11-25-careers-jobs-c-a-next-card-build-csa.md (monorepo).
 *
 * Tries to disprove (CSA guards 1-8):
 *  1. the card shows with the switch off (any page but the journey page);
 *  2. a null next action still draws a card;
 *  3. the card shows on a page the Gate refuses (under 13, no age, journey
 *     error, Discovery switched off);
 *  4. the journey page shows two cards with the switch on;
 *  5. the card shows on the page it links to (D-a);
 *  6. with Who folded into About, the link goes to Who instead of About;
 *  7. a Careers and Jobs page makes a Discovery request;
 *  8. the card is missing under house style, or on degree-plan (D-b);
 *  and that extracting the card changed the journey page's DOM (snapshot).
 */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import type { DiscoveryJourney, DiscoveryStage } from "@/types/career-discovery"

let mockFlow = false
jest.mock("@/hooks/careers-jobs/useCareersJobsFlow", () => ({ useCareersJobsFlow: () => mockFlow }))

let mockHouse = false
jest.mock("@/lib/house/areaSwitch", () => ({ isHouseStyleOn: () => mockHouse }))
jest.mock("@/pages/career-discovery/house/HouseDiscoveryNav", () => ({
  HouseDiscoveryNav: () => <nav aria-label="HOUSE-NAV" />,
}))

jest.mock("@/verticals/core", () => {
  const actual = jest.requireActual("@/verticals/core")
  return {
    ...actual,
    useVerticalAccess: (key: string) => ({ hasAccess: key === "job-fit", isLoading: false, enabledVerticals: ["job-fit"] }),
  }
})
jest.mock("@/pages/job-fit/FitNav", () => ({ __esModule: true, default: () => <nav aria-label="FIT-NAV" /> }))
jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/hooks/career-discovery/useProfileMerged", () => ({ useProfileMerged: () => false }))

import DiscoveryShell from "@/pages/career-discovery/DiscoveryShell"
import JourneyPage from "@/pages/career-discovery/JourneyPage"
import FitShell from "@/pages/job-fit/FitShell"

const m = svc as jest.Mocked<typeof svc>
const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

const CD = "/vertical/career-discovery"
const JF = "/vertical/job-fit"

const IDS = ["land", "about", "who", "careers", "pays", "goals", "alignment", "education", "cost", "plan"]

function stages(merged = false): DiscoveryStage[] {
  return IDS.map((id) => {
    const s: DiscoveryStage = {
      id,
      name: `Stage ${id}`,
      question: `Question for ${id}?`,
      outcome: "",
      available: true,
      state: id === "land" || id === "about" ? "complete" : "not_started",
    }
    if (merged && id === "who") return { ...s, mergedInto: "about" }
    if (merged && id === "about") return { ...s, includes: ["who"] }
    return s
  })
}

function journey(over: Partial<DiscoveryJourney> = {}): DiscoveryJourney {
  const list = stages()
  return {
    ageBand: "18_plus",
    ageFloor: 13,
    mayProceed: true,
    schoolLevel: null,
    interests: [],
    stageStatus: {},
    stages: list,
    nextAction: { ...list[5], id: "goals" },
    artefactKeys: [],
    createdAt: null,
    updatedAt: null,
    ...over,
  }
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={JF} element={<FitShell />}>
            <Route path="matches" element={<p>PAGE:jf-matches</p>} />
          </Route>
          <Route path={CD} element={<DiscoveryShell />}>
            <Route path="journey" element={<JourneyPage />} />
            <Route path="about" element={<p>PAGE:about</p>} />
            <Route path="careers" element={<p>PAGE:careers</p>} />
            <Route path="goals" element={<p>PAGE:goals</p>} />
            <Route path="plan" element={<p>PAGE:plan</p>} />
            <Route path="degree-plan" element={<p>PAGE:degree-plan</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const card = () => screen.queryAllByText(/^Next: /)
const cardLink = () => screen.queryByRole("link", { name: /^Go to / })

beforeEach(() => {
  mockFlow = false
  mockHouse = false
  jest.clearAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }) as never)
  m.getDiscoveryJourney.mockReturnValue(ok(journey()) as never)
})

describe("the journey page is unchanged by the extract", () => {
  test.each([false, true])("switch %s: same DOM as before the extract", async (flow) => {
    mockFlow = flow
    const { container } = renderAt(`${CD}/journey`)
    await screen.findByText("Your discovery journey")
    expect(card()).toHaveLength(1)
    // One snapshot per switch state, each taken BEFORE the extract. On, the page
    // also carries B's strip (already on dev); the card must still appear once.
    expect(container.innerHTML).toMatchSnapshot("journey-page")
  })

  test("the merged profile (JF-11) journey page keeps its DOM too", async () => {
    const list = stages(true)
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ stages: list, nextAction: { ...list[2], id: "who" } })) as never)
    const { container } = renderAt(`${CD}/journey`)
    await screen.findByText("Your discovery journey")
    expect(container.innerHTML).toMatchSnapshot("journey-page-merged")
  })
})

describe("other pages keep their DOM where the card must not show", () => {
  test("switch off, a stage page: same DOM as before C-a", async () => {
    const { container } = renderAt(`${CD}/about`)
    await screen.findByText("PAGE:about")
    expect(container.innerHTML).toMatchSnapshot("about-off")
  })

  test("switch on, nothing next: same DOM as before C-a (no empty wrapper)", async () => {
    mockFlow = true
    const list = stages()
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ nextAction: { ...list[9], id: null as unknown as string } })) as never)
    const { container } = renderAt(`${CD}/about`)
    await screen.findByText("PAGE:about")
    expect(container.innerHTML).toMatchSnapshot("about-on-nothing-next")
  })
})

describe("guard 1: switch off, no card off the journey page", () => {
  test.each(["about", "careers", "plan", "degree-plan"])("%s", async (page) => {
    renderAt(`${CD}/${page}`)
    expect(await screen.findByText(`PAGE:${page}`)).toBeInTheDocument()
    expect(card()).toHaveLength(0)
  })
})

describe("switch on", () => {
  beforeEach(() => {
    mockFlow = true
  })

  test.each(["about", "careers", "plan"])("the card shows above %s, with the server's next stage", async (page) => {
    renderAt(`${CD}/${page}`)
    expect(await screen.findByText(`PAGE:${page}`)).toBeInTheDocument()
    expect(card()).toHaveLength(1)
    expect(screen.getByText("Next: Stage goals")).toBeInTheDocument()
    expect(screen.getByText("Question for goals?")).toBeInTheDocument()
    expect(cardLink()).toHaveAttribute("href", `${CD}/goals`)
  })

  test("the card sits above the page, not inside it", async () => {
    renderAt(`${CD}/about`)
    const page = await screen.findByText("PAGE:about")
    const title = screen.getByText("Next: Stage goals")
    expect(title.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("guard 2: a null next action draws no card", async () => {
    const list = stages()
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ nextAction: { ...list[9], id: null as unknown as string } })) as never)
    renderAt(`${CD}/about`)
    expect(await screen.findByText("PAGE:about")).toBeInTheDocument()
    expect(card()).toHaveLength(0)
  })

  test("guard 2: a missing next action draws no card and does not crash", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ nextAction: null as never })) as never)
    renderAt(`${CD}/about`)
    expect(await screen.findByText("PAGE:about")).toBeInTheDocument()
    expect(card()).toHaveLength(0)
  })

  describe("guard 3: no card where the Gate refuses", () => {
    test("under 13", async () => {
      m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: "under_13", mayProceed: false })) as never)
      renderAt(`${CD}/about`)
      expect(await screen.findByText("Discovery is for ages 13 and over")).toBeInTheDocument()
      expect(card()).toHaveLength(0)
      expect(screen.queryByText("PAGE:about")).toBeNull()
    })

    test("no age yet", async () => {
      m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: null, mayProceed: false })) as never)
      renderAt(`${CD}/about`)
      expect(await screen.findByText("Start on the first step")).toBeInTheDocument()
      expect(card()).toHaveLength(0)
    })

    test("the journey fails to load", async () => {
      m.getDiscoveryJourney.mockReturnValue(Promise.reject(new Error("boom")) as never)
      renderAt(`${CD}/about`)
      expect(await screen.findByRole("alert")).toBeInTheDocument()
      expect(card()).toHaveLength(0)
    })

    test("Discovery is switched off", async () => {
      m.getDiscoveryStatus.mockReturnValue(ok({ enabled: false }) as never)
      renderAt(`${CD}/about`)
      expect(await screen.findByText("Not switched on yet")).toBeInTheDocument()
      expect(card()).toHaveLength(0)
    })
  })

  test("guard 4: the journey page shows one card, not two", async () => {
    renderAt(`${CD}/journey`)
    await screen.findByText("Your discovery journey")
    expect(card()).toHaveLength(1)
  })

  test("guard 5 (D-a): no card on the page it links to", async () => {
    renderAt(`${CD}/goals`)
    expect(await screen.findByText("PAGE:goals")).toBeInTheDocument()
    expect(card()).toHaveLength(0)
  })

  test("guard 6: with Who folded into About, the card names and links About", async () => {
    const list = stages(true)
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ stages: list, nextAction: { ...list[2], id: "who" } })) as never)
    renderAt(`${CD}/careers`)
    expect(await screen.findByText("PAGE:careers")).toBeInTheDocument()
    expect(screen.getByText("Next: Stage about")).toBeInTheDocument()
    expect(cardLink()).toHaveAttribute("href", `${CD}/about`)
  })

  test("guard 6 with D-a: folded Who, on the About page, no card", async () => {
    const list = stages(true)
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ stages: list, nextAction: { ...list[2], id: "who" } })) as never)
    renderAt(`${CD}/about`)
    expect(await screen.findByText("PAGE:about")).toBeInTheDocument()
    expect(card()).toHaveLength(0)
  })

  test("D-b: the card shows on degree-plan", async () => {
    renderAt(`${CD}/degree-plan`)
    expect(await screen.findByText("PAGE:degree-plan")).toBeInTheDocument()
    expect(card()).toHaveLength(1)
  })

  test("guard 8: the card shows under house style too", async () => {
    mockHouse = true
    renderAt(`${CD}/about`)
    expect(await screen.findByText("PAGE:about")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "HOUSE-NAV" })).toBeInTheDocument()
    expect(card()).toHaveLength(1)
  })

  test("guard 7: a Careers and Jobs page makes no Discovery request", async () => {
    renderAt(`${JF}/matches`)
    expect(await screen.findByText("PAGE:jf-matches")).toBeInTheDocument()
    expect(m.getDiscoveryStatus).not.toHaveBeenCalled()
    expect(m.getDiscoveryJourney).not.toHaveBeenCalled()
    expect(card()).toHaveLength(0)
  })
})
