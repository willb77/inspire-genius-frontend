import { render, screen } from "@testing-library/react"
import SelfPortrait from "../SelfPortrait"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import type { SelfPortrait as Portrait } from "@/types/lumen"

jest.mock("@/hooks/lumen/useSelfPortrait")

const mockUseSelfPortrait = useSelfPortrait as jest.MockedFunction<typeof useSelfPortrait>

function mockPortrait(data: Partial<Portrait> | undefined, extra = {}) {
  mockUseSelfPortrait.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  } as ReturnType<typeof useSelfPortrait>)
}

const FULL: Portrait = {
  prism: { dominant_quadrant: "Green", quadrants: { green: 80, blue: 20 } },
  corroborating: [
    { framework: "BigFive", confidence: 0.92, maps_to: "Green", agrees_with_prism: true },
    { framework: "DISC", confidence: 0.85, maps_to: "Blue", agrees_with_prism: false },
  ],
  convergences: ["BigFive corroborates PRISM Green."],
  tensions: ["DISC implies Blue but PRISM shows Green."],
  headline: "Your PRISM profile leads Green.",
  instruments: ["BigFive", "DISC", "PRISM"],
  confidence: "moderate",
}

describe("SelfPortrait", () => {
  afterEach(() => jest.resetAllMocks())

  test("leads with the PRISM anchor", () => {
    mockPortrait(FULL)
    render(<SelfPortrait />)
    expect(screen.getByRole("heading", { level: 1, name: "My Self-Portrait" })).toBeInTheDocument()
    expect(screen.getByText("Green leads")).toBeInTheDocument()
  })

  test("shows tensions rather than smoothing them over", () => {
    mockPortrait(FULL)
    render(<SelfPortrait />)
    expect(screen.getByText("Where they pull apart")).toBeInTheDocument()
    expect(
      screen.getByText("DISC implies Blue but PRISM shows Green.")
    ).toBeInTheDocument()
  })

  test("lists corroborating instruments with their confidence", () => {
    mockPortrait(FULL)
    render(<SelfPortrait />)
    // "BigFive" appears twice — once as an instrument badge, once in the
    // corroborating list — so assert on the confidence line, which is unique.
    expect(screen.getAllByText("BigFive").length).toBeGreaterThan(0)
    expect(screen.getByText("confidence 0.92")).toBeInTheDocument()
    expect(screen.getByText("confidence 0.85")).toBeInTheDocument()
  })

  test("still reads the sources it does have when PRISM is absent", () => {
    // This used to say "your portrait isn't ready yet". With the four-source
    // composer a résumé alone produces a genuine read, and telling someone who
    // just uploaded one that nothing is ready is both wrong and how you lose
    // them. PRISM's absence downgrades the read; it no longer cancels it.
    mockPortrait({
      ...FULL,
      prism: null,
      corroborating: [],
      convergences: [],
      tensions: [],
      headline: "Built from your résumé — the record of what you've actually done.",
      instruments: [],
      confidence: "low",
      sources: { prism: false, assessments: false, resume: true, bio: false },
      coverage: "This read rests on your résumé alone.",
    })
    render(<SelfPortrait />)
    expect(screen.getByText("No PRISM profile yet")).toBeInTheDocument()
    expect(screen.queryByText(/leads$/)).not.toBeInTheDocument()
    expect(screen.getByText(/rests on your résumé alone/)).toBeInTheDocument()
  })

  test("shows every source, present and absent alike", () => {
    // Showing the gaps is the point: the user needs to know what would sharpen
    // the portrait, not just what it already has.
    mockPortrait({
      ...FULL,
      sources: { prism: true, assessments: false, resume: true, bio: false },
      coverage: "Composed from 2 sources.",
    })
    render(<SelfPortrait />)
    expect(screen.getByText("What this is built from")).toBeInTheDocument()
    expect(screen.getByText("Résumé")).toBeInTheDocument()
    // An absent source renders its "what this would add" prompt.
    expect(screen.getByText(/signal in its own right/)).toBeInTheDocument()
    expect(screen.getByText("Composed from 2 sources.")).toBeInTheDocument()
  })

  test("omits the coverage panel against a backend that predates it", () => {
    // `sources` is optional purely for back-compat; the page must not render an
    // all-absent panel and imply the user has nothing on file.
    mockPortrait(FULL)
    render(<SelfPortrait />)
    expect(screen.queryByText("What this is built from")).not.toBeInTheDocument()
  })

  test("shows a skeleton while loading", () => {
    mockPortrait(undefined, { isLoading: true })
    render(<SelfPortrait />)
    expect(screen.getByTestId("portrait-loading")).toBeInTheDocument()
  })

  test("shows an error state rather than a blank frame", () => {
    mockPortrait(undefined, { isError: true })
    render(<SelfPortrait />)
    expect(screen.getByText("We couldn't load your portrait")).toBeInTheDocument()
  })
})
