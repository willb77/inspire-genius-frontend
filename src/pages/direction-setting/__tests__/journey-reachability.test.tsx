/**
 * @jest-environment jsdom
 *
 * The journey map, showing what is reachable now.
 *
 * Two related silences, both of which made the map say more than it knew:
 *
 * 1. **`needs` was rendered instead of what is actually missing.** `needs` is a
 *    stage's standing requirement list and never changes, so a stage went on
 *    telling someone it would be "thin without your PRISM results" for as long
 *    as they used the product — including long after their PRISM was on file.
 *    The server now sends `unmetNeeds`, which is what is missing *right now*.
 *
 * 2. **Optional stages were indistinguishable from required ones.** Nothing
 *    downstream depends on Self-Portrait, Salary, Alignment or ROI, but they sat
 *    in the list looking exactly like the stages that gate everything after
 *    them. `next_action` now skips past them server-side; the map says why.
 *
 * Nothing here tests locking, because nothing locks. Every stage stays
 * enterable — this is about what the page *says*, not what it permits.
 */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockGetJourney = jest.fn()
jest.mock("@/services/direction-setting/journey.service", () => ({
  getJourney: (...a: unknown[]) => mockGetJourney(...a),
  advanceJourney: jest.fn(),
  generateJourneyReport: jest.fn(),
  resetJourney: jest.fn(),
  getCareerAreas: jest.fn(),
  getStages: jest.fn(),
}))

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}))

import JourneyPage from "@/pages/direction-setting/JourneyPage"

type StageOverrides = Record<string, unknown>

const stage = (id: string, name: string, o: StageOverrides = {}) => ({
  id,
  name,
  question: `q${id}`,
  outcome: `o${id}`,
  needs: [],
  unmetNeeds: [],
  reachable: true,
  optional: false,
  state: "not_started",
  ...o,
})

function renderWith(stages: unknown[], nextActionId = "3") {
  mockGetJourney.mockResolvedValue({
    data: {
      userId: "u1",
      stage: 1,
      status: "in_progress",
      stageStatus: { "0": "complete", "1": "complete" },
      stages,
      nextAction: {
        id: nextActionId,
        name: "Explore",
        question: "q",
        outcome: "o",
        needs: [],
        unmetNeeds: [],
        optional: false,
        state: "not_started",
      },
      artefactKeys: [],
      createdAt: null,
      updatedAt: null,
    },
  })
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JourneyPage />
    </QueryClientProvider>
  )
}

describe("what a stage says it is missing", () => {
  /**
   * The tile face is ~165px wide at seven columns, so the full sentence moved
   * into the tooltip and a short chip stayed behind. These assert BOTH: the
   * chip is what a user sees at a glance, the tooltip is where the detail went,
   * and a change that dropped either would be a real loss.
   */
  const tileFor = (name: string) =>
    screen.getByText(name).closest("button") as HTMLElement

  test("names only what is actually outstanding, not the standing list", async () => {
    renderWith([
      stage("0", "Land", { state: "complete" }),
      stage("3", "Explore", { needs: ["prism"], unmetNeeds: [] }),
    ])
    expect(await screen.findByText("Explore")).toBeInTheDocument()
    expect(screen.queryByText(/^Thin:/)).not.toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(tileFor("Explore").title).toMatch(/everything it needs is on file/i)
  })

  test("still explains a genuinely missing input", async () => {
    renderWith([
      stage("0", "Land", { state: "complete" }),
      stage("9", "Plan", { needs: ["gaps"], unmetNeeds: ["gaps"] }),
    ])
    expect(await screen.findByText("Thin: gaps")).toBeInTheDocument()
    const tile = tileFor("Plan")
    expect(tile.title).toMatch(/thin without your gap analysis/i)
    // Still openable — nothing locks.
    expect(tile.title).toMatch(/you can still open it/i)
  })

  test("lists several missing inputs together", async () => {
    renderWith([
      stage("10", "Justify", {
        needs: ["plan", "salary"],
        unmetNeeds: ["plan", "salary"],
      }),
    ])
    expect(await screen.findByText("Thin: plan, salary")).toBeInTheDocument()
    expect(tileFor("Justify").title).toMatch(
      /thin without your plan and salary data/i
    )
  })

  test("falls back to `needs` when the backend predates `unmetNeeds`", async () => {
    // An older engine sends no `unmetNeeds` at all. Saying something true-ish
    // beats saying nothing; `?? []` would have silently hidden every warning.
    const old = {
      id: "9",
      name: "Plan",
      question: "q",
      outcome: "o",
      needs: ["gaps"],
      state: "not_started",
    }
    renderWith([old])
    expect(await screen.findByText("Thin: gaps")).toBeInTheDocument()
    expect(tileFor("Plan").title).toMatch(/thin without your gap analysis/i)
  })

  test("the tooltip carries the prose the tile face cannot", async () => {
    // The question and outcome left the face when the tiles were shortened.
    // They did not leave the page.
    renderWith([stage("3", "Explore", { needs: [], unmetNeeds: [] })])
    await screen.findByText("Explore")
    const title = tileFor("Explore").title
    expect(title).toContain("q3")
    expect(title).toContain("o3")
  })

  test("says nothing about needs on a finished stage", async () => {
    renderWith([
      stage("9", "Plan", {
        needs: ["gaps"],
        unmetNeeds: ["gaps"],
        state: "complete",
      }),
    ])
    expect(await screen.findByText("Plan")).toBeInTheDocument()
    expect(screen.queryByText(/thin without/i)).not.toBeInTheDocument()
  })
})

describe("optional stages", () => {
  test("are marked, so they do not read as the thing blocking the funnel", async () => {
    renderWith([
      stage("2", "Read", { optional: true }),
      stage("3", "Explore"),
    ])
    expect(await screen.findByText("Read")).toBeInTheDocument()
    expect(screen.getByText("Optional")).toBeInTheDocument()
  })

  test("stop being labelled once done", async () => {
    renderWith([stage("2", "Read", { optional: true, state: "complete" })])
    expect(await screen.findByText("Read")).toBeInTheDocument()
    expect(screen.queryByText("Optional")).not.toBeInTheDocument()
  })

  test("a required stage carries no optional badge", async () => {
    renderWith([stage("5", "Direct")])
    expect(await screen.findByText("Direct")).toBeInTheDocument()
    expect(screen.queryByText("Optional")).not.toBeInTheDocument()
  })

  test("the served nextAction is what gets the Next badge, not the first row", async () => {
    // The whole point of the server-side change: the earliest incomplete stage
    // (optional Read) must not be the one flagged as next.
    renderWith(
      [stage("2", "Read", { optional: true }), stage("3", "Explore")],
      "3"
    )
    expect(await screen.findByText("Explore")).toBeInTheDocument()
    const badge = screen.getByText("Next")
    // The badge sits inside the row it belongs to.
    expect(badge.closest("li")).toHaveTextContent("Explore")
    expect(badge.closest("li")).not.toHaveTextContent("Read")
  })
})
