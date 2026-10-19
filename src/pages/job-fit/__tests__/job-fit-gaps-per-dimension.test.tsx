/**
 * @jest-environment jsdom
 *
 * "Gaps at a glance" — every number is a PER-DIMENSION distance.
 *
 * The matches payload carries domain SUMS (behaviour over 8 dimensions, aptitude
 * over 8, core traits over 6). The page used to average those sums across roles
 * and colour them with per-dimension thresholds (green ≤12 … red >40), so a
 * profile My Fit reads as close could still show three red meters. The fixture
 * below is illustrative: sums of ~170 / ~121 / ~77 on full 22-dimension reads,
 * i.e. ~21 / ~15 / ~13 per dimension.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitMatch } from "@/types/job-fit"

const mockUseFitMatches = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: (...args: unknown[]) => mockUseFitMatches(...args),
}))

import GapsPage from "../GapsPage"
import {
  aggregateDomains,
  DOMAIN_DIMENSIONS,
  hasFullDomainSplit,
  meterTone,
  perDimensionMean,
} from "../_gaps"

/** A full 22-dimension read, as blueprint-service serves it. */
function fullRow(i: number, b: number, a: number, c: number): FitMatch {
  const total = b + a + c
  return {
    jobId: `job-${i}`,
    roleTitle: `Example Role ${i}`,
    department: null,
    tier: "strong-fit",
    baseTier: "strong-fit",
    fitBand: "Excellent",
    displayBand: "Excellent",
    totalVariation: total,
    behaviorVariation: b,
    aptitudeVariation: a,
    coreTraitVariation: c,
    confidence: null,
    fitScore: Math.round(100 - total / 22),
    method: "gap",
    closenessScore: null,
    criticalGapCount: 0,
    dimensionsEvaluated: 22,
    dimensionsTotal: 22,
    coverage: "full",
    verdictWithheld: false,
  }
}

// Mean sums 170 / 121 / 77 across the rows (168+172, 120+122, 76+78).
const SAMPLE: FitMatch[] = [fullRow(1, 168, 120, 76), fullRow(2, 172, 122, 78)]

/** A behaviours-only profile: 8 of 22 evaluated, only the behaviour sum is non-zero. */
const PARTIAL: FitMatch = {
  ...fullRow(9, 96, 0, 0),
  roleTitle: "Partial Example Role",
  tier: null,
  baseTier: null,
  fitBand: "Partial",
  displayBand: "Partial",
  dimensionsEvaluated: 8,
  coverage: "partial",
  verdictWithheld: true,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GapsPage />
    </MemoryRouter>
  )
}

/** The FitStat card whose heading is `label`. */
function statCard(label: string): HTMLElement {
  const card = screen.getByRole("heading", { name: label }).closest("section")
  if (!card) throw new Error(`no stat card for ${label}`)
  return card
}

beforeEach(() => jest.clearAllMocks())

describe("_gaps helpers", () => {
  test("domain sizes come from the PRISM catalogue (8 / 8 / 6)", () => {
    expect(DOMAIN_DIMENSIONS).toEqual({ behavior: 8, aptitude: 8, coreTrait: 6 })
  })

  test("domain averages are per dimension, not per sum", () => {
    const d = aggregateDomains(SAMPLE)
    expect(d.map((x) => [x.key, x.avg])).toEqual([
      ["behavior", 21], // 170 / 8 = 21.25
      ["aptitude", 15], // 121 / 8 = 15.1
      ["coreTrait", 13], // 77 / 6 = 12.8
    ])
  })

  test("colours on the sample agree with a close fit — none red", () => {
    const tones = aggregateDomains(SAMPLE).map((x) => meterTone(x.avg))
    expect(tones).not.toContain("red")
    expect(tones).toEqual(["teal", "teal", "teal"])
  })

  test("thresholds are unchanged", () => {
    expect([12, 13, 25, 26, 40, 41].map(meterTone)).toEqual([
      "green",
      "teal",
      "teal",
      "amber",
      "amber",
      "red",
    ])
  })

  test("a role's mean divides by the dimensions actually evaluated", () => {
    expect(perDimensionMean(SAMPLE[0])).toBeCloseTo(364 / 22)
    expect(perDimensionMean(PARTIAL)).toBe(12) // 96 over 8, not over 22
  })

  test("a partial read is left out of the domain split; an older full read is kept", () => {
    expect(hasFullDomainSplit(PARTIAL)).toBe(false)
    // The coverage flag alone is enough, even without a count.
    expect(
      hasFullDomainSplit({ ...SAMPLE[0], dimensionsEvaluated: undefined, coverage: "partial" })
    ).toBe(false)
    expect(hasFullDomainSplit(SAMPLE[0])).toBe(true)
    const legacy: FitMatch = { ...SAMPLE[0] }
    delete legacy.dimensionsEvaluated
    delete legacy.dimensionsTotal
    delete legacy.coverage
    delete legacy.verdictWithheld
    expect(hasFullDomainSplit(legacy)).toBe(true)
    // A full-coverage row on a role benchmarked on a subset cannot be split either.
    expect(hasFullDomainSplit({ ...SAMPLE[0], dimensionsEvaluated: 14, dimensionsTotal: 14 })).toBe(
      false
    )
    // Including PARTIAL must not move the averages.
    expect(aggregateDomains([...SAMPLE, PARTIAL])).toEqual(aggregateDomains(SAMPLE))
  })

  test("no splittable role → no domain averages", () => {
    expect(aggregateDomains([PARTIAL])).toEqual([])
    expect(aggregateDomains([])).toEqual([])
  })
})

