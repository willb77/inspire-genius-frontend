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
// TDS-U11b: the practitioner mount also reads unconnected clients from the
// roster query; that section has its own suite (UnconnectedClientsSection).
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    // AddMemberDialog is rendered for real — it is the page's add / bulk-import
    // entry point, and a mocked-out dialog would assert nothing about it.
    useAddTeamMember: () => ({ mutateAsync: addOneMutateAsync, isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: addBulkMutateAsync, isPending: false }),
    // T1's "Find a person" — its own suite (AddMemberDialog.lookup.test) covers it.
    usePersonLookup: () => ({ results: [], isLoading: false, isError: false }),
  }
})
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: () => false }),
}))

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
import { byText } from "@/test/byText"

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
    expect(screen.getAllByRole("button", { name: /Add people/i })).toHaveLength(2)
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
    expect(within(card).getByText(byText("Invite to complete PRISM to build a profile."))).toBeInTheDocument()
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
  /**
   * U2 (decision D5) — the filter asks only whether a person has taken PRISM.
   * CliftonStrengths and DISC cannot be collected by the platform, so they
   * neither qualify someone for "Has PRISM" nor keep them out of "PRISM not
   * taken".
   */
  const prismOnly = member({
    memberId: "m-prism-only",
    name: "Tamsin Okonkwo-Reyes",
    coverage: { prism: true, clifton: false, disc: false },
  })
  const othersOnly = member({
    memberId: "m-others-only",
    name: "Ilario Vantongeren",
    coverage: { prism: false, clifton: true, disc: true },
  })
  const nothing = member({
    memberId: "m-nothing",
    name: "Brisa Halloway-Kemp",
    coverage: { prism: false, clifton: false, disc: false },
  })

  it("coverage: the choices are about PRISM only, with no 3/3 nobody can reach and no 'Partial'", () => {
    rosterState = { data: [prismOnly], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByRole("button", { name: "PRISM: all" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Has PRISM" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "PRISM not taken" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /3\/3/ })).not.toBeInTheDocument()
    // A member with PRISM alone is not labelled partial anywhere on the roster.
    expect(screen.queryByText(/partial/i)).not.toBeInTheDocument()
  })

  it.each([
    ["manager", renderStudio],
    ["practitioner", renderPractitionerStudio],
  ] as const)("coverage (%s roster): 'Has PRISM' returns a PRISM-only member and not one with only CliftonStrengths and DISC", (_audience, render) => {
    rosterState = { data: [prismOnly, othersOnly, nothing], isLoading: false, isError: false }
    render()
    fireEvent.click(screen.getByRole("button", { name: "Has PRISM" }))
    expect(screen.getByText("Tamsin Okonkwo-Reyes")).toBeInTheDocument()
    expect(screen.queryByText("Ilario Vantongeren")).not.toBeInTheDocument()
    expect(screen.queryByText("Brisa Halloway-Kemp")).not.toBeInTheDocument()
  })

  it.each([
    ["manager", renderStudio],
    ["practitioner", renderPractitionerStudio],
  ] as const)("coverage (%s roster): 'PRISM not taken' returns everyone without PRISM, whatever else they have", (_audience, render) => {
    rosterState = { data: [prismOnly, othersOnly, nothing], isLoading: false, isError: false }
    render()
    fireEvent.click(screen.getByRole("button", { name: "PRISM not taken" }))
    expect(screen.queryByText("Tamsin Okonkwo-Reyes")).not.toBeInTheDocument()
    expect(screen.getByText("Ilario Vantongeren")).toBeInTheDocument()
    expect(screen.getByText("Brisa Halloway-Kemp")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "PRISM: all" }))
    expect(screen.getByText("Tamsin Okonkwo-Reyes")).toBeInTheDocument()
    expect(screen.getByText("Ilario Vantongeren")).toBeInTheDocument()
    expect(screen.getByText("Brisa Halloway-Kemp")).toBeInTheDocument()
  })

  it("coverage: asking for the members without PRISM hides one who has it", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: "PRISM not taken" }))
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Has PRISM" }))
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
  })

  /**
   * TDS A3 (CSA #2213, option 2): A1 collects CliftonStrengths and DISC and the
   * roster reads them live, so each returns as its own filter. Readiness is
   * untouched (D5; the readiness test below still holds).
   */
  const cliftonOnly = member({
    memberId: "m-clifton-only",
    name: "Marisol Achterberg",
    coverage: { prism: false, clifton: true, disc: false },
  })
  const discOnly = member({
    memberId: "m-disc-only",
    name: "Quentin Abernathy-Lowe",
    coverage: { prism: false, clifton: false, disc: true },
  })

  it.each([
    ["manager", renderStudio],
    ["practitioner", renderPractitionerStudio],
  ] as const)("coverage (%s roster): 'Has CliftonStrengths' returns exactly the members with a CliftonStrengths result", (_audience, render) => {
    rosterState = { data: [prismOnly, othersOnly, nothing, cliftonOnly, discOnly], isLoading: false, isError: false }
    render()
    fireEvent.click(screen.getByRole("button", { name: "Has CliftonStrengths" }))
    expect(screen.getByText("Ilario Vantongeren")).toBeInTheDocument()
    expect(screen.getByText("Marisol Achterberg")).toBeInTheDocument()
    expect(screen.queryByText("Tamsin Okonkwo-Reyes")).not.toBeInTheDocument()
    expect(screen.queryByText("Brisa Halloway-Kemp")).not.toBeInTheDocument()
    expect(screen.queryByText("Quentin Abernathy-Lowe")).not.toBeInTheDocument()
  })

  it.each([
    ["manager", renderStudio],
    ["practitioner", renderPractitionerStudio],
  ] as const)("coverage (%s roster): 'Has DISC' returns exactly the members with a DISC result", (_audience, render) => {
    rosterState = { data: [prismOnly, othersOnly, nothing, cliftonOnly, discOnly], isLoading: false, isError: false }
    render()
    fireEvent.click(screen.getByRole("button", { name: "Has DISC" }))
    expect(screen.getByText("Ilario Vantongeren")).toBeInTheDocument()
    expect(screen.getByText("Quentin Abernathy-Lowe")).toBeInTheDocument()
    expect(screen.queryByText("Tamsin Okonkwo-Reyes")).not.toBeInTheDocument()
    expect(screen.queryByText("Brisa Halloway-Kemp")).not.toBeInTheDocument()
    expect(screen.queryByText("Marisol Achterberg")).not.toBeInTheDocument()
  })

  it("coverage: nobody with CliftonStrengths says so, rather than showing an empty grid", () => {
    rosterState = { data: [prismOnly, nothing], isLoading: false, isError: false }
    renderStudio()
    fireEvent.click(screen.getByRole("button", { name: "Has CliftonStrengths" }))
    expect(screen.getByText(NO_MATCH_COPY)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Has DISC" }))
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

  /**
   * U2 (decision D5) — readiness no longer rewards CliftonStrengths or DISC.
   *
   * Score = (PRISM ? 20 : 0) + milestones / 2 + top-match fit / 4.
   *   all three, 10% milestones, fit 40  → 20 + 5 + 10 = 35   (was 60 + 5 + 10 = 75)
   *   PRISM only, 60% milestones, fit 80 → 20 + 30 + 20 = 70  (was 70)
   *   Clifton + DISC, 50% milestones     →  0 + 25 + 0  = 25  (was 40 + 25 = 65)
   * New order: PRISM only, all three, Clifton + DISC. Old order: all three first.
   */
  it.each([
    ["manager", renderStudio],
    ["practitioner", renderPractitionerStudio],
  ] as const)("readiness (%s roster) counts PRISM, progress and fit, not CliftonStrengths or DISC", (_audience, render) => {
    const allThree = member({
      memberId: "m-all-three",
      name: "Oriel Fenwick-Sato",
      coverage: { prism: true, clifton: true, disc: true },
      milestoneProgress: 10,
      topMatch: { title: "Programme Lead", fitScore: 40 },
    })
    const prismAlone = member({
      memberId: "m-prism-alone",
      name: "Tamsin Okonkwo-Reyes",
      coverage: { prism: true, clifton: false, disc: false },
      milestoneProgress: 60,
      topMatch: { title: "Programme Lead", fitScore: 80 },
    })
    const othersAlone = member({
      memberId: "m-others-alone",
      name: "Ilario Vantongeren",
      coverage: { prism: false, clifton: true, disc: true },
      milestoneProgress: 50,
      topMatch: undefined,
    })
    // Given in the old order, so the new order cannot be an accident of input.
    rosterState = { data: [allThree, othersAlone, prismAlone], isLoading: false, isError: false }
    render()
    const order = names()
    expect(order).toHaveLength(3)
    expect(order[0]).toMatch(/Tamsin Okonkwo-Reyes/)
    expect(order[1]).toMatch(/Oriel Fenwick-Sato/)
    expect(order[2]).toMatch(/Ilario Vantongeren/)
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
  })

  // The card body is the main way into a workspace. It used to build its target
  // from the MANAGER route whatever the audience, and /manager/* is not in the
  // practitioner's ROLE_PERMISSIONS, so the click bounced them home. This suite
  // previously declined to assert either behaviour rather than pin the bug.
  it("a practitioner's card opens the practitioner workspace", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderPractitionerStudio()
    fireEvent.click(screen.getByRole("button", { name: /Open development workspace for Dana Whitfield/i }))
    expect(screen.getByText("practitioner workspace for m-1")).toBeInTheDocument()
  })
})

describe("DevelopmentStudio — the org chart is a view, not a filter", () => {
  it("replaces the grid, and takes the controls that do not apply with it", () => {
    rosterState = { data: [member()], isLoading: false, isError: false }
    renderStudio()
    expect(screen.getByRole("button", { name: "Whole organisation" })).toHaveAttribute("aria-pressed", "true")
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

    fireEvent.click(screen.getByRole("button", { name: "Whole organisation" }))
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
    fireEvent.click(screen.getByRole("button", { name: /Add people/i }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Add people" })).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument()

    // Radix TabsTrigger activates on mousedown, not click.
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Import a file" }))
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
