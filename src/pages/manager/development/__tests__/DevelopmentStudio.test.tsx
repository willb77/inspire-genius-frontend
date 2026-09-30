/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

/**
 * The roster page is a shell around one query: it picks a view, filters what the
 * query returned, and hands each row to a card. So what is asserted here is the
 * page's OWN contract — loading, error, the two different empty states, the
 * audience swap, the view toggle, and that a card's content comes from the
 * response rather than from the page.
 *
 * Deliberately NOT asserted, because TDS-10 changes it: which set of people the
 * roster answers for, how that scope is worded, how many cards a multi-row
 * response produces (TDS-10 collapses a Studio-added row into the real account
 * it names), and the absence of a "my reports" control. A green test over any of
 * those would have to be deleted to ship TDS-10, so it is coverage that costs
 * the next lane time. See the report accompanying this file.
 */

/* ---- chrome ---- */
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

/* ---- data hooks ---- */
let rosterState: {
  data: RosterMember[] | undefined
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: true, isError: false }
const refetch = jest.fn()
const addOneMutateAsync = jest.fn()
const addBulkMutateAsync = jest.fn()
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    // AddMemberDialog is rendered for real — it is the page's add / bulk-import
    // entry point, and a mocked-out dialog would assert nothing about it.
    useAddTeamMember: () => ({ mutateAsync: addOneMutateAsync, isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: addBulkMutateAsync, isPending: false }),
  }
})

/* ---- the org chart is a probe: its own suite covers the tree ---- */
const orgChartProps: { memberRoute?: string } = {}
jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: (props: { memberRoute: string }) => {
    orgChartProps.memberRoute = props.memberRoute
    return <div data-testid="org-chart-panel">org chart</div>
  },
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

/* Radix Select needs PointerEvent / hasPointerCapture, which jsdom lacks. Same
 * shell as src/pages/user/__tests__/Support.test.tsx: the trigger keeps its role
 * and label so it is still queried the way a user finds it, and each option is a
 * button that fires onValueChange — so the page's real filter and sort logic
 * runs. */