describe("GapsPage", () => {
  test("renders per-dimension domain values with non-red tones", () => {
    mockUseFitMatches.mockReturnValue({ data: SAMPLE, isLoading: false, isError: false })
    renderPage()
    const expected: Array<[string, string]> = [
      ["Behavioral style", "21"],
      ["Aptitudes", "15"],
      ["Core traits", "13"],
    ]
    for (const [label, value] of expected) {
      const card = statCard(label)
      expect(within(card).getByText(value)).toBeInTheDocument()
      expect(within(card).getAllByText(/per dimension/i).length).toBeGreaterThan(0)
      expect(card.innerHTML).not.toContain("#b91c1c") // the red tone's text colour
    }
    // The old sums must not be printed anywhere.
    expect(screen.queryByText("170")).not.toBeInTheDocument()
    expect(screen.queryByText("121")).not.toBeInTheDocument()
    expect(screen.queryByText("77")).not.toBeInTheDocument()
    // Biggest area named; pointer to the per-role dimension breakdown.
    expect(screen.getByText("behavioral style")).toBeInTheDocument()
    expect(screen.getByText(/which dimensions make up its gap/i)).toBeInTheDocument()
  })

  test("widest-gap roles rank and colour by the per-dimension mean", () => {
    // 280 over 8 dimensions = 35 per dimension: the widest gap, smallest total.
    const widePartial: FitMatch = {
      ...PARTIAL,
      jobId: "job-10",
      roleTitle: "Wide Partial Role",
      behaviorVariation: 280,
      totalVariation: 280,
    }
    mockUseFitMatches.mockReturnValue({
      data: [...SAMPLE, PARTIAL, widePartial],
      isLoading: false,
      isError: false,
    })
    renderPage()
    const links = screen.getAllByRole("link")
    // Wide Partial (35) > Example Role 2 (372/22 ≈ 17) > Role 1 (364/22 ≈ 17) >
    // Partial (96/8 = 12) — a raw-total sort would put both partial rows last.
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining("Wide Partial Role"),
      expect.stringContaining("Example Role 2"),
      expect.stringContaining("Example Role 1"),
      expect.stringContaining("Partial Example Role"),
    ])
    expect(links[0]).toHaveTextContent("avg. 35 per dimension")
    expect(links[3]).toHaveTextContent("avg. 12 per dimension")
    // Bars on the mean: teal (≈17), not the red a raw total of ~370 produced.
    expect(links[1].innerHTML).toContain("bg-[#0D9488]")
    expect(links[1].innerHTML).not.toContain("bg-[#ef4444]")
    // Partial rows excluded from the domain split — and the page says so.
    expect(screen.getByText(/based on 2 of 4 roles/i)).toBeInTheDocument()
  })

  test("all-partial profile explains why there is no domain split", () => {
    mockUseFitMatches.mockReturnValue({ data: [PARTIAL], isLoading: false, isError: false })
    renderPage()
    expect(screen.queryByRole("heading", { name: "Behavioral style" })).not.toBeInTheDocument()
    expect(screen.getByText(/can.t be split into/i)).toBeInTheDocument()
    expect(screen.getByText("Partial Example Role")).toBeInTheDocument()
  })

  test("renders the hook's error", () => {
    mockUseFitMatches.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Request failed with status code 503" },
    })
    renderPage()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent(/couldn.t load your gap summary/i)
    expect(alert).toHaveTextContent("Request failed with status code 503")
    expect(screen.queryByText(/no matched roles yet/i)).not.toBeInTheDocument()
  })

  test("loading state", () => {
    mockUseFitMatches.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/aggregating gaps/i)).toBeInTheDocument()
  })
})
