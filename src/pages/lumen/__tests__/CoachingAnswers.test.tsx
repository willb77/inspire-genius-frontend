import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CoachingAnswers } from "../CoachingAnswers"
import { exportTurn } from "@/lib/exportTranscript/exportTurn"
import { printTurn } from "@/lib/exportTranscript/printTurn"
import type { CoachAnswer } from "@/hooks/lumen/useCoachAnswer"

// `react-markdown` ships ESM that jest doesn't transform, so the repo mocks the
// renderer rather than transforming it. The mock keeps the raw text visible,
// which is enough to pin the decision that matters here: the answer is handed
// to the Markdown renderer, not dumped in as pre-wrapped plain text.
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => (
    <div data-testid="assistant-markdown">{text}</div>
  ),
}))
jest.mock("@/lib/exportTranscript/exportTurn", () => ({ exportTurn: jest.fn() }))
jest.mock("@/lib/exportTranscript/printTurn", () => ({ printTurn: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

// Radix's DropdownMenu opens on pointerdown, which jsdom does not synthesize.
// The repo convention (see ChatWindowChatTab.turn-export.test.tsx) is to render
// the content inline; `onSelect` still fires on click, which is what we assert.
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    ...rest
  }: {
    children: React.ReactNode
    onSelect?: () => void
  } & Record<string, unknown>) => (
    <button type="button" onClick={() => onSelect?.()} {...rest}>
      {children}
    </button>
  ),
}))

const mockExportTurn = exportTurn as jest.MockedFunction<typeof exportTurn>
const mockPrintTurn = printTurn as jest.MockedFunction<typeof printTurn>

const answer: CoachAnswer = {
  id: "job-1",
  question: "How do I handle a difficult stakeholder?",
  prompt: "How do I handle a difficult stakeholder?\n\nDraw on my PRISM scores.",
  answer: "## Start here\n\n- Name the tension\n- **Then** ask what they need",
  agents: ["Aura"],
  askedAt: new Date("2026-07-30T12:00:00Z"),
}

const renderWindow = (props: Partial<Parameters<typeof CoachingAnswers>[0]> = {}) =>
  render(
    <CoachingAnswers
      answers={[answer]}
      pendingQuestion={null}
      isError={false}
      {...props}
    />
  )

beforeEach(() => {
  mockExportTurn.mockReset().mockResolvedValue(undefined)
  mockPrintTurn.mockReset()
})

describe("CoachingAnswers", () => {
  test("renders nothing until there is something to show", () => {
    const { container } = render(
      <CoachingAnswers answers={[]} pendingQuestion={null} isError={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  test("renders the answer through the Markdown renderer, not as flat text", () => {
    // Coaching answers are mostly headings and lists; flattening them to one
    // grey paragraph is what makes an inline answer feel worse than the chat.
    renderWindow()
    expect(screen.getByTestId("assistant-markdown")).toHaveTextContent("Start here")
    expect(screen.getByTestId("assistant-markdown")).toHaveTextContent(
      "Name the tension"
    )
  })

  test("shows the question alongside its answer", () => {
    renderWindow()
    expect(
      screen.getByRole("heading", { name: "How do I handle a difficult stakeholder?" })
    ).toBeInTheDocument()
  })

  test("exports to Word", async () => {
    renderWindow()
    fireEvent.click(screen.getByTestId("coaching-export-word"))

    await waitFor(() => expect(mockExportTurn).toHaveBeenCalledTimes(1))
    expect(mockExportTurn.mock.calls[0][1]).toBe("word")
  })

  test("exports to PDF", async () => {
    renderWindow()
    fireEvent.click(screen.getByTestId("coaching-export-pdf"))

    await waitFor(() => expect(mockExportTurn).toHaveBeenCalledTimes(1))
    expect(mockExportTurn.mock.calls[0][1]).toBe("pdf")
  })

  test("the exported document carries the question, so the file stands alone", async () => {
    // On screen the question sits directly above the answer. A downloaded file
    // read a week later has no such context.
    renderWindow()
    fireEvent.click(screen.getByTestId("coaching-export-word"))

    await waitFor(() => expect(mockExportTurn).toHaveBeenCalled())
    const input = mockExportTurn.mock.calls[0][0]
    expect(input.body).toContain("How do I handle a difficult stakeholder?")
    expect(input.body).toContain("Name the tension")
    expect(input.contributingAgents).toEqual(["Aura"])
  })

  test("prints the very same document it downloads", async () => {
    // The printout and the download must not be two near-misses — they are
    // built from one input, and this is what pins that.
    renderWindow()
    fireEvent.click(screen.getByTestId("coaching-export-word"))
    await waitFor(() => expect(mockExportTurn).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: /Print this answer/ }))
    expect(mockPrintTurn).toHaveBeenCalledTimes(1)
    expect(mockPrintTurn.mock.calls[0][0]).toEqual(mockExportTurn.mock.calls[0][0])
  })

  test("shows the question while the answer is still coming", () => {
    render(
      <CoachingAnswers answers={[]} pendingQuestion="What should I focus on?" isError={false} />
    )
    expect(screen.getByText("What should I focus on?")).toBeInTheDocument()
    expect(screen.getByText(/Working through this with your profile/)).toBeInTheDocument()
  })

  test("reports a failure instead of leaving the page silent", () => {
    render(<CoachingAnswers answers={[]} pendingQuestion={null} isError />)
    expect(screen.getByText(/didn't go through/)).toBeInTheDocument()
  })
})
