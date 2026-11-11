/**
 * @jest-environment jsdom
 *
 * JF-6 — the job detail page in the Careers and Jobs order, PDF only.
 *
 * On/off signal: the one JF-5's cards use — the server scored this read on the
 * role's priority dimensions (`scoring: "priority-9"` plus priority rows), set
 * by blueprint-service only when job_fit_v2 applies. Pins:
 * - OFF (any other read): today's page — Export as / Print / Email / Copy link
 *   still drawn, no v2 section, and none of the new reads (Job DNA, O*NET,
 *   OEWS, Favorites) is made. The byte-level proof of the off DOM and request
 *   log is the FIT-5 golden suite (src/components/fit/__tests__/fit5-golden),
 *   which runs unchanged.
 * - ON: the ten sections in the spec's order; % fit with no gap score; the
 *   action bar is Download PDF · Save · Write Résumé only; the PDF's headings
 *   are the page's headings in the page's order.
 * - Local pay names its area (D13) and an empty read says so — never a number.
 * - Honor's share helpers still serve the Honor pages (F-32).
 * - JF-12 mount: the SkillsMatch card sits inside the O*NET skills section on
 *   the ON page only; the OFF page never draws it and never asks for it.
 */
import fs from "fs"
import path from "path"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitDetail } from "@/types/job-fit"
import { JF6_PRIORITY, JF6_SECTION_ORDER, JF6_TODAY } from "@/test/jf6Fixtures"

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }) }))

let mockData: FitDetail = JF6_TODAY
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: () => ({ data: mockData, isLoading: false, isError: false }),
}))
jest.mock("@/hooks/job-fit/useExplainFit", () => ({
  useExplainFit: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, data: undefined }),
}))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({ useJobFitComponentsEnabled: () => false }))
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({ useFitSharedDisplayEnabled: () => false }))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

const mockGetJob = jest.fn()
jest.mock("@/services/job-blueprint", () => ({
  jobDnaService: { getById: (id: string) => mockGetJob(id) },
}))
const mockGetOccupation = jest.fn()
const mockGetPay = jest.fn()
jest.mock("@/services/job-fit/occupations.service", () => ({
  getOccupation: (c: string) => mockGetOccupation(c),
  getOccupationPay: (c: string) => mockGetPay(c),
}))
const mockSkillsOn = jest.fn()
const mockSkillMatch = jest.fn()
jest.mock("@/services/job-fit/skillMatch.service", () => ({
  getSkillMatchEnabled: () => mockSkillsOn(),
  getSkillMatch: (c: string) => mockSkillMatch(c),
}))
const mockFavoritesOn = jest.fn()
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => mockFavoritesOn(),
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))
const mockTargetsOn = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockTargetsOn(),
}))
jest.mock("@/services/goals/targets.service", () => ({
  makeTarget: jest.fn(),
  getMyTargets: () => Promise.resolve([]),
  getRoadmap: jest.fn(),
  rebuildRoadmap: jest.fn(),
  removeTarget: jest.fn(),
}))
jest.mock("@/services/summit/goals.service", () => ({
  getMyGoals: () => Promise.resolve({ memberId: "m", coverage: [], goals: [] }),
}))
const mockRenderPdf = jest.fn()
jest.mock("@/lib/exportTranscript/renderPdf", () => ({
  renderHtmlToPdf: (html: string) => mockRenderPdf(html),
}))
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: jest.fn() }))

import FitDetailPage from "../FitDetailPage"
import { FIT_V2_SECTION_TITLES } from "@/lib/job-fit/fitReport"
import * as honorShare from "@/lib/honor/shareReportLink"
import { NO_CODE_TEXT } from "../SkillsMatch"

