/**
 * @jest-environment jsdom
 *
 * DS-7 — a visit to Direction Setting's Job matches page never overwrites the
 * saved stage-7 target.
 *
 * Before DS-7 every visit recorded the FIRST match as the target before the
 * person clicked anything, so a role picked on an earlier visit was replaced by
 * the default on the next one. Now:
 *
 * - a saved target still in the list is pre-selected and nothing is written;
 * - a saved target no longer in the list is not replaced — the default is
 *   shown as a suggestion and nothing is written;
 * - with nothing saved, the default is written once (stage 9's plan reads
 *   stages 7 and 8, so a first visit that wrote nothing would leave the plan
 *   with no target and no gaps for anyone who never clicked);
 * - only a click writes over a saved target;
 * - while the journey is still loading (or failed) nothing is written except a
 *   click.
 *
 * The no-saved-target path is pinned byte-for-byte, hook arguments and the
 * recorded target included, by the JF-14b and FIT-5 goldens.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitDetail, FitMatch } from "@/types/job-fit"
import type { Journey } from "@/types/direction-setting"

const mockUseMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockAdvance = jest.fn()
const mockUseJourney = jest.fn()
jest.mock("@/hooks/direction-setting/useMatches", () => ({
  useMatches: (...args: unknown[]) => mockUseMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (...args: unknown[]) => mockUseFitDetail(...args),
}))
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({
  useFitSharedDisplayEnabled: () => false,
}))
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  FIT_MATCHES_STALE_MS: 5 * 60_000,
  useFitMatches: () => ({ data: undefined, gated: false, isLoading: false, isError: false }),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({
  useJobFitComponentsEnabled: () => false,
}))
jest.mock("@/hooks/job-fit/useFitComponents", () => ({
  useFitComponents: () => ({ data: undefined, isError: false }),
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({ mutate: mockAdvance, isPending: false }),
  useJourney: () => mockUseJourney(),
}))

import MatchesPage from "../MatchesPage"

function match(jobId: string, roleTitle: string, fitScore: number, extra: Partial<FitMatch> = {}): FitMatch {
  return {
    jobId,
    roleTitle,
    department: null,
    tier: "potential-fit",
    baseTier: "potential-fit",
    fitBand: "Good",
    totalVariation: 100 - fitScore,
    behaviorVariation: 10,
    aptitudeVariation: 15,
    coreTraitVariation: 15,
    confidence: null,
    fitScore,
    method: "gap",
    ...extra,
  } as FitMatch
}

const NURSE = match("n1", "Registered Nurse", 84, { jobSet: "national" })
const FORKLIFT = match("a1", "Forklift Operator", 79, { jobSet: "local" })
const ELECTRICIAN = match("n2", "Electrician", 71, { jobSet: "national" })
const LOCAL_FIRST = [FORKLIFT, NURSE, ELECTRICIAN]
const BEST_FIT = [NURSE, FORKLIFT, ELECTRICIAN]
const PLAIN = [NURSE, ELECTRICIAN]

const detailFor = (jobId?: string): FitDetail | undefined =>
  jobId
    ? ({
        jobId,
        roleTitle: jobId,
        tier: "potential-fit",
        baseTier: "potential-fit",
        totalVariation: 20,
        fitScore: 80,
        perDimension: [],
        criticalGaps: [],
        coachingGaps: [],
        overdoneFlags: [],
        interviewSelfAdvocacy: [],
        methodologyNote: "Compared with the role's published benchmark.",
      } as unknown as FitDetail)
    : undefined

function serve(byOrder: { local: FitMatch[]; fit: FitMatch[] }) {
  mockUseMatches.mockImplementation((_method: string, _opts?: unknown, order?: string) => ({
    data: { matches: order === "fit" ? byOrder.fit : byOrder.local, gated: false },
    isLoading: false,
    isError: false,
  }))
}

/** A journey as GET /journey sends it, with only the fields this page reads. */
function journey(artefactKeys: string[], savedTarget?: Journey["savedTarget"]) {
  const j = { artefactKeys } as Partial<Journey>
  if (savedTarget !== undefined) j.savedTarget = savedTarget
  return { data: j as Journey, isLoading: false, isError: false }
}
const NOTHING_SAVED = journey([])
const LOADING = { data: undefined, isLoading: true, isError: false }
const FAILED = { data: undefined, isLoading: false, isError: true }