jest.mock("@/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const Ctx = ReactActual.createContext({} as { onValueChange?: (v: string) => void })
  return {
    __esModule: true,
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode
      onValueChange?: (v: string) => void
    }) => (
      <Ctx.Provider value={{ onValueChange }}>
        <div>{children}</div>
      </Ctx.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const { onValueChange } = ReactActual.useContext(Ctx)
      return (
        <button type="button" onClick={() => onValueChange?.(value)}>
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

/** Invented people — this repo is public. */
function member(over: Partial<RosterMember> = {}): RosterMember {
  return {
    memberId: "m-1",
    name: "Dana Whitfield",
    title: "Service Designer",
    department: "Experience",
    coverage: { prism: true, clifton: true, disc: false },
    reconciledHeadline: "Methodical collaborator who plans before moving.",
    headlineConfidence: "high",
    planStatus: "on_track",
    milestoneProgress: 40,
    topMatch: { title: "Lead Service Designer", fitScore: 78.4 },
    ...over,
  }
}

function renderStudio(props: Parameters<typeof DevelopmentStudio>[0] = {}) {
  return render(
    <MemoryRouter initialEntries={[ROUTES.MANAGER.DEVELOPMENT]}>
      <Routes>
        <Route path={ROUTES.MANAGER.DEVELOPMENT} element={<DevelopmentStudio {...props} />} />
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT} element={<DevelopmentStudio {...props} />} />
        <Route path={ROUTES.MANAGER.DEVELOPMENT_MEMBER} element={<div>manager workspace for m-1</div>} />
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER} element={<div>practitioner workspace for m-1</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Practitioners enter on their own path — ProtectedRoute gates by prefix. */
function renderPractitionerStudio() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.PRACTITIONER.DEVELOPMENT]}>
      <Routes>
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT} element={<DevelopmentStudio audience="practitioner" />} />
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER} element={<div>practitioner workspace for m-1</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const EMPTY_TITLE = "No team members yet"
const ERROR_COPY = "Couldn't load the team roster. Try again."
const NO_MATCH_COPY = "No members match the current filters."

beforeEach(() => {
  jest.clearAllMocks()
  orgChartProps.memberRoute = undefined
  rosterState = { data: undefined, isLoading: true, isError: false }
})

describe("DevelopmentStudio — the three states the roster can be in", () => {
  it("while the roster is loading, says nothing about the roster", () => {
    renderStudio()
    // The heading is chrome and is always there; the claims are not.
    expect(screen.getByRole("heading", { name: "Team Development Studio" })).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument()
    expect(screen.queryByText(ERROR_COPY)).not.toBeInTheDocument()
    expect(screen.queryByText(NO_MATCH_COPY)).not.toBeInTheDocument()
    expect(screen.queryAllByRole("button", { name: /Open development workspace/i })).toHaveLength(0)
  })

  it("a failed load reads as a failure, not as an empty team, and retrying refetches", () => {
    rosterState = { data: undefined, isLoading: false, isError: true }
    renderStudio()
    expect(screen.getByText(ERROR_COPY)).toBeInTheDocument()
    // The failure mode this guards: an error rendered as the empty state, which
    // tells a manager their team is gone.
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("an empty roster says so and offers the way in, without claiming an error", () => {
    rosterState = { data: [], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument()
    expect(
      screen.getByText("Invite your team to build their development dossiers. Start by importing your roster."),
    ).toBeInTheDocument()
    expect(screen.queryByText(ERROR_COPY)).not.toBeInTheDocument()
    // Two ways to add: the header action and one inside the empty state itself.
    // An empty state that only describes the emptiness is a dead end.
    expect(screen.getAllByRole("button", { name: /Add member/i })).toHaveLength(2)
  })

  it("a filter that matches nobody is distinguished from having nobody", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.change(screen.getByRole("textbox", { name: /Search team members/i }), {
      target: { value: "nobody-by-this-name" },
    })
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument()
    expect(screen.queryByText("Dana Whitfield")).not.toBeInTheDocument()
  })
})

describe("DevelopmentStudio — a card carries the response, not the page's invention", () => {
  it("renders the fields the roster row carried", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    const card = screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i })
    expect(within(card).getByText("Dana Whitfield")).toBeInTheDocument()
    expect(within(card).getByText(/Service Designer · Experience/)).toBeInTheDocument()
    expect(within(card).getByText("Methodical collaborator who plans before moving.")).toBeInTheDocument()
    expect(within(card).getByText("Lead Service Designer")).toBeInTheDocument()
    expect(within(card).getByText("78%")).toBeInTheDocument()
    expect(within(card).getByLabelText("40% of milestones complete")).toBeInTheDocument()
  })

  it("invents nothing for the fields the row left out", () => {
    rosterState = {
      data: [
        member({
          reconciledHeadline: undefined,
          headlineConfidence: undefined,
          topMatch: undefined,
          milestoneProgress: undefined,
          coverage: { prism: false, clifton: false, disc: false },
        }),
      ],
      isLoading: false,
      isError: false,
    }
    renderStudio()
    const card = screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i })
    expect(within(card).queryByText(/%/)).not.toBeInTheDocument()
    expect(within(card).queryByText(/Methodical collaborator/)).not.toBeInTheDocument()
    // What a row with no PRISM gets instead is the invitation, not a headline.
    expect(within(card).getByText("Invite to complete PRISM to build a profile.")).toBeInTheDocument()
  })

  it("searching matches on title and department, not only the name", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    const search = screen.getByRole("textbox", { name: /Search team members/i })
    fireEvent.change(search, { target: { value: "experience" } })
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
    fireEvent.change(search, { target: { value: "service designer" } })
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
  })
})

describe("DevelopmentStudio — the filters filter, and say when they have hidden everyone", () => {
  it("coverage: asking for the members with no assessments hides one who has them", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: "No assessments" }))
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Partial" }))
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Complete (3/3)" }))
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
  })

  it("plan status: a member on track is not returned by the at-risk filter", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: "At risk" }))
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "On track" }))
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
  })

  it("department: the choices are the departments the response actually carried", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByRole("combobox", { name: "Department" })).toBeInTheDocument()
    // Not a hardcoded list: "Experience" is there because the row said so.
    expect(screen.getByRole("button", { name: "Experience" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Engineering" })).not.toBeInTheDocument()
  })

  it("department: no filter is offered when no row carries one", () => {
    rosterState = { data: [member({ department: undefined })], isLoading: false, isError: false }
    renderStudio()
    // An empty dropdown is worse than none at all.
    expect(screen.queryByRole("combobox", { name: "Department" })).not.toBeInTheDocument()
  })
})

