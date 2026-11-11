/**
 * @jest-environment jsdom
 *
 * JF-11 — About me + Who I am as ONE profile section, and Skills.
 *
 * Tries to disprove: switch off (no `mergedInto` from the server) changes any
 * menu or page; switch on leaves a second "Who I am" entry, loses the About
 * answers or the Who portrait, or strands an old /who link; a résumé
 * suggestion is saved without the person pressing Add; a failure is silent.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import * as skillsSvc from "@/services/profile/skills.service"
import DiscoveryShell from "../DiscoveryShell"
import JourneyPage from "../JourneyPage"
import AboutPage from "../AboutPage"
import WhoPage from "../WhoPage"
import type { DiscoveryJourney, DiscoveryStage } from "@/types/career-discovery"
import type { SkillSuggestions } from "@/types/profile/skills"
import { discoveryMenu, isProfileMerged, shownStage, visibleStages } from "@/lib/career-discovery/profileSection"

jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/services/profile/skills.service")
jest.mock("@/lib/house/areaSwitch", () => ({ isHouseStyleOn: () => false }))
jest.mock("@/components/lumen/portrait", () => ({
  PortraitAnchorNote: () => <div>anchor</div>,
  PortraitCorroborating: () => <div>corroborating</div>,
  PortraitDimensions: () => <div>dimensions</div>,
  PortraitNoPrism: ({ children }: { children: React.ReactNode }) => <div>no prism {children}</div>,
}))
jest.mock("@/components/shared/ProvenanceNote", () => ({ ProvenanceNote: () => <div>provenance</div> }))

const m = svc as jest.Mocked<typeof svc>
const k = skillsSvc as jest.Mocked<typeof skillsSvc>
const B = "/vertical/career-discovery"

const STAGES = [
  ["land", "Start here", true], ["about", "About me", true], ["who", "Who I am", true],
  ["careers", "Career areas", true], ["pays", "What it pays", true], ["goals", "My goals", true],
  ["alignment", "Goals vs wiring", true], ["education", "Education paths", false],
  ["cost", "Cost and payback", false], ["plan", "My plan", true],
] as const

function stages(merged: boolean): DiscoveryStage[] {
  return STAGES.map(([id, name, available]) => {
    const s: DiscoveryStage = { id, name, question: `${name}?`, outcome: "o", available, state: "not_started" }
    if (merged && id === "about") return { ...s, name: "My profile", question: "Profile?", includes: ["who"] }
    if (merged && id === "who") return { ...s, mergedInto: "about" }
    return s
  })
}

function journey(merged: boolean, over: Partial<DiscoveryJourney> = {}): DiscoveryJourney {
  const list = stages(merged)
  return {
    ageBand: "18_plus", ageFloor: 13, mayProceed: true, schoolLevel: "university", interests: ["art", "robots"],
    stageStatus: { land: "complete", about: "complete" },
    stages: list,
    nextAction: { ...list[2], id: "who" },
    artefactKeys: [], createdAt: null, updatedAt: null,
    ...over,
  }
}

const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={B} element={<DiscoveryShell />}>
            <Route path="journey" element={<JourneyPage />} />
            <Route path="about" element={<><AboutPage /><Where /></>} />
            <Route path="who" element={<><WhoPage /><Where /></>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const axiosError = (status: number, detail: string) =>
  Object.assign(new Error("x"), { response: { status, data: { detail } } })

const SUGGESTIONS: SkillSuggestions = {
  suggestions: [
    { name: "Critical Thinking", match: "matched", label: null, onetElementId: "2.A.2.b",
      foundIn: "skills_section", alreadySaved: false },
    { name: "Python", match: "not_matched_yet", label: "Not matched to O*NET yet", onetElementId: null,
      foundIn: "skills_section", alreadySaved: false },
    { name: "Coordination", match: "matched", label: null, onetElementId: "2.B.1.b",
      foundIn: "skills_section", alreadySaved: true },
  ],
  source: { documentId: "d1", filename: "cv.pdf" },
  onet: { state: "empty", releaseVersion: null, attribution: null,
    message: "O*NET skill names are not loaded on this system yet, so nothing is matched to them." },
  reason: null,
  message: null,
}

beforeEach(() => {
  jest.resetAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }))
  m.getDiscoveryJourney.mockReturnValue(ok(journey(false)))
  m.getDiscoveryPortrait.mockReturnValue(ok({ prism: null, headline: "h", corroborating: [], sources: {} } as never))
  m.advanceDiscovery.mockReturnValue(ok(journey(false)))
  k.getSkills.mockResolvedValue([])
  k.getSkillSuggestions.mockResolvedValue(SUGGESTIONS)
  k.saveSkill.mockResolvedValue({
    skill: { id: "s1", name: "x", source: "manual", onetElementId: null, onetRelease: null, matched: false, savedAt: null },
    created: true,
  })
  k.removeSkill.mockResolvedValue({ id: "s1", removed: true })
})

const nav = () => screen.getByRole("navigation", { name: "Career & Education Discovery" })

describe("switch off: today's pages and menu, unchanged", () => {
  test("About me is the About page alone; no Skills, no portrait call", async () => {
    renderAt(`${B}/about`)
    expect(await screen.findByRole("heading", { level: 1, name: "About me" })).toBeInTheDocument()
    expect(screen.getByLabelText("What are you into? (separate with commas)")).toHaveValue("art, robots")
    expect(screen.queryByText("Skills")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Who I am" })).not.toBeInTheDocument()
    expect(m.getDiscoveryPortrait).not.toHaveBeenCalled()
    expect(k.getSkills).not.toHaveBeenCalled()
  })

  test("the menu keeps About me and Who I am as two entries", async () => {
    renderAt(`${B}/about`)
    await screen.findByRole("heading", { level: 1, name: "About me" })
    const links = within(nav()).getAllByRole("link").map((a) => a.textContent)
    expect(links).toContain("About me")
    expect(links).toContain("Who I am")
    expect(links).not.toContain("My profile")
  })

  test("/who is today's Who I am page, and it stays on /who", async () => {
    renderAt(`${B}/who`)
    expect(await screen.findByRole("heading", { level: 1, name: "Who I am" })).toBeInTheDocument()
    expect(screen.getByTestId("where")).toHaveTextContent(`${B}/who`)
  })

  test("the journey lists ten stages, Who I am among them", async () => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(false, { ageBand: "18_plus" })))
    renderAt(`${B}/journey`)
    expect(await screen.findByText(/Ten steps/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "3. Who I am" })).toBeInTheDocument()
    expect(screen.getByText("Next: Who I am")).toBeInTheDocument()
  })
})

describe("switch on: one profile section", () => {
  beforeEach(() => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true)))
    m.advanceDiscovery.mockReturnValue(ok(journey(true)))
  })

  test("My profile carries the About answers, Skills and the Who portrait", async () => {
    renderAt(`${B}/about`)
    expect(await screen.findByRole("heading", { level: 1, name: "My profile" })).toBeInTheDocument()
    // The stored answers, read as before — nothing moved.
    expect(screen.getByLabelText("What are you into? (separate with commas)")).toHaveValue("art, robots")
    expect(screen.getByLabelText("Where are you now?")).toHaveValue("university")
    expect(await screen.findByRole("heading", { level: 2, name: "Who I am" })).toBeInTheDocument()
    expect(screen.getByText("Skills")).toBeInTheDocument()
    expect(m.getDiscoveryPortrait).toHaveBeenCalled()
  })

  test("the menu is one My profile entry, with no Who I am", async () => {
    renderAt(`${B}/about`)
    await screen.findByRole("heading", { level: 1, name: "My profile" })
    const links = within(nav()).getAllByRole("link").map((a) => a.textContent)
    expect(links).toContain("My profile")
    expect(links).not.toContain("Who I am")
    expect(links).not.toContain("About me")
  })

  test("an old /who link lands on the profile section", async () => {
    renderAt(`${B}/who`)
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`${B}/about`))
    expect(await screen.findByRole("heading", { level: 1, name: "My profile" })).toBeInTheDocument()
  })

  test("Who I am still records itself from the profile section once PRISM is on file", async () => {
    m.getDiscoveryPortrait.mockReturnValue(ok({ prism: { x: 1 }, headline: "h", corroborating: [], sources: {} } as never))
    renderAt(`${B}/about`)
    await waitFor(() => expect(m.advanceDiscovery).toHaveBeenCalled())
    expect(m.advanceDiscovery.mock.calls[0][0]).toEqual({ stageId: "who" })
  })

  test("a portrait failure is said inside the section; the About form stays", async () => {
    m.getDiscoveryPortrait.mockRejectedValue(axiosError(500, "Portrait unavailable right now."))
    renderAt(`${B}/about`)
    const who = await screen.findByRole("region", { name: "Who I am" })
    expect(await within(who).findByRole("alert")).toHaveTextContent("Portrait unavailable right now.")
    expect(screen.getByLabelText("Where are you now?")).toBeInTheDocument()
  })

  test("the journey lists nine entries and points next at the profile", async () => {
    renderAt(`${B}/journey`)
    expect(await screen.findByText(/Nine steps/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Who I am/ })).not.toBeInTheDocument()
    expect(screen.getByText("Next: My profile")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to My profile" })).toHaveAttribute("href", `${B}/about`)
  })
})

describe("Skills", () => {
  beforeEach(() => {
    m.getDiscoveryJourney.mockReturnValue(ok(journey(true)))
  })

  test("asking for suggestions saves nothing; Add on one saves just that one", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/about`)
    expect(await screen.findByText(/No skills added yet/)).toBeInTheDocument()
    expect(k.getSkillSuggestions).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Suggest from my résumé" }))
    const list = await screen.findByRole("list", { name: "Suggested skills" })
    expect(within(list).getByText("Not matched to O*NET yet")).toBeInTheDocument()
    expect(within(list).getAllByText("O*NET skill")).toHaveLength(2)
    expect(within(list).getByText("Already added")).toBeInTheDocument()
    expect(screen.getByText(/not loaded on this system yet/)).toBeInTheDocument()
    expect(screen.getByText("From cv.pdf")).toBeInTheDocument()
    expect(k.saveSkill).not.toHaveBeenCalled()
    const python = within(list).getByText("Python").closest("li") as HTMLElement
    await user.click(within(python).getByRole("button", { name: "Add" }))
    await waitFor(() => expect(k.saveSkill).toHaveBeenCalledTimes(1))
    expect(k.saveSkill.mock.calls[0][0]).toEqual({ name: "Python", source: "resume" })
  })

  test("no résumé is said, not left blank", async () => {
    const user = userEvent.setup()
    k.getSkillSuggestions.mockResolvedValue({
      suggestions: [], source: null, onet: null, reason: "no_resume",
      message: "No résumé with readable text is in your documents yet. Add one, or type your skills below.",
    })
    renderAt(`${B}/about`)
    await user.click(await screen.findByRole("button", { name: "Suggest from my résumé" }))
    expect(await screen.findByText(/No résumé with readable text/)).toBeInTheDocument()
  })

  test("a typed skill is saved as manual, and an empty one is refused in the form", async () => {
    const user = userEvent.setup()
    renderAt(`${B}/about`)
    const box = await screen.findByLabelText("Add a skill")
    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(await screen.findByText("Type a skill to add.")).toBeInTheDocument()
    expect(k.saveSkill).not.toHaveBeenCalled()
    await user.type(box, "Welding")
    await user.click(screen.getByRole("button", { name: "Add" }))
    await waitFor(() => expect(k.saveSkill).toHaveBeenCalledTimes(1))
    expect(k.saveSkill.mock.calls[0][0]).toEqual({ name: "Welding", source: "manual" })
  })

  test("saved skills list, O*NET marked, and can be removed", async () => {
    const user = userEvent.setup()
    k.getSkills.mockResolvedValue([
      { id: "a", name: "Critical Thinking", source: "resume", onetElementId: "2.A.2.b", onetRelease: "31.0",
        matched: true, savedAt: null },
      { id: "b", name: "Welding", source: "manual", onetElementId: null, onetRelease: null, matched: false, savedAt: null },
    ])
    renderAt(`${B}/about`)
    const mine = await screen.findByRole("list", { name: "Your skills" })
    expect(within(mine).getAllByRole("listitem")).toHaveLength(2)
    expect(within(mine).getByText("O*NET")).toBeInTheDocument()
    await user.click(within(mine).getByRole("button", { name: "Remove Welding" }))
    await waitFor(() => expect(k.removeSkill).toHaveBeenCalled())
    expect(k.removeSkill.mock.calls[0][0]).toBe("b")
  })

  test("a failure to load or save is an alert", async () => {
    const user = userEvent.setup()
    k.getSkills.mockRejectedValue(axiosError(403, "Skills are not switched on yet."))
    k.saveSkill.mockRejectedValue(axiosError(409, "You can keep up to 100 skills. Remove one to add another."))
    renderAt(`${B}/about`)
    expect(await screen.findByText("Skills are not switched on yet.")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Add a skill"), "Welding")
    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(await screen.findByText(/up to 100 skills/)).toBeInTheDocument()
  })

  test("a suggestions failure is an alert", async () => {
    const user = userEvent.setup()
    k.getSkillSuggestions.mockRejectedValue(axiosError(403, "Skills are not switched on yet."))
    renderAt(`${B}/about`)
    await user.click(await screen.findByRole("button", { name: "Suggest from my résumé" }))
    expect(await screen.findByText("Skills are not switched on yet.")).toBeInTheDocument()
  })
})

describe("the helpers", () => {
  const items = [
    { to: `${B}/about`, icon: () => null, label: "About me" },
    { to: `${B}/who`, icon: () => null, label: "Who I am" },
  ]
  test("discoveryMenu is the identical list when not merged", () => {
    expect(discoveryMenu(items, false)).toBe(items)
    expect(discoveryMenu(items, true).map((i) => i.label)).toEqual(["My profile"])
  })
  test("merged only on the server's mark", () => {
    expect(isProfileMerged(undefined)).toBe(false)
    expect(isProfileMerged(stages(false))).toBe(false)
    expect(isProfileMerged(stages(true))).toBe(true)
    expect(visibleStages(stages(true)).map((s) => s.id)).not.toContain("who")
    const who = stages(true)[2]
    expect(shownStage(who, stages(true)).id).toBe("about")
    expect(shownStage(stages(false)[2], stages(false)).id).toBe("who")
  })
})