const page = () =>
  render(
    <MemoryRouter>
      <MatchesPage />
    </MemoryRouter>,
  )

const written = (stageId: string) => mockAdvance.mock.calls.filter((c) => c[0]?.stageId === stageId)
const stage7 = () => written("7").map((c) => (c[0].artefact.targetRole as FitMatch).jobId)
const stage8 = () => written("8").map((c) => (c[0].artefact as FitDetail).jobId)
const lastDetailId = () => mockUseFitDetail.mock.calls.at(-1)?.[0]
const note = () => document.querySelector("[data-ds7-target-note]")?.textContent ?? null

beforeEach(() => {
  jest.clearAllMocks()
  mockUseJourney.mockReturnValue(NOTHING_SAVED)
  mockUseFitDetail.mockImplementation((jobId?: string) => ({
    data: detailFor(jobId),
    isLoading: false,
    isError: false,
  }))
})

describe("DS-7: a saved target survives a revisit", () => {
  test("still in the list: it is pre-selected and nothing is written", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "n2", roleTitle: "Electrician" }))
    page()
    expect(lastDetailId()).toBe("n2")
    expect(screen.getByRole("button", { name: /electrician/i })).toHaveAttribute("aria-pressed", "true")
    expect(mockAdvance).not.toHaveBeenCalled()
    expect(note()).toBe("Your saved target role is Electrician. Pick another role to change it.")
  })

  test("a method switch that reorders the list keeps it and writes nothing", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "n2", roleTitle: "Electrician" }))
    page()
    mockUseMatches.mockImplementation(() => ({
      data: { matches: [ELECTRICIAN, NURSE].reverse(), gated: false },
      isLoading: false,
      isError: false,
    }))
    fireEvent.click(screen.getByRole("radio", { name: /best overall match/i }))
    expect(lastDetailId()).toBe("n2")
    expect(mockAdvance).not.toHaveBeenCalled()
  })

  test("not in the list any more: the default is a suggestion, not written", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "gone", roleTitle: "Retired Role" }))
    page()
    expect(lastDetailId()).toBe("n1")
    expect(mockAdvance).not.toHaveBeenCalled()
    expect(note()).toBe(
      "Your saved target role, Retired Role, isn't in this list right now. It stays your target unless you pick a role here.",
    )
  })

  test("saved, but the backend does not say which (no savedTarget): nothing written", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"]))
    page()
    expect(lastDetailId()).toBe("n1")
    expect(mockAdvance).not.toHaveBeenCalled()
    expect(note()).toBe("You already have a target role saved. It stays your target unless you pick a role here.")
  })

  test("saved with an unreadable shape (savedTarget null): nothing written", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7"], null))
    page()
    expect(mockAdvance).not.toHaveBeenCalled()
  })

  test("a click DOES replace it, with the picked role's gaps", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "n2", roleTitle: "Electrician" }))
    page()
    fireEvent.click(screen.getByRole("button", { name: /registered nurse/i }))
    expect(stage7()).toEqual(["n1"])
    expect(stage8()).toEqual(["n1"])
    expect(note()).toBeNull()
  })

  test("clicking the saved role itself records it (an explicit choice)", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "n2", roleTitle: "Electrician" }))
    page()
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["n2"])
  })
})

