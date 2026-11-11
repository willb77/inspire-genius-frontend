/**
 * @jest-environment jsdom
 *
 * JF-12 — Skills match. With the server's `job_fit_v2` switch off, nothing
 * renders and the match is never asked for. On: the card lists "You have" and
 * "To build"; every empty state says why (no code on the job, no skills yet, job
 * not in O*NET, O*NET not loaded / unreadable); a failed load is an alert. The
 * card takes, reads and shows no fit score.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { SkillMatch } from "@/types/job-fit/skillMatch"

const mockEnabled = jest.fn()
const mockMatch = jest.fn()
jest.mock("@/services/job-fit/skillMatch.service", () => ({
  getSkillMatchEnabled: () => mockEnabled(),
  getSkillMatch: (code: string) => mockMatch(code),
}))

import { NO_CODE_TEXT, NOTE_TEXT, SkillsMatch } from "@/pages/job-fit/SkillsMatch"
import { ROUTES } from "@/constants/routes"

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const BASE: SkillMatch = {
  reason: null,
  message: null,
  occupation: { code: "15-1252.00", socCode: "15-1252", title: "Software Developers" },
  onet: { state: "ready", release: "31.0", attribution: "O*NET 31.0 Database, CC BY 4.0" },
  have: [
    { elementId: "2.A.2.b", name: "Critical Thinking", importance: 4, level: null, yourSkill: "Critical Thinking" },
  ],
  toBuild: [
    { elementId: "2.B.3.e", name: "Programming", importance: 4.5, level: 5.1 },
    { elementId: "2.B.1.b", name: "Coordination", importance: 3, level: null },
  ],
  skillCount: 3,
  importanceThreshold: 3,
  note: "Skills are shown beside your fit, not inside it.",
}

beforeEach(() => {
  jest.clearAllMocks()
  mockMatch.mockResolvedValue(BASE)
})

describe("switch OFF", () => {
  test("renders nothing and never asks for the match", async () => {
    mockEnabled.mockResolvedValue(false)
    const { container } = renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    await waitFor(() => expect(mockEnabled).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    expect(mockMatch).not.toHaveBeenCalled()
  })

  test("a failed status read is off", async () => {
    mockEnabled.mockRejectedValue(new Error("boom"))
    const { container } = renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    await waitFor(() => expect(mockEnabled).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    expect(mockMatch).not.toHaveBeenCalled()
  })
})

describe("switch ON", () => {
  beforeEach(() => mockEnabled.mockResolvedValue(true))

  test("lists the skills I have and the ones to build, sending only the code", async () => {
    renderWith(<SkillsMatch onetSocCode=" 15-1252.00 " />)
    const have = await screen.findByRole("list", { name: "Skills you have" })
    expect(have).toHaveTextContent("Critical Thinking")
    const build = screen.getByRole("list", { name: "Skills to build" })
    expect(build).toHaveTextContent("Programming")
    expect(build).toHaveTextContent("Coordination")
    expect(build).not.toHaveTextContent("Critical Thinking")
    expect(mockMatch).toHaveBeenCalledTimes(1)
    expect(mockMatch).toHaveBeenCalledWith("15-1252.00")
    expect(screen.getByText(NOTE_TEXT)).toBeInTheDocument()
    expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument()
  })

  test("never shows a fit percentage", async () => {
    const { container } = renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    await screen.findByRole("list", { name: "Skills you have" })
    expect(container.textContent ?? "").not.toMatch(/\d+\s*%/)
  })

  test.each([[null], [undefined], [""], ["   "]])(
    "a job with no O*NET code (%p) says why and asks nothing",
    async (code) => {
      renderWith(<SkillsMatch onetSocCode={code as string | null | undefined} />)
      expect(await screen.findByText(NO_CODE_TEXT)).toBeInTheDocument()
      expect(mockMatch).not.toHaveBeenCalled()
    },
  )

  test("no skills yet: says so, links to add them, still lists what to build", async () => {
    mockMatch.mockResolvedValue({
      ...BASE,
      reason: "no_skills",
      message: "You haven't added any skills yet. Add them in your profile to see which of these you have.",
      have: [],
      skillCount: 0,
    })
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByText(/haven't added any skills yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add your skills" })).toHaveAttribute(
      "href",
      ROUTES.CAREER_DISCOVERY.ABOUT,
    )
    expect(screen.getByRole("list", { name: "Skills to build" })).toHaveTextContent("Programming")
    expect(screen.queryByText(/None of your saved skills/)).not.toBeInTheDocument()
  })

  test("skills saved but none match says so rather than a blank column", async () => {
    mockMatch.mockResolvedValue({ ...BASE, have: [] })
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByText(/None of your saved skills match/)).toBeInTheDocument()
  })

  test("every skill held says so rather than a blank column", async () => {
    mockMatch.mockResolvedValue({ ...BASE, toBuild: [] })
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByText(/every skill O\*NET rates as important/)).toBeInTheDocument()
  })

  test.each([
    ["job_not_in_onet", "This job's occupation code is not in the current O*NET release."],
    ["onet_not_loaded", "O*NET skill data is not loaded on this system yet."],
    ["onet_unavailable", "O*NET skill data could not be read just now."],
    ["no_onet_skills", "O*NET rates no skill as important for this occupation."],
  ])("%s: the server's reason is shown, never a blank card", async (reason, message) => {
    mockMatch.mockResolvedValue({
      ...BASE, reason, message, have: [], toBuild: [], occupation: null, onet: null,
    })
    renderWith(<SkillsMatch onetSocCode="99-9999.00" />)
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  test("a failed load is an alert with the server's sentence", async () => {
    mockMatch.mockRejectedValue({ response: { status: 403, data: { detail: "Skills are not switched on yet." } } })
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Skills are not switched on yet.")
  })

  test("a failed load with no sentence still says it failed", async () => {
    mockMatch.mockRejectedValue({ response: { status: 403, data: {} } })
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("aren't available on your account")
  })

  test("a network failure still says it failed", async () => {
    mockMatch.mockRejectedValue(new Error("network"))
    renderWith(<SkillsMatch onetSocCode="15-1252.00" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again.")
  })
})
