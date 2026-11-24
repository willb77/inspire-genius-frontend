/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { BEHAVIOUR_CONFIG } from "@/constants/prism"
import type { MemberDossier, PrismDimension } from "@/types/development"

// U4, page level. The other two workspace suites replace every panel with a
// probe, so neither can say whether the PRISM radar reaches the screen. Here
// the Behavioral Profile panel is the REAL one: the page is rendered, and the
// radar's container and the eight score rows are looked for where a manager
// would see them — first, in the Profile group, above the write-up.
//
// What is still stubbed, and why:
//   - the layouts (app chrome, not this page);
//   - the data hooks and the consent service (no network in a unit test);
//   - the Meridian rail (it opens a chat transport);
//   - the Write-up panel: it reads the member's full PRISM over the network as
//     it mounts. It is a marker here, used only to assert that it comes AFTER
//     the radar. The Studio flag is ON so that the marker is on the page.
// The chart library draws nothing measurable in jsdom, so the assertions are
// the radar's container and the table that carries the same eight scores.

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

jest.mock("@/constants/development", () => ({
  ...jest.requireActual("@/constants/development"),
  TDS_STUDIO_ENABLED: true,
  FIT_ENGINE_MATCHES_ENABLED: false,
}))

let dossierState: { data: MemberDossier | null | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
}
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useMemberDossier: () => dossierState,
    useMemberFitMatches: () => ({ data: undefined, isLoading: false, isError: false }),
    useRefreshDossier: () => ({ mutate: jest.fn(), isPending: false }),
    useSharePlan: () => ({ mutate: jest.fn(), isPending: false }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
  }
})
jest.mock("@/services/manager/studentRoster.service", () => ({ requestStudentAccess: jest.fn() }))
jest.mock("@/lib/dossierPdf", () => ({ exportDossierPdf: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

jest.mock("@/components/manager/development/MeridianDevelopmentPanel", () => ({
  MeridianDevelopmentPanel: () => <div data-testid="meridian-panel" />,
}))
jest.mock("@/components/manager/development/tabs/ProfileStudioPanel", () => ({
  ProfileStudioPanel: () => <div data-testid="write-up-marker" />,
}))

import MemberDevelopmentWorkspace from "../MemberDevelopmentWorkspace"

// The eight dimensions come from the app's own PRISM table — names, order and
// quadrants are canon and are not restated here. Only the scores are invented.
const SCORES = [41, 37, 72, 79, 54, 61, 75, 83]
const EIGHT: PrismDimension[] = (Object.keys(BEHAVIOUR_CONFIG) as unknown as Array<keyof typeof BEHAVIOUR_CONFIG>).map(
  (id, i) => ({
    id: Number(id) as PrismDimension["id"],
    label: BEHAVIOUR_CONFIG[id].label,
    score: SCORES[i],
    quadrant: BEHAVIOUR_CONFIG[id].quadrant,
  }),
)

function dossier(over: Partial<MemberDossier> = {}): MemberDossier {
  return {
    memberId: "m-1",
    member: { name: "Pat Member", title: "Analyst", department: "Operations" },
    reconciledHeadline: "Steady finisher",
    overallConfidence: "high",
    profile: {
      prism: EIGHT,
      reconciliation: { headline: "", throughLine: "", discrepancies: [], confidence: "low" },
      coverage: { prism: true, clifton: false, disc: false },
    },
    goals: [],
    goalCoverage: [],
    gaps: [],
    learning: [],
    milestones: [],
    matches: [],
    ...over,
  }
}

function renderPage(audience: "manager" | "practitioner", data: MemberDossier, path = "/manager/development/m-1") {
  dossierState = { data, isLoading: false, isError: false }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/manager/development/:memberId" element={<MemberDevelopmentWorkspace audience={audience} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const AUDIENCES = [
  ["manager", "manager-layout"],
  ["practitioner", "practitioner-layout"],
] as const

describe.each(AUDIENCES)("the person page as a %s (U4, panels not mocked)", (audience, layout) => {
  it("opens on Profile with the PRISM radar and its eight scores first, above the write-up", async () => {
    renderPage(audience, dossier())
    const radar = await screen.findByTestId("prism-radar")
    expect(screen.getByTestId(layout)).toBeInTheDocument()

    // the default tab is the Profile group
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true")
    const group = screen.getByRole("tabpanel")
    expect(group).toHaveAccessibleName("Profile")

    // the radar is in the FIRST section of that group
    const sections = Array.from(group.querySelectorAll('[data-testid^="dev-section-"]'))
    expect(sections.map((el) => el.getAttribute("data-testid"))).toEqual([
      "dev-section-profile",
      "dev-section-profile-studio",
    ])
    const profile = sections[0] as HTMLElement
    expect(profile).toContainElement(radar)

    // eight score rows, one per dimension, each with its score, in canon order
    const rows = within(profile).getAllByRole("row").slice(1)
    expect(rows).toHaveLength(8)
    rows.forEach((row, i) => {
      expect(within(row).getByText(EIGHT[i].label)).toBeInTheDocument()
      expect(within(row).getByText(String(EIGHT[i].score))).toBeInTheDocument()
    })

    // and the write-up comes after it, never before
    const writeUp = await screen.findByTestId("write-up-marker")
    expect(sections[1]).toContainElement(writeUp)
    expect(radar.compareDocumentPosition(writeUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("a legacy ?tab=profile-studio link still opens with the radar above the write-up", async () => {
    renderPage(audience, dossier(), "/manager/development/m-1?tab=profile-studio")
    const radar = await screen.findByTestId("prism-radar")
    const writeUp = await screen.findByTestId("write-up-marker")
    expect(radar.compareDocumentPosition(writeUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("not shared: the ask replaces the chart, and no chart is drawn", async () => {
    renderPage(
      audience,
      dossier({
        prismNotShared: true,
        // what the server's redaction leaves: no scores, coverage kept
        profile: {
          prism: [],
          reconciliation: { headline: "", throughLine: "", discrepancies: [], confidence: "low" },
          coverage: { prism: true, clifton: false, disc: false },
        },
      }),
    )
    const state = await screen.findByTestId("prism-state-not-shared")
    expect(screen.getByTestId("dev-section-profile")).toContainElement(state)
    expect(within(state).getByRole("button", { name: "Ask to see this profile" })).toBeInTheDocument()
    expect(screen.queryByTestId("prism-radar")).not.toBeInTheDocument()
    expect(within(screen.getByTestId("dev-section-profile")).queryAllByRole("row")).toHaveLength(0)
  })

  it("no account: nobody to ask, and no chart", async () => {
    renderPage(audience, dossier({ prismNotShared: true, prismNoAccount: true, profile: { ...dossier().profile, prism: [] } }))
    expect(await screen.findByTestId("prism-state-no-account")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ask to see this profile" })).not.toBeInTheDocument()
    expect(screen.queryByTestId("prism-radar")).not.toBeInTheDocument()
  })

  it("PRISM not taken: says it is not on file, offers no invite, and draws no chart", async () => {
    renderPage(
      audience,
      dossier({
        profile: {
          prism: [],
          reconciliation: { headline: "", throughLine: "", discrepancies: [], confidence: "low" },
          coverage: { prism: false, clifton: false, disc: false },
        },
      }),
    )
    const section = await screen.findByTestId("dev-section-profile")
    expect(await within(section).findByText("PRISM not on file")).toBeInTheDocument()
    expect(within(section).queryByRole("button", { name: "Send invite" })).not.toBeInTheDocument()
    expect(screen.queryByTestId("prism-radar")).not.toBeInTheDocument()
    expect(within(section).queryAllByRole("row")).toHaveLength(0)
  })
})