const OCC = {
  state: "ready",
  reason: null,
  attribution: "O*NET 29.1 Database by the U.S. Department of Labor (CC BY 4.0).",
  data: {
    code: "11-1021.00",
    socCode: "11-1021",
    title: "General and Operations Managers",
    description: "",
    skills: [{ elementId: "2.A.1.a", name: "Coordination", importance: 4.1, level: 4.5 }],
    education: [{ category: 6, label: "Bachelor's degree", percent: 52.4 }],
    missing: [],
  },
}
const SKILL_MATCH = {
  reason: null,
  message: null,
  occupation: { code: "11-1021.00", socCode: "11-1021", title: "General and Operations Managers" },
  onet: { state: "ready", release: "29.1", attribution: "O*NET 29.1 Database (CC BY 4.0)." },
  have: [{ elementId: "2.A.1.b", name: "Active Listening", importance: 4.0, level: 4.1, yourSkill: "Listening" }],
  toBuild: [{ elementId: "2.B.4.e", name: "Negotiation", importance: 3.8, level: 4.2 }],
  skillCount: 2,
  importanceThreshold: 3,
  note: "",
}
const PAY_EMPTY = { state: "empty", reason: "no published national median for 11-1021 in OEWS May 2024", data: null }
const PAY_READY = {
  state: "ready",
  reason: null,
  data: {
    socCode: "11-1021", title: "General and Operations Managers", level: "national", requestedLevel: "national",
    areaLabel: "United States", fallbackReason: null, median: 101280, pct10: 48150, pct90: 208000,
    source: "U.S. BLS OEWS, May 2024 (United States)",
  },
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/job-fit/fit/j1"]}>
        <Routes>
          <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sections = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("[data-jf6-section]")).map((e) => e.getAttribute("data-jf6-section"))

beforeEach(() => {
  jest.clearAllMocks()
  mockData = JF6_TODAY
  mockGetJob.mockResolvedValue({ data: { data: { id: "j1", socCode: "11-1021", onetSocCode: "11-1021.00" } } })
  mockGetOccupation.mockResolvedValue(OCC)
  mockGetPay.mockResolvedValue(PAY_READY)
  mockFavoritesOn.mockResolvedValue(true)
  mockSkillsOn.mockResolvedValue(true)
  mockSkillMatch.mockResolvedValue(SKILL_MATCH)
  mockTargetsOn.mockResolvedValue(true)
  mockRenderPdf.mockResolvedValue(new Blob(["%PDF"]))
})