describe("DS-7: nothing saved yet", () => {
  test("the default is shown and written once, as before", () => {
    serve({ local: PLAIN, fit: PLAIN })
    page()
    expect(lastDetailId()).toBe("n1")
    expect(stage7()).toEqual(["n1"])
    expect(stage8()).toEqual(["n1"])
    expect(note()).toBeNull()
  })

  test("a later reorder does not overwrite the default it just wrote", () => {
    serve({ local: PLAIN, fit: PLAIN })
    const { rerender } = page()
    serve({ local: [ELECTRICIAN, NURSE], fit: PLAIN })
    rerender(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>,
    )
    expect(lastDetailId()).toBe("n2")
    expect(stage7()).toEqual(["n1"])
  })

  test("a click after the default write is recorded", () => {
    serve({ local: PLAIN, fit: PLAIN })
    page()
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["n1", "n2"])
  })

  test("while the journey is loading nothing is written — and it is, once it loads empty", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(LOADING)
    const { rerender } = page()
    expect(lastDetailId()).toBe("n1")
    expect(mockAdvance).not.toHaveBeenCalled()
    mockUseJourney.mockReturnValue(NOTHING_SAVED)
    rerender(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>,
    )
    expect(stage7()).toEqual(["n1"])
  })

  test("while the journey is loading, a saved target that arrives is kept", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(LOADING)
    const { rerender } = page()
    mockUseJourney.mockReturnValue(journey(["7"], { jobId: "n2", roleTitle: "Electrician" }))
    rerender(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>,
    )
    expect(lastDetailId()).toBe("n2")
    expect(mockAdvance).not.toHaveBeenCalled()
  })

  test("a failed journey read writes nothing by default, but a click still writes", () => {
    serve({ local: PLAIN, fit: PLAIN })
    mockUseJourney.mockReturnValue(FAILED)
    page()
    expect(mockAdvance).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["n2"])
  })
})

describe("DS-7 with JF-14b's order toggle", () => {
  test("the toggle still works; the saved target stays selected in either order", () => {
    serve({ local: LOCAL_FIRST, fit: BEST_FIT })
    mockUseJourney.mockReturnValue(journey(["7", "8"], { jobId: "n2", roleTitle: "Electrician" }))
    page()
    expect(lastDetailId()).toBe("n2")
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(mockUseMatches).toHaveBeenLastCalledWith("gap", undefined, "fit")
    expect(screen.getByRole("radio", { name: /best fit/i })).toHaveAttribute("aria-checked", "true")
    expect(lastDetailId()).toBe("n2")
    expect(mockAdvance).not.toHaveBeenCalled()
  })

  test("nothing saved: the default follows the order but only the first is written", () => {
    serve({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    expect(stage7()).toEqual(["a1"])
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(lastDetailId()).toBe("n1")
    expect(stage7()).toEqual(["a1"])
  })

  test("order changed before anything was written: JF-14b's rule still holds — only a pick is written", () => {
    // The journey is still loading when the person switches to Best fit, so no
    // default has been written yet. Once it loads with nothing saved, the
    // re-ordered default is still not a choice and is not written.
    serve({ local: LOCAL_FIRST, fit: BEST_FIT })
    mockUseJourney.mockReturnValue(LOADING)
    const { rerender } = page()
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    mockUseJourney.mockReturnValue(NOTHING_SAVED)
    rerender(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>,
    )
    expect(lastDetailId()).toBe("n1")
    expect(mockAdvance).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["n2"])
  })

  test("a saved target not in the list: Best fit's default is not written either", () => {
    serve({ local: LOCAL_FIRST, fit: BEST_FIT })
    mockUseJourney.mockReturnValue(journey(["7"], { jobId: "gone", roleTitle: null }))
    page()
    expect(lastDetailId()).toBe("a1")
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(lastDetailId()).toBe("n1")
    expect(mockAdvance).not.toHaveBeenCalled()
    expect(note()).toBe("Your saved target role isn't in this list right now. It stays your target unless you pick a role here.")
  })
})
