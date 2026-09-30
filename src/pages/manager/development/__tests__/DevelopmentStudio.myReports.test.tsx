/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

/**
 * TDS-10's page-level contract: the roster page says which question each view
 * answers, and it offers a My Reports view that is a narrower set than the
 * roster rather than a filter on it.
 *
 * A separate file from `DevelopmentStudio.test.tsx` on purpose. That file was
 * written (FE #565) to assert the page's own states WITHOUT pinning roster
 * scope or the view-toggle's option list, so this package would not have to
 * delete anything. It needed no edit; nothing here is added to it either.
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

let rosterState: {
  data: RosterMember[] | undefined
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: true, isError: false }

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
  }
})

/* Both panels are probes here: each has its own suite. What this file asserts
 * is which one the page mounts, and what the page says alongside it. */
jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel">org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel">my reports</div>,
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/* Radix Select needs PointerEvent / hasPointerCapture, which jsdom lacks. */
jest.mock("@/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  return {
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
    __react: ReactActual,
  }
})

import DevelopmentStudio from "../DevelopmentStudio"
import { DEV_TEXT } from "@/constants/development"
import { ROUTES } from "@/constants/routes"

function member(over: Partial<RosterMember> = {}): RosterMember {
  return {
    memberId: "m-1",
    name: "Dana Whitfield",
    title: "Service Designer",
    department: "Experience",
    coverage: { prism: true, clifton: true, disc: false },
    planStatus: "on_track",
    ...over,
  }
}

function renderStudio() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.MANAGER.DEVELOPMENT]}>
      <Routes>
        <Route path={ROUTES.MANAGER.DEVELOPMENT} element={<DevelopmentStudio />} />
        <Route path={ROUTES.MANAGER.DEVELOPMENT_MEMBER} element={<div>workspace</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  rosterState = { data: [member()], isLoading: false, isError: false }
})

describe("DevelopmentStudio — the page says which question the view answers", () => {
  /**
   * The roster's scope sentence must not claim to be the organisation and
   * nothing else. `list_roster` UNIONs the org query with
   * `growth.roster_members` and with anyone holding a dossier, "including
   * people with no `user_profiles` row in this org" — so "everyone in your
   * organisation" would be a false statement about this list.
   */
  it("the roster is described as the organisation PLUS additions, and not as the reporting line", () => {
    renderStudio()
    const scope = screen.getByText(DEV_TEXT["dev.studio.scope.team"])
    expect(scope).toBeInTheDocument()
    expect(scope.textContent).toMatch(/plus anyone added here/i)
    expect(scope.textContent).toMatch(/not your reporting line/i)
  })

  it("My reports is described as being inside the caller's own organisation", () => {
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    const scope = screen.getByText(DEV_TEXT["dev.studio.scope.reports"])
    expect(scope).toBeInTheDocument()
    // The whole point of the package: a manager whose reports sit elsewhere is
    // told so on the page rather than left to read zero as a fault.
    expect(scope.textContent).toMatch(/different organisation is not here/i)
    expect(screen.queryByText(DEV_TEXT["dev.studio.scope.team"])).not.toBeInTheDocument()
  })

  it("the Org Chart is described as drawing the lines, not listing the people", () => {
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(screen.getByText(DEV_TEXT["dev.studio.scope.org"])).toBeInTheDocument()
    expect(screen.queryByText(DEV_TEXT["dev.studio.scope.team"])).not.toBeInTheDocument()
  })
})

describe("DevelopmentStudio — My reports is a view, not a filter", () => {
  it("replaces the grid and takes the controls that do not apply with it", () => {
    renderStudio()
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
    expect(screen.queryByTestId("my-reports-panel")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
    expect(screen.queryByText("Dana Whitfield")).not.toBeInTheDocument()
    expect(screen.queryByTestId("org-chart-panel")).not.toBeInTheDocument()
    // A filter over a set it cannot filter is worse than one not offered.
    expect(screen.queryByRole("combobox", { name: "Coverage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Sort by" })).not.toBeInTheDocument()
  })

  it("the three views are mutually exclusive and each is reachable from the others", () => {
    renderStudio()
    const pressed = () =>
      ["Team", "My reports", "Org Chart"].filter(
        (name) =>
          screen.getByRole("button", { name: new RegExp(`^${name}$`) }).getAttribute("aria-pressed") ===
          "true",
      )

    expect(pressed()).toEqual(["Team"])
    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    expect(pressed()).toEqual(["My reports"])
    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(pressed()).toEqual(["Org Chart"])
    fireEvent.click(screen.getByRole("button", { name: "Team" }))
    expect(pressed()).toEqual(["Team"])
  })

  /**
   * The grid's own empty and error states are NOT reused here. "No team members
   * yet" over a manager whose reports are all cross-org is false, and a load
   * failure rendered as an empty team is the failure mode this programme keeps
   * hitting. The panel owns its own sentences — see MyReportsPanel's suite.
   */
  it("does not borrow the roster's empty state", () => {
    rosterState = { data: [], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByText(DEV_TEXT["dev.studio.empty.title"])).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    expect(screen.queryByText(DEV_TEXT["dev.studio.empty.title"])).not.toBeInTheDocument()
    expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
  })

  it("does not borrow the roster's error state either", () => {
    rosterState = { data: undefined, isLoading: false, isError: true }
    renderStudio()
    expect(screen.getByText(DEV_TEXT["dev.studio.error"])).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    expect(screen.queryByText(DEV_TEXT["dev.studio.error"])).not.toBeInTheDocument()
    expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
  })

  it("is offered before the roster has loaded", () => {
    rosterState = { data: undefined, isLoading: true, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /My reports/i }))
    expect(screen.getByTestId("my-reports-panel")).toBeInTheDocument()
  })
})