describe("switch off — today's page", () => {
  test.each([
    ["a 22-dimension read", JF6_TODAY],
    ["priority-9 with no priority rows", { ...JF6_TODAY, scoring: "priority-9" } as FitDetail],
    ["priority rows without the priority-9 marker", { ...JF6_PRIORITY, scoring: undefined } as FitDetail],
  ])("%s keeps every export, draws no v2 section and makes none of the new reads", async (_n, data) => {
    mockData = data
    const { container } = renderPage()
    expect(await screen.findByRole("button", { name: /^print$/i })).toBeInTheDocument()
    for (const name of [/export as/i, /^email$/i, /copy link/i, /download pdf/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument()
    }
    expect(screen.getByText("Overall closeness")).toBeInTheDocument()
    expect(sections(container)).toEqual([])
    expect(screen.queryByRole("link", { name: /career pathway/i })).not.toBeInTheDocument()
    await waitFor(() => expect(mockTargetsOn).toHaveBeenCalled())
    expect(mockGetJob).not.toHaveBeenCalled()
    expect(mockGetOccupation).not.toHaveBeenCalled()
    expect(mockGetPay).not.toHaveBeenCalled()
    expect(mockFavoritesOn).not.toHaveBeenCalled()
    // JF-12: the card is not on today's page, so neither skill read is made.
    expect(screen.queryByRole("heading", { name: /skills for this job/i })).not.toBeInTheDocument()
    expect(mockSkillsOn).not.toHaveBeenCalled()
    expect(mockSkillMatch).not.toHaveBeenCalled()
  })
})

describe("switch on — the Careers and Jobs order", () => {
  beforeEach(() => {
    mockData = JF6_PRIORITY
  })

  test("the ten sections render in the spec's order", async () => {
    const { container } = renderPage()
    await screen.findByRole("button", { name: /save to favorites/i })
    await screen.findByRole("heading", { name: /make this my target/i })
    expect(sections(container)).toEqual([...JF6_SECTION_ORDER])
  })

  test("goals off: the rest keep their order", async () => {
    mockTargetsOn.mockResolvedValue(false)
    const { container } = renderPage()
    await screen.findByRole("button", { name: /save to favorites/i })
    expect(sections(container)).toEqual(JF6_SECTION_ORDER.filter((s) => s !== "goals"))
  })

  test("% fit with no gap score; headline and top three come from one ranked list", async () => {
    const { container } = renderPage()
    await screen.findByText("Coordination")
    expect(screen.queryByText("Overall closeness")).not.toBeInTheDocument()
    expect(screen.queryByText("Total distance from blueprint")).not.toBeInTheDocument()
    expect(screen.queryByText("Priority focus")).not.toBeInTheDocument()
    expect(container.querySelector('[data-jf6-section="fit"]')).toHaveTextContent("72%")
    const headline = screen.getByText("Headline growth area").closest("div.rounded-xl") as HTMLElement
    expect(headline).toHaveTextContent("Adaptability: you 40, this role 65 (-25).")
    const profile = screen.getByText("Your profile versus the role").closest("div.rounded-xl") as HTMLElement
    expect(Array.from(profile.querySelectorAll("li")).map((l) => l.textContent?.split(":")[0])).toEqual([
      "1. Adaptability",
      "2. Coordinating",
      "3. Relating",
    ])
    // JF-9: the v2 job page's Career Pathway button starts the pathway from this job.
    expect(screen.getByRole("link", { name: /career pathway/i })).toHaveAttribute("href", "/vertical/job-fit/pathway?from=j1")
  })

  test("PDF only: no Export as, Print, Email or Copy link", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /write résumé/i })).toBeInTheDocument()
    for (const name of [/export as/i, /^print$/i, /^email$/i, /copy link/i]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument()
    }
  })

  test("the PDF carries the page's sections, in the page's order", async () => {
    const { container } = renderPage()
    await screen.findByText("Coordination")
    await screen.findByText("Median pay: $101,280 a year")
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }))
    await waitFor(() => expect(mockRenderPdf).toHaveBeenCalledTimes(1))
    const html: string = mockRenderPdf.mock.calls[0][0]
    const pdfHeadings = [...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1])
    expect(pdfHeadings).toEqual([...FIT_V2_SECTION_TITLES])
    // The JF-12 card's own heading is a sub-heading inside the skills section,
    // not a section of the page or the PDF.
    const pageHeadings = Array.from(container.querySelectorAll("[data-jf6-section] h2:not(#skills-match-heading)"))
      .map((h) => h.textContent)
      .slice(0, FIT_V2_SECTION_TITLES.length)
    expect(pageHeadings).toEqual(pdfHeadings)
    for (const words of ["Adaptability: you 40, this role 65 (-25).", "SOC code: 11-1021", "Coordination", "Median pay: $101,280 a year"]) {
      expect(html).toContain(words)
      expect(container).toHaveTextContent(words)
    }
  })

  test("local pay names its area and an empty read says so — no number", async () => {
    mockGetPay.mockResolvedValue(PAY_EMPTY)
    const { container } = renderPage()
    await screen.findByText(/No published pay figure for this role in United States yet\./)
    expect(screen.getByText("Pay — United States")).toBeInTheDocument()
    const local = container.querySelector('[data-jf6-section="local"]') as HTMLElement
    expect(local.textContent).not.toMatch(/\$\d/)
    expect(local).toHaveTextContent(PAY_EMPTY.reason)
    expect(local).toHaveTextContent("Your profile has no ZIP code or state on file")
  })

  test("no SOC / O*NET code on the job: said plainly, and O*NET / OEWS are not asked", async () => {
    mockGetJob.mockResolvedValue({ data: { data: { id: "j1", socCode: null, onetSocCode: null } } })
    renderPage()
    expect(await screen.findByText("No SOC or O*NET code is on file for this role yet.")).toBeInTheDocument()
    expect(mockGetOccupation).not.toHaveBeenCalled()
    expect(mockGetPay).not.toHaveBeenCalled()
  })

  test("the occupation reads use the O*NET-SOC code from the Job DNA read", async () => {
    renderPage()
    await screen.findByText("Coordination")
    expect(mockGetJob).toHaveBeenCalledWith("j1")
    expect(mockGetOccupation).toHaveBeenCalledWith("11-1021.00")
    expect(mockGetPay).toHaveBeenCalledWith("11-1021.00")
  })
})

