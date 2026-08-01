import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SelfPortraitNarrative } from "../SelfPortraitNarrative"
import {
  useSelfPortraitDescription,
  useAskSelfPortrait,
} from "@/hooks/lumen/useSelfPortrait"
import type { SelfPortrait } from "@/types/lumen"

jest.mock("@/hooks/lumen/useSelfPortrait")

// react-markdown is ESM; jest can't transform it. Mock the renderer (same
// pattern as honor-evaluate.test) — it just needs to surface the text.
jest.mock("@/components/user/chat/AssistantMarkdown", () => {
  return function AssistantMarkdown({ text }: { text: string }) {
    return <div data-testid="assistant-markdown">{text}</div>
  }
})

const mockDescribe = useSelfPortraitDescription as jest.MockedFunction<
  typeof useSelfPortraitDescription
>
const mockAsk = useAskSelfPortrait as jest.MockedFunction<typeof useAskSelfPortrait>

const PORTRAIT: SelfPortrait = {
  prism: { dominant_quadrant: "Green", quadrants: { green: 80, blue: 20 } },
  corroborating: [],
  convergences: [],
  tensions: [],
  headline: "Your PRISM profile leads Green.",
  instruments: ["PRISM", "DISC"],
  confidence: "moderate",
  sources: { prism: true, assessments: true, resume: false, bio: false },
  coverage: "Composed from 2 sources.",
}

function setDescribe(over: Partial<ReturnType<typeof useSelfPortraitDescription>> = {}) {
  mockDescribe.mockReturnValue({
    data: {
      answer: "You lead with **steadiness** and bring people with you.",
      is_description: true,
      disclaimer: "A mirror, not a diagnosis.",
    },
    isLoading: false,
    isError: false,
    ...over,
  } as ReturnType<typeof useSelfPortraitDescription>)
}

const mutateAsync = jest.fn()
function setAsk(over: Record<string, unknown> = {}) {
  mockAsk.mockReturnValue({
    mutateAsync,
    isPending: false,
    data: undefined,
    ...over,
  } as unknown as ReturnType<typeof useAskSelfPortrait>)
}

beforeEach(() => {
  setDescribe()
  setAsk()
  mutateAsync.mockReset()
})

describe("SelfPortraitNarrative", () => {
  test("renders the formatted description", () => {
    render(<SelfPortraitNarrative portrait={PORTRAIT} />)
    // AssistantMarkdown (mocked) surfaces the description text; the real
    // component renders its markdown to <strong>/<ul> etc.
    expect(screen.getByText(/lead with/i)).toBeInTheDocument()
  })

  test("shows a skeleton while the description loads", () => {
    setDescribe({ data: undefined, isLoading: true, isError: false })
    render(<SelfPortraitNarrative portrait={PORTRAIT} />)
    expect(screen.getByTestId("description-loading")).toBeInTheDocument()
  })

  test("answers a question inline, grounded in the portrait", async () => {
    mutateAsync.mockResolvedValueOnce({
      answer: "Your steadiness can read as slow to act under pressure.",
      is_description: false,
      disclaimer: "A mirror, not a diagnosis.",
    })
    render(<SelfPortraitNarrative portrait={PORTRAIT} />)
    // A question that is NOT one of the suggestion chips, so its echo is unique.
    fireEvent.change(screen.getByLabelText(/ask a question about your self-portrait/i), {
      target: { value: "How do I handle conflict?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^ask$/i }))
    await waitFor(() =>
      expect(
        screen.getByText(/slow to act under pressure/i)
      ).toBeInTheDocument()
    )
    // the question is echoed above its answer
    expect(screen.getByText("How do I handle conflict?")).toBeInTheDocument()
    expect(mutateAsync).toHaveBeenCalledWith("How do I handle conflict?")
  })

  test("a suggestion chip asks immediately", async () => {
    mutateAsync.mockResolvedValueOnce({
      answer: "Here are your strengths.",
      is_description: false,
      disclaimer: "",
    })
    render(<SelfPortraitNarrative portrait={PORTRAIT} />)
    fireEvent.click(screen.getByRole("button", { name: /what are my strengths/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("What are my strengths, in plain language?"))
    expect(await screen.findByText("Here are your strengths.")).toBeInTheDocument()
  })

  test("offers PDF and Word export", () => {
    render(<SelfPortraitNarrative portrait={PORTRAIT} />)
    expect(screen.getByRole("button", { name: /^pdf$/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /^word$/i })).toBeEnabled()
  })
})
