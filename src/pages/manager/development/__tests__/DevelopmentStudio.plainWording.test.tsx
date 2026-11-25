/** @jest-environment jsdom */
import fs from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

/**
 * U1 — plain wording on the roster page.
 *
 * The first lens is named for what the server sends the caller. A caller whose
 * role is exactly `manager` is sent their direct reports plus the people they
 * added, so they read "My team". Every other role that reaches the page is sent
 * the organisation's people plus the same additions, and reads "Whole
 * organisation". The subtitle names PRISM only, because CliftonStrengths and
 * DISC are not collected by the platform.
 *
 * Wording only. Which view is shown, what is requested and what each control
 * does are covered by DevelopmentStudio.test and DevelopmentStudio.myReports.
 *
 * Invented people — this repo is public.
 */

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const rosterState: { data: RosterMember[]; isLoading: boolean; isError: boolean } = {
  data: [
    {
      memberId: "m-1",
      name: "Dana Whitfield",
      title: "Service Designer",
      department: "Experience",
      coverage: { prism: true, clifton: false, disc: false },
      planStatus: "on_track",
    },
  ],
  isLoading: false,
  isError: false,
}

// TDS-U11b: the practitioner mount also reads unconnected clients from the
// roster query; that section has its own suite (UnconnectedClientsSection).
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
  }
})

let mockRole = "manager"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => role === mockRole }),
}))

jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel">org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel">my reports</div>,
}))
jest.mock("@/components/manager/development/LinkRequestsPanel", () => ({
  LinkRequestsPanel: () => null,
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/* Radix Select needs PointerEvent / hasPointerCapture, which jsdom lacks. */
jest.mock("@/components/ui/select", () => ({
  __esModule: true,
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: { children: React.ReactNode }) => (
    <div role="combobox" {...rest}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

import DevelopmentStudio from "../DevelopmentStudio"
import { DEV_TEXT } from "@/constants/development"
import { ROUTES } from "@/constants/routes"

function renderStudio(audience: "manager" | "practitioner" = "manager") {
  const route = audience === "practitioner" ? ROUTES.PRACTITIONER.DEVELOPMENT : ROUTES.MANAGER.DEVELOPMENT
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={route} element={<DevelopmentStudio audience={audience} />} />
      </Routes>
    </MemoryRouter>,
  )
}

const MANAGER_SCOPE =
  "This list is your direct reports, plus anyone you added here or hold a dossier for. It is not the whole organisation."

describe("DevelopmentStudio — the first lens is named for what the caller is sent (U1)", () => {
  it('a manager reads "My team", and is not told the list is the whole organisation', () => {
    mockRole = "manager"
    renderStudio("manager")
    expect(screen.getByRole("button", { name: "My team" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Whole organisation" })).not.toBeInTheDocument()
    expect(screen.getByText(MANAGER_SCOPE)).toBeInTheDocument()
    expect(screen.queryByText(DEV_TEXT["dev.studio.scope.team"])).not.toBeInTheDocument()
  })

  it('a super-admin on the manager mount reads "Whole organisation"', () => {
    mockRole = "super-admin"
    renderStudio("manager")
    expect(screen.getByRole("button", { name: "Whole organisation" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "My team" })).not.toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.scope.team"])).toBeInTheDocument()
    expect(screen.queryByText(MANAGER_SCOPE)).not.toBeInTheDocument()
  })

  it('a practitioner on the practitioner mount reads "Whole organisation"', () => {
    mockRole = "practitioner"
    renderStudio("practitioner")
    expect(screen.getByRole("button", { name: "Whole organisation" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "My team" })).not.toBeInTheDocument()
    expect(screen.getByText(DEV_TEXT["dev.studio.scope.team"])).toBeInTheDocument()
  })

  it.each(["manager", "super-admin", "practitioner"])('no lens is called just "Team" for a %s', (role) => {
    mockRole = role
    renderStudio(role === "practitioner" ? "practitioner" : "manager")
    expect(screen.queryByRole("button", { name: "Team" })).not.toBeInTheDocument()
    // The other two lenses keep their names.
    expect(screen.getByRole("button", { name: "My reports" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Org Chart" })).toBeInTheDocument()
  })
})

describe("DevelopmentStudio — the subtitle names only what the platform collects (U1)", () => {
  it.each([
    ["manager", "manager"],
    ["practitioner", "practitioner"],
  ] as const)("names PRISM and neither CliftonStrengths nor DISC on the %s mount", (audience, role) => {
    mockRole = role
    renderStudio(audience)
    const subtitle = screen.getByText("Each person's PRISM, with their goals, gaps, learning and career matches.")
    expect(subtitle).toBeInTheDocument()
    expect(subtitle.textContent).not.toMatch(/clifton/i)
    expect(subtitle.textContent).not.toMatch(/\bdisc\b/i)
  })
})

/**
 * The page tests above run against the English file only (jest.setup resolves
 * react-i18next from it). The other six languages the parity gate covers are
 * read here, so a language left on its old word fails in this suite and not
 * only in a browser set to that language.
 */
describe("the two renamed locale strings, in every language the parity gate reads (U1)", () => {
  const ROOT = path.resolve(__dirname, "../../../../..")
  const read = (lang: string) =>
    JSON.parse(fs.readFileSync(path.join(ROOT, "public/locales", lang, "managerPages.json"), "utf8")) as {
      developmentStudio: Record<string, string>
      memberDevelopmentWorkspace: Record<string, string>
    }

  const EXPECTED: Record<string, { team: string; myTeam: string; activity: string; oldTeam: string; oldActivity: string }> = {
    en: { team: "Whole organisation", myTeam: "My team", activity: "Recent activity", oldTeam: "Team", oldActivity: "Provenance" },
    es: { team: "Toda la organización", myTeam: "Mi equipo", activity: "Actividad reciente", oldTeam: "Equipo", oldActivity: "Procedencia" },
    fr: { team: "Toute l'organisation", myTeam: "Mon équipe", activity: "Activité récente", oldTeam: "Équipe", oldActivity: "Provenance" },
    pt: { team: "Toda a organização", myTeam: "Minha equipe", activity: "Atividade recente", oldTeam: "Equipe", oldActivity: "Origem" },
    it: { team: "Tutta l'organizzazione", myTeam: "Il mio team", activity: "Attività recente", oldTeam: "Team", oldActivity: "Provenienza" },
    pl: { team: "Cała organizacja", myTeam: "Mój zespół", activity: "Ostatnia aktywność", oldTeam: "Zespół", oldActivity: "Pochodzenie" },
    cs: { team: "Celá organizace", myTeam: "Můj tým", activity: "Nedávná aktivita", oldTeam: "Tým", oldActivity: "Původ" },
  }

  it.each(Object.keys(EXPECTED))("%s", (lang) => {
    const file = read(lang)
    const want = EXPECTED[lang]
    expect(file.developmentStudio.team).toBe(want.team)
    expect(file.developmentStudio.team).not.toBe(want.oldTeam)
    expect(file.developmentStudio.myTeam).toBe(want.myTeam)
    expect(file.memberDevelopmentWorkspace.provenance).toBe(want.activity)
    expect(file.memberDevelopmentWorkspace.provenance).not.toBe(want.oldActivity)
    // The trigger and the popover heading it opens say the same thing.
    expect(file.memberDevelopmentWorkspace.provenance).toBe(file.memberDevelopmentWorkspace.recentActivity)
  })
})
