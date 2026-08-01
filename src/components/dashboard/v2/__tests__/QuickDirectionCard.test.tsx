import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import type { Journey, JourneyStage } from "@/types/direction-setting"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core", () => ({
  useVerticalAccess: (key: string) => mockUseVerticalAccess(key),
}))

const mockUseJourney = jest.fn()
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useJourney: (options?: unknown) => mockUseJourney(options),
}))

import { QuickDirectionCard } from "../QuickDirectionCard"

// ── fixtures ────────────────────────────────────────────────────────────────

const STAGE_NAMES = [
  "Establish",
  "Read you",
  "Portrait",
  "Explore",
  "Value it",
  "Goals",
  "Align",
  "Target",
  "Matches",
  "Gap",
  "Plan",
  "Prepare",
  "Rehearse",
]

function stages(completeUpTo: number): JourneyStage[] {
  return STAGE_NAMES.map((name, i) => ({
    id: String(i),
    name,
    question: `${name}?`,
    outcome: `${name} outcome`,
    needs: [],
    state: i < completeUpTo ? "complete" : "not_started",
  }))
}

function journey(overrides: Partial<Journey> = {}): Journey {
  const list = overrides.stages ?? stages(0)
  return {
    userId: "u1",
    stage: 0,
    status: "not_started",
    stageStatus: {},
    stages: list,
    nextAction: { ...list[0], id: list[0].id },
    artefactKeys: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}

const entitled = () =>
  mockUseVerticalAccess.mockReturnValue({
    hasAccess: true,
    isLoading: false,
    enabledVerticals: ["direction-setting"],
  })

const loaded = (data: Journey | undefined, extra: Record<string, unknown> = {}) =>
  mockUseJourney.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  })

function renderCard() {
  return render(
    <MemoryRouter>
      <QuickDirectionCard />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  entitled()
  loaded(journey())
})

// ── tests ───────────────────────────────────────────────────────────────────

describe("QuickDirectionCard — entitlement", () => {
  it("renders nothing when the user is not entitled to the vertical", () => {
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: false,
      isLoading: false,
      enabledVerticals: [],
    })
    const { container } = renderCard()
    expect(container).toBeEmptyDOMElement()
  })

  it("does not read the journey at all when the user is not entitled", () => {
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: false,
      isLoading: false,
      enabledVerticals: [],
    })
    renderCard()
    expect(mockUseJourney).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    )
  })
})

describe("QuickDirectionCard — loading", () => {
  it("shows a skeleton (not a spinner, not the card) while entitlement resolves", () => {
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: false,
      isLoading: true,
      enabledVerticals: [],
    })
    const { container } = renderCard()
    expect(screen.queryByText(/Direction Setting/)).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it("shows a skeleton while the journey loads", () => {
    mockUseJourney.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderCard()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("QuickDirectionCard — journey states", () => {
  it("not_started: invites the user in without assuming they know what to do", () => {
    loaded(journey({ status: "not_started" }))
    renderCard()
    expect(screen.getByText(/Not sure what.s next\? Start here\./)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Start/ })).toBeInTheDocument()
    // No progress line before anything has happened.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("in_progress: names the actual next stage and shows position", () => {
    const list = stages(3)
    loaded(
      journey({
        status: "in_progress",
        stages: list,
        nextAction: {
          ...list[3],
          id: "3",
          name: "Explore",
          question: "what kind of work suits me?",
        },
      })
    )
    renderCard()
    expect(
      screen.getByText("Next: Explore — what kind of work suits me?")
    ).toBeInTheDocument()
    expect(screen.getByText("Step 4 of 13")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Continue/ })).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("complete: offers a way back in rather than sitting dead", () => {
    const list = stages(13)
    loaded(
      journey({
        status: "complete",
        stages: list,
        // The backend sends `id: null` once the journey is finished, but
        // `NextAction = JourneyStage & { id: string | null }` collapses `id`
        // back to `string` (intersection, not override) — so the honest
        // fixture needs a cast. Worth fixing in `types/direction-setting.ts`
        // with `Omit<JourneyStage, "id"> & { id: string | null }`.
        nextAction: { ...list[12], id: null } as unknown as Journey["nextAction"],
      })
    )
    renderCard()
    expect(
      screen.getByText(/You.ve been all the way through Direction Setting\./)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Revisit your journey/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })
})

describe("QuickDirectionCard — failure is silent", () => {
  it("renders nothing when the journey read errors (401/403 included)", () => {
    mockUseJourney.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    const { container } = renderCard()
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when the read succeeds with no journey body", () => {
    loaded(undefined)
    const { container } = renderCard()
    expect(container).toBeEmptyDOMElement()
  })

  it("never retries on the Home surface", () => {
    renderCard()
    expect(mockUseJourney).toHaveBeenCalledWith(
      expect.objectContaining({ retry: false })
    )
  })
})

describe("QuickDirectionCard — navigation", () => {
  it("routes to the journey map, which owns the stage→route mapping", () => {
    loaded(journey({ status: "in_progress" }))
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/journey")
  })
})
