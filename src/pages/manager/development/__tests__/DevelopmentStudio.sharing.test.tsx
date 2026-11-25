/** @jest-environment jsdom */
/**
 * U6c on the roster page: the Sharing filter, the default lens (decision D6)
 * and the "Engagement" control that replaces Member Oversight's menu row
 * (decision D13).
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"
import { SHARING_CASES, parse } from "@/test/rosterSharingFixtures"

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

let rosterData: RosterMember[] = []
// TDS-U11b: the practitioner mount also reads unconnected clients from the
// roster query; that section has its own suite (UnconnectedClientsSection).
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ data: rosterData, isLoading: false, isError: false, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
    usePersonLookup: () => ({ results: [], isLoading: false, isError: false }),
  }
})
let mockRole = "manager"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (r: string) => r === mockRole }),
}))
jest.mock("@/components/manager/development/OrgChartPanel", () => ({ OrgChartPanel: () => <div /> }))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({ MyReportsPanel: () => <div /> }))
jest.mock("@/components/manager/development/LinkRequestsPanel", () => ({ LinkRequestsPanel: () => null }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/* Same Select shell as DevelopmentStudio.test.tsx: each option is a button. */
jest.mock("@/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const Ctx = ReactActual.createContext({} as { onValueChange?: (v: string) => void })
  return {
    __esModule: true,
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
      <Ctx.Provider value={{ onValueChange }}>
        <div>{children}</div>
      </Ctx.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const { onValueChange } = ReactActual.useContext(Ctx)
      return (
        <button type="button" data-filter-value={value} onClick={() => onValueChange?.(value)}>
          {children}
        </button>
      )
    },
    SelectTrigger: ({ children, ...rest }: { children: React.ReactNode }) => (
      <div role="combobox" {...rest}>
        {children}
      </div>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  }
})

import DevelopmentStudio from "../DevelopmentStudio"
import { ROUTES } from "@/constants/routes"

/** One row per state, each with its own id and invented name. */
const NAMES = ["Ash Corrigan", "Bea Lindqvist", "Cal Okonkwo", "Dee Marchetti", "Eli Vasquez", "Fen Takahashi", "Gus Abernathy", "Hal Nyberg"]
function roster(): RosterMember[] {
  return SHARING_CASES.map((c, i) => ({ ...parse(c.json), memberId: `mbr-${i}`, name: NAMES[i] }))
}

function renderAt(audience: "manager" | "practitioner") {
  const path = audience === "manager" ? ROUTES.MANAGER.DEVELOPMENT : ROUTES.PRACTITIONER.DEVELOPMENT
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<DevelopmentStudio audience={audience} />} />
        <Route path={ROUTES.MANAGER.STUDENTS} element={<div>member oversight page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function cardNames(): string[] {
  return screen
    .queryAllByRole("button", { name: /^Open development workspace for / })
    .map((b) => (b.getAttribute("aria-label") ?? "").replace("Open development workspace for ", ""))
}

function filterOption(value: string): HTMLElement {
  // "all" is a value every filter has; the Sharing one is the option that says so.
  if (value === "all") return screen.getByRole("button", { name: "All sharing" })
  const el = document.querySelector(`[data-filter-value="${value}"]`)
  if (!el) throw new Error(`no filter option ${value}`)
  return el as HTMLElement
}

beforeEach(() => {
  rosterData = roster()
  mockRole = "manager"
})

describe("Sharing filter", () => {
  it("lists every state, labelled", () => {
    renderAt("manager")
    const labels = ["all", ...SHARING_CASES.map((c) => c.display)].map((v) => filterOption(v).textContent)
    expect(labels).toEqual([
      "All sharing",
      "Not asked",
      "Awaiting reply",
      "Shared with you",
      "Declined",
      "Withdrawn",
      "Term ended",
      "No account",
      "Not known",
    ])
  })

  it.each(SHARING_CASES.map((c, i) => [c.display, i] as const))("%s keeps exactly that person", (display, i) => {
    renderAt("manager")
    expect(cardNames()).toHaveLength(8)
    fireEvent.click(filterOption(display))
    expect(cardNames()).toEqual([NAMES[i]])
    fireEvent.click(filterOption("all"))
    expect(cardNames()).toHaveLength(8)
  })

  it("reads 'No account' only when the roster's grant read worked", () => {
    // Every block null: the read failed (or an older backend). The minted row is then Not known.
    rosterData = roster().map((m) => ({ ...m, sharing: null }))
    renderAt("manager")
    fireEvent.click(filterOption("no_account"))
    expect(cardNames()).toEqual([])
    fireEvent.click(filterOption("not_known"))
    expect(cardNames()).toHaveLength(8)
  })
})

describe("default lens — D6: the server's list, not My reports", () => {
  it.each([
    ["manager", "My team"],
    ["super-admin", "Whole organisation"],
  ])("%s opens on %s", (role, label) => {
    mockRole = role
    renderAt("manager")
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /My reports/ })).toHaveAttribute("aria-pressed", "false")
  })
})

describe("Engagement — D13: Member Oversight is opened from the Studio", () => {
  it("the manager mount links to the Member Oversight page", () => {
    renderAt("manager")
    const link = screen.getByRole("link", { name: "Engagement" })
    expect(link).toHaveAttribute("href", ROUTES.MANAGER.STUDENTS)
    fireEvent.click(link)
    expect(screen.getByText("member oversight page")).toBeInTheDocument()
  })

  it("the practitioner mount has no link: /manager is refused to a practitioner", () => {
    renderAt("practitioner")
    expect(screen.queryByRole("link", { name: "Engagement" })).not.toBeInTheDocument()
  })
})

describe("U6d: a withheld plan (planStatus null) in the filter and sort", () => {
  function u6d(id: string, name: string, planStatus: RosterMember["planStatus"], withheld: string[]): RosterMember {
    return {
      memberId: id,
      name,
      coverage: { prism: true, clifton: false, disc: false },
      planStatus,
      milestoneProgress: null,
      topMatch: null,
      identityResolved: true,
      sharing: { state: "none", grantedCategories: [], canRequest: true },
      withheld,
    }
  }

  it("renders, sorts a withheld plan after every known one, and matches no plan option", () => {
    rosterData = [
      u6d("w-1", "Ivo Brandt", null, ["development"]),
      u6d("w-2", "Jo Perrault", "no_plan", []),
      u6d("w-3", "Kit Osei", "at_risk", []),
    ]
    renderAt("manager")
    expect(cardNames()).toEqual(["Kit Osei", "Jo Perrault", "Ivo Brandt"])
    fireEvent.click(filterOption("no_plan"))
    expect(cardNames()).toEqual(["Jo Perrault"])
  })
})