describe("JF-12 mount — the skills match card on the JF-6 page", () => {
  beforeEach(() => {
    mockData = JF6_PRIORITY
  })
  const skillsSection = (c: HTMLElement) => c.querySelector('[data-jf6-section="skills"]') as HTMLElement

  test("the card renders inside the O*NET skills section, asked with the Job DNA code", async () => {
    const { container } = renderPage()
    const heading = await screen.findByRole("heading", { name: /skills for this job/i })
    expect(skillsSection(container)).toContainElement(heading)
    expect(await screen.findByRole("list", { name: "Skills to build" })).toHaveTextContent("Negotiation")
    expect(skillsSection(container)).toContainElement(screen.getByRole("list", { name: "Skills you have" }))
    expect(mockSkillMatch).toHaveBeenCalledWith("11-1021.00")
    expect(mockSkillMatch).toHaveBeenCalledTimes(1)
  })

  test("the section order is unchanged with the card mounted", async () => {
    const { container } = renderPage()
    await screen.findByRole("list", { name: "Skills to build" })
    await screen.findByRole("heading", { name: /make this my target/i })
    expect(sections(container)).toEqual([...JF6_SECTION_ORDER])
  })

  test("the card shows no percentage of its own", async () => {
    const { container } = renderPage()
    const card = (await screen.findByRole("heading", { name: /skills for this job/i })).closest("section") as HTMLElement
    await screen.findByRole("list", { name: "Skills to build" })
    expect(card.textContent).not.toMatch(/\d\s*%/)
    // The fit section still carries the one % on the page.
    expect(container.querySelector('[data-jf6-section="fit"]')).toHaveTextContent("72%")
  })

  test("a job with no O*NET or SOC code: the card says so itself and asks nothing", async () => {
    mockGetJob.mockResolvedValue({ data: { data: { id: "j1", socCode: null, onetSocCode: null } } })
    const { container } = renderPage()
    expect(await screen.findByText(NO_CODE_TEXT)).toBeInTheDocument()
    expect(skillsSection(container)).toHaveTextContent(NO_CODE_TEXT)
    expect(mockSkillMatch).not.toHaveBeenCalled()
  })

  test.each([
    ["still loading", () => new Promise(() => {}), "Loading O*NET skills…"],
    ["failed", () => Promise.reject(new Error("boom")), "O*NET skills could not be read just now."],
  ])("Job DNA read %s: no card yet, never its no-code text", async (_n, answer, sectionLine) => {
    mockGetJob.mockImplementation(answer)
    const { container } = renderPage()
    expect(await screen.findByText(sectionLine)).toBeInTheDocument()
    // Give the card's switch read time to land had the card been mounted.
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText(NO_CODE_TEXT)).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /skills for this job/i })).not.toBeInTheDocument()
    expect(skillsSection(container)).toHaveTextContent(sectionLine)
    expect(mockSkillsOn).not.toHaveBeenCalled()
  })

  test("Skills switched off for the person: the card draws nothing and the section is as before", async () => {
    mockSkillsOn.mockResolvedValue(false)
    const { container } = renderPage()
    await screen.findByText("Coordination")
    await waitFor(() => expect(mockSkillsOn).toHaveBeenCalled())
    expect(screen.queryByRole("heading", { name: /skills for this job/i })).not.toBeInTheDocument()
    expect(skillsSection(container)).toBeInTheDocument()
    expect(mockSkillMatch).not.toHaveBeenCalled()
  })
})

describe("Honor keeps its share links (F-32)", () => {
  const src = (p: string) => fs.readFileSync(path.join(__dirname, "..", "..", "..", p), "utf8")

  test("the helpers still exist and still work", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    await expect(honorShare.copyReportLink("https://example.test/r.pdf")).resolves.toBe(true)
    expect(honorShare.buildMailtoLink({ subject: "S", intro: "I", url: "https://example.test/r.pdf" })).toMatch(/^mailto:\?/)
  })

  test.each(["pages/honor/HonorEvaluate.tsx", "pages/honor/HonorResume.tsx"])(
    "%s still imports and calls copyReportLink and emailReportLink",
    (file) => {
      const s = src(file)
      expect(s).toMatch(/import \{ copyReportLink, emailReportLink \} from "@\/lib\/honor\/shareReportLink"/)
      expect(s).toMatch(/await copyReportLink\(/)
      expect(s).toMatch(/emailReportLink\(\{/)
    },
  )
})
