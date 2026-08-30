import { render, screen, within } from "@testing-library/react"
import SelfPortrait from "../SelfPortrait"
import {
  useSelfPortrait,
  useSelfPortraitDescription,
  useAskSelfPortrait,
} from "@/hooks/lumen/useSelfPortrait"
import type { SelfPortrait as Portrait } from "@/types/lumen"

jest.mock("@/hooks/lumen/useSelfPortrait")

// react-markdown is ESM; jest can't transform it. Mock the renderer the
// narrative card uses (same pattern as honor-evaluate.test).
jest.mock("@/components/user/chat/AssistantMarkdown", () => {
  return function AssistantMarkdown({ text }: { text: string }) {
    return <div data-testid="assistant-markdown">{text}</div>
  }
})

const mockUseSelfPortrait = useSelfPortrait as jest.MockedFunction<typeof useSelfPortrait>
const mockDescribe = useSelfPortraitDescription as jest.MockedFunction<
  typeof useSelfPortraitDescription
>
const mockAsk = useAskSelfPortrait as jest.MockedFunction<typeof useAskSelfPortrait>

// The narrative card the page now mounts fetches a description and offers a
// query box; give both benign defaults so the existing page assertions stand.
beforeEach(() => {
  mockDescribe.mockReturnValue({
    data: { answer: "You lead with steadiness.", is_description: true, disclaimer: "A mirror, not a diagnosis." },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useSelfPortraitDescription>)
  mockAsk.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
    data: undefined,
  } as unknown as ReturnType<typeof useAskSelfPortrait>)
})

function mockPortrait(data: Partial<Portrait> | undefined, extra = {}) {
  mockUseSelfPortrait.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  } as ReturnType<typeof useSelfPortrait>)
}

const FULL: Portrait = {
  prism: {
    dominant_quadrant: "Green",
    quadrants: { green: 80, blue: 20 },
    // The page no longer renders the quadrant means, so the dimensions are what
    // carries the PRISM read — a fixture without them tests a blank card.
    dimensions: { innovating: 90, initiating: 70, supporting: 30, coordinating: 10 },
    orientation: { introversion: 40, extroversion: 60 },
    score_type: "Underlying",
  },
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

  test("leads with the headline and the behavioural dimensions", () => {
    mockPortrait(FULL)
    render(<SelfPortrait />)
    expect(screen.getByRole("heading", { level: 1, name: "My Self-Portrait" })).toBeInTheDocument()
    expect(screen.getByText("The eight behavioural dimensions")).toBeInTheDocument()
    expect(screen.getByText("Innovating")).toBeInTheDocument()
  })

  test("keeps the quadrant read even though the quadrant card is gone", () => {
    // The whole justification for removing `PortraitQuadrants` from this page:
    // the dimensions card groups each pair under its quadrant colour, so
    // Green/Blue/Red/Gold survive — with their constituent scores, not just the
    // mean. If that grouping ever disappears, this removal starts losing data.
    mockPortrait(FULL)
    render(<SelfPortrait />)
    // Scoped to the dimensions card: "Green" and "Blue" also appear in the
    // corroborating list as `maps_to`, and an unscoped query would pass on
    // those alone — i.e. it would pass even if the grouping were gone.
    const card = screen
      .getByText("The eight behavioural dimensions")
      .closest("[data-slot='card']") as HTMLElement
    expect(within(card).getByText("Green")).toBeInTheDocument()
    expect(within(card).getByText("Blue")).toBeInTheDocument()
    expect(within(card).getByText("Innovating")).toBeInTheDocument()
    expect(screen.queryByText("Green leads")).not.toBeInTheDocument()
  })

  test("lists corroborating instruments with their confidence", () => {
    mockPortrait(FULL)
    render(<SelfPortrait />)
    // "BigFive" used to appear twice — instrument badge and corroborating list.
    // The badge row is gone, so the corroborating list is now its only mention.
    expect(screen.getAllByText("BigFive")).toHaveLength(1)
    expect(screen.getByText("confidence 0.92")).toBeInTheDocument()
    expect(screen.getByText("confidence 0.85")).toBeInTheDocument()
  })

  test("drops the six sections that were removed by request", () => {
    // Removals are as much a contract as additions — without this, any of them
    // could be reinstated by a careless merge and nothing would object.
    mockPortrait({
      ...FULL,
      sources: { prism: true, assessments: true, resume: true, bio: true },
      coverage: "Composed from 4 sources.",
      evidence: [
        { source: "resume", kind: "emphasis", label: "leading others", detail: "mentioned often" },
      ],
      evidence_note: "Drawn from your own words, not from an assessment.",
    })
    render(<SelfPortrait />)

    expect(screen.queryByText("Ask your self-portrait")).not.toBeInTheDocument()
    expect(screen.queryByText("What this is built from")).not.toBeInTheDocument()
    expect(screen.queryByText("Green leads")).not.toBeInTheDocument()
    expect(screen.queryByText("What your own words add")).not.toBeInTheDocument()
    expect(screen.queryByText("Where your instruments agree")).not.toBeInTheDocument()
    expect(screen.queryByText("Where they pull apart")).not.toBeInTheDocument()
    expect(screen.queryByText("Confidence: moderate")).not.toBeInTheDocument()
  })

  test("the data behind the removed sections still reaches the page", () => {
    // The sections were removed from the view, not from the payload: the export
    // in the narrative card still writes evidence and quadrants into the PDF.
    // A backend change that stopped sending them would be a different bug, and
    // this asserts the page is not the thing that dropped them.
    const withEverything: Partial<Portrait> = {
      ...FULL,
      evidence: [
        { source: "resume", kind: "span", label: "9 years", detail: "2015–2024" },
      ],
    }
    mockPortrait(withEverything)
    render(<SelfPortrait />)
    expect(screen.getByText("PDF")).toBeInTheDocument()
    expect(screen.getByText("Word")).toBeInTheDocument()
  })

  test("keeps the non-clinical disclaimer that used to live in the ask box", () => {
    // The disclaimer was rendered inside "Ask your self-portrait". Removing that
    // card must not quietly remove the caveat with it.
    mockPortrait(FULL)
    render(<SelfPortrait />)
    expect(screen.getByText("A mirror, not a diagnosis.")).toBeInTheDocument()
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
    // The coverage line moved off this page with "What this is built from".
    expect(screen.queryByText(/rests on your résumé alone/)).not.toBeInTheDocument()
  })

  test("renders nothing PRISM-shaped when the anchor carries no dimensions", () => {
    // Honest consequence of dropping the quadrant card: a portrait that has
    // quadrant means but no per-dimension detail now shows no PRISM section at
    // all, because `PortraitDimensions` returns null. The live backend always
    // sends dimensions; this pins the shape of the gap rather than hiding it.
    mockPortrait({
      ...FULL,
      prism: { dominant_quadrant: "Green", quadrants: { green: 80, blue: 20 } },
    })
    render(<SelfPortrait />)
    expect(screen.queryByText("The eight behavioural dimensions")).not.toBeInTheDocument()
    expect(screen.queryByText("Green leads")).not.toBeInTheDocument()
    // The rest of the page still stands.
    expect(screen.getByText("confidence 0.92")).toBeInTheDocument()
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
