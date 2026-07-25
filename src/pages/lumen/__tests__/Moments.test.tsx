import { render, screen, fireEvent } from "@testing-library/react"
import Moments from "../Moments"
import {
  useAskMoment,
  useMoments,
  useSetMomentState,
} from "@/hooks/lumen/useMoments"
import type { Moment } from "@/types/lumen"

jest.mock("@/hooks/lumen/useMoments")

const mockUseMoments = useMoments as jest.MockedFunction<typeof useMoments>
const mockUseAskMoment = useAskMoment as jest.MockedFunction<typeof useAskMoment>
const mockUseSetMomentState = useSetMomentState as jest.MockedFunction<
  typeof useSetMomentState
>

const MOMENT: Moment = {
  id: "m-1",
  trigger: "pull",
  context: "1:1 with a skip-level",
  body: "Lead with the question.\n\nTry opening with: “How do you see it?”",
  state: "new",
  created_at: "2026-07-24T12:00:00Z",
  delivered_at: "2026-07-24T12:00:00Z",
}

function setup({
  moments = [MOMENT],
  isLoading = false,
  ask = jest.fn(),
  askData = undefined as Moment | undefined,
  askPending = false,
  askError = false,
  setState = jest.fn(),
} = {}) {
  mockUseMoments.mockReturnValue({
    data: { moments, limit: 20, offset: 0, has_more: false },
    isLoading,
  } as ReturnType<typeof useMoments>)
  mockUseAskMoment.mockReturnValue({
    mutate: ask,
    data: askData,
    isPending: askPending,
    isError: askError,
  } as unknown as ReturnType<typeof useAskMoment>)
  mockUseSetMomentState.mockReturnValue({
    mutate: setState,
    isPending: false,
  } as unknown as ReturnType<typeof useSetMomentState>)
  return { ask, setState }
}

describe("Moments", () => {
  afterEach(() => jest.resetAllMocks())

  test("renders the ask box and the feed", () => {
    setup()
    render(<Moments />)
    expect(screen.getByRole("heading", { level: 1, name: "Moments" })).toBeInTheDocument()
    expect(screen.getByLabelText("Describe the situation")).toBeInTheDocument()
    expect(screen.getByText("Lead with the question.")).toBeInTheDocument()
  })

  test("asks for a Moment with the typed context", () => {
    const { ask } = setup()
    render(<Moments />)
    fireEvent.change(screen.getByLabelText("Describe the situation"), {
      target: { value: "a salary negotiation" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Get a Moment/ }))
    expect(ask).toHaveBeenCalledWith({ context: "a salary negotiation" })
  })

  test("will not ask on an empty or near-empty context", () => {
    const { ask } = setup()
    render(<Moments />)
    // The button stays disabled, so no request is possible.
    expect(screen.getByRole("button", { name: /Get a Moment/ })).toBeDisabled()
    expect(ask).not.toHaveBeenCalled()
  })

  test("a preset fills the box", () => {
    setup()
    render(<Moments />)
    fireEvent.click(screen.getByRole("button", { name: "A salary negotiation" }))
    expect(screen.getByLabelText("Describe the situation")).toHaveValue(
      "A salary negotiation"
    )
  })

  test("act / save / dismiss set the Moment's state", () => {
    const { setState } = setup()
    render(<Moments />)
    fireEvent.click(screen.getByRole("button", { name: /I used this/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "acted" })

    fireEvent.click(screen.getByRole("button", { name: /Save/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "saved" })

    fireEvent.click(screen.getByRole("button", { name: /Not useful/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "dismissed" })
  })

  test("a Moment already acted on offers no further actions", () => {
    setup({ moments: [{ ...MOMENT, state: "acted" }] })
    render(<Moments />)
    expect(screen.queryByRole("button", { name: /I used this/ })).not.toBeInTheDocument()
  })

  test("says so when guidance was composed without the model pass", () => {
    setup({ askData: { ...MOMENT, id: "m-2", degraded: true } })
    render(<Moments />)
    expect(screen.getByText(/without the full model pass/)).toBeInTheDocument()
  })

  test("shows the empty state before any Moments exist", () => {
    setup({ moments: [] })
    render(<Moments />)
    expect(screen.getByText(/No Moments yet/)).toBeInTheDocument()
  })

  test("shows a skeleton while the feed loads", () => {
    setup({ isLoading: true })
    render(<Moments />)
    expect(screen.getByTestId("moments-loading")).toBeInTheDocument()
  })

  test("surfaces an ask failure inline", () => {
    setup({ askError: true })
    render(<Moments />)
    expect(screen.getByText(/That didn't work/)).toBeInTheDocument()
  })
})
