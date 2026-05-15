/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { AskBox } from "../AskBox"

jest.mock("@/services/super-admin/explainability/explainability.service", () => ({
  askTurn: jest.fn(),
  listTurnAsks: jest.fn(),
}))

import {
  askTurn,
  listTurnAsks,
} from "@/services/super-admin/explainability/explainability.service"

const mockAsk = askTurn as jest.MockedFunction<typeof askTurn>
const mockList = listTurnAsks as jest.MockedFunction<typeof listTurnAsks>

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const TURN_ID = "33333333-3333-3333-3333-333333333333"

const SAMPLE_ASK = {
  id: "ask-1",
  turn_id: TURN_ID,
  session_id: "sess-1",
  asked_by: "super-admin-1",
  question: "Why James?",
  answer:
    "1. Direct answer\n   James handles admin requests with the Job Blueprint capability.\n",
  model_used: "claude-sonnet-4-20250514",
  cost_usd: 0.018,
  created_at: "2026-05-15T10:00:00Z",
}

beforeEach(() => {
  mockAsk.mockReset()
  mockList.mockReset()
})

describe("AskBox", () => {
  it("renders the empty state when no turn id is supplied", () => {
    renderWith(<AskBox />)
    expect(screen.getByTestId("ask-box-empty")).toBeInTheDocument()
  })

  it("renders the empty thread message when no asks exist", async () => {
    mockList.mockResolvedValueOnce({
      status: true,
      turn_id: TURN_ID,
      total: 0,
      data: [],
    })
    renderWith(<AskBox turnId={TURN_ID} />)
    expect(await screen.findByText(/no follow-ups yet/i)).toBeInTheDocument()
  })

  it("renders an existing ask thread row from the list", async () => {
    mockList.mockResolvedValueOnce({
      status: true,
      turn_id: TURN_ID,
      total: 1,
      data: [SAMPLE_ASK],
    })
    renderWith(<AskBox turnId={TURN_ID} />)
    expect(await screen.findByText(SAMPLE_ASK.question)).toBeInTheDocument()
    expect(screen.getByText(/James handles admin requests/i)).toBeInTheDocument()
    expect(screen.getByText(SAMPLE_ASK.model_used)).toBeInTheDocument()
  })

  it("submits a new question and clears the textarea on success", async () => {
    mockList.mockResolvedValue({
      status: true,
      turn_id: TURN_ID,
      total: 0,
      data: [],
    })
    mockAsk.mockResolvedValueOnce({
      status: true,
      ask: SAMPLE_ASK,
      remaining_hour: 29,
      remaining_day: 199,
    })

    renderWith(<AskBox turnId={TURN_ID} />)
    const textarea = await screen.findByLabelText(/ask the analyzer/i)
    fireEvent.change(textarea, { target: { value: "Why James?" } })

    const submit = screen.getByRole("button", { name: /ask/i })
    fireEvent.click(submit)

    await waitFor(() =>
      expect(mockAsk).toHaveBeenCalledWith(TURN_ID, { question: "Why James?" })
    )
    await waitFor(() => expect(textarea).toHaveValue(""))
    expect(await screen.findByText(/quota: 29\/hr · 199\/day/i)).toBeInTheDocument()
  })

  it("shows the throttle error returned by the backend", async () => {
    mockList.mockResolvedValue({
      status: true,
      turn_id: TURN_ID,
      total: 0,
      data: [],
    })
    const err = Object.assign(new Error("rate"), {
      response: {
        status: 429,
        data: { detail: "Per-hour Ask limit reached (30/hour)." },
      },
    })
    mockAsk.mockRejectedValueOnce(err)

    renderWith(<AskBox turnId={TURN_ID} />)
    const textarea = await screen.findByLabelText(/ask the analyzer/i)
    fireEvent.change(textarea, { target: { value: "Why James?" } })
    fireEvent.click(screen.getByRole("button", { name: /ask/i }))

    expect(
      await screen.findByText(/Per-hour Ask limit reached/i)
    ).toBeInTheDocument()
  })

  it("disables submit when the textarea is empty", async () => {
    mockList.mockResolvedValueOnce({
      status: true,
      turn_id: TURN_ID,
      total: 0,
      data: [],
    })
    renderWith(<AskBox turnId={TURN_ID} />)
    const submit = await screen.findByRole("button", { name: /ask/i })
    expect(submit).toBeDisabled()
  })
})