describe("DevelopmentStudio — the sort", () => {
  /**
   * Two unrelated people, chosen so readiness and last-activity order them
   * OPPOSITELY — that is what makes each comparator's failure visible.
   *
   * This asserts the ORDER of rows the response carried. It says nothing about
   * which people the roster answers for, nor how many cards a row produces.
   */
  const ready = member({
    memberId: "m-ready",
    name: "Dana Whitfield",
    coverage: { prism: true, clifton: true, disc: false, prismAssessedAt: "2026-01-10" },
    milestoneProgress: 40,
    topMatch: { title: "Lead Service Designer", fitScore: 78.4 },
  })
  const recent = member({
    memberId: "m-recent",
    name: "Rowan Escobar",
    title: "Analyst",
    department: "Experience",
    coverage: { prism: true, clifton: false, disc: false, prismAssessedAt: "2026-09-01" },
    milestoneProgress: 10,
    topMatch: { title: "Senior Analyst", fitScore: 40 },
  })
  const names = () =>
    screen
      .getAllByRole("button", { name: /Open development workspace for/i })
      .map((el) => el.getAttribute("aria-label"))

  it("leads on readiness, and re-orders on last activity", () => {
    // Given in the least helpful order, so passing cannot be an accident of input.
    rosterState = { data: [recent, ready], isLoading: false, isError: false }
    renderStudio()
    expect(names()[0]).toMatch(/Dana Whitfield/)
    expect(names()[1]).toMatch(/Rowan Escobar/)

    fireEvent.click(screen.getByRole("button", { name: "Last activity" }))
    expect(names()[0]).toMatch(/Rowan Escobar/)
    expect(names()[1]).toMatch(/Dana Whitfield/)
  })
})

describe("DevelopmentStudio — where the page sends you", () => {
  it("a card opens that member's workspace", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i }))
    expect(screen.getByText("manager workspace for m-1")).toBeInTheDocument()
  })

  /**
   * MEASURED, so nobody reads more into this test than it says: the chip sits
   * inside the card and does not stop propagation, so BOTH the chip's handler
   * and the card's own navigate fire, and the card's wins. Gutting the page's
   * `handleInvite` leaves this test green (mutation run 2026-09-29). It
   * therefore asserts only the user-visible outcome — clicking invite does not
   * leave you on the roster — and the page's invite target is NOT verifiable
   * from the UI today. Fixing that is a behaviour change, not a test change.
   */
  it("an invite chip does not leave the manager on the roster", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /DISC — invite to complete/i }))
    expect(screen.getByText("manager workspace for m-1")).toBeInTheDocument()
  })

  it("a practitioner gets the practitioner chrome around the same roster", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderPractitionerStudio()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.queryByTestId("manager-layout")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i })).toBeInTheDocument()
    // Where a practitioner's CARD leads is not asserted here: MemberCard builds
    // its own target from ROUTES.MANAGER.DEVELOPMENT_MEMBER regardless of
    // audience, and /manager/* is not in the practitioner's ROLE_PERMISSIONS —
    // so today that link bounces them home. Asserting either the current
    // behaviour or the intended one would be pinning a bug, so the audience
    // contract is asserted where the page actually owns it: the member path it
    // hands the org chart, below.
  })
})

describe("DevelopmentStudio — the org chart is a view, not a filter", () => {
  it("replaces the grid, and takes the controls that do not apply with it", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByTestId("org-chart-panel")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Coverage" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(screen.getByTestId("org-chart-panel")).toBeInTheDocument()
    expect(screen.queryByText("Dana Whitfield")).not.toBeInTheDocument()
    // A filter left visible over a dataset it cannot filter is worse than one
    // that is not offered.
    expect(screen.queryByRole("combobox", { name: "Coverage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Plan status" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Sort by" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Team" }))
    expect(screen.queryByTestId("org-chart-panel")).not.toBeInTheDocument()
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
  })

  it("hands the chart the audience's own member path", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(orgChartProps.memberRoute).toBe(ROUTES.MANAGER.DEVELOPMENT_MEMBER)
  })

  it("hands a practitioner the practitioner member path", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderPractitionerStudio()
    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(orgChartProps.memberRoute).toBe(ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER)
  })

  it("is offered even before the roster has loaded", () => {
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /Org Chart/i }))
    expect(screen.getByTestId("org-chart-panel")).toBeInTheDocument()
  })
})

describe("DevelopmentStudio — adding people", () => {
  it("offers both the single form and the bulk CSV import", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: /Add member/i }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Add team members" })).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument()

    // Radix TabsTrigger activates on mousedown, not click.
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Bulk upload" }))
    expect(within(dialog).getByRole("button", { name: "Upload CSV file" })).toBeInTheDocument()
    expect(within(dialog).getByText("0 member(s) detected")).toBeInTheDocument()
  })
})

describe("DevelopmentStudio — the skin variant changes the frame, not the content", () => {
  it("renders the same roster under the v2 skin", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio({ variant: "v2" })
    expect(screen.getByRole("heading", { name: "Team Development Studio" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i })).toBeInTheDocument()
  })
})
