/**
 * @jest-environment jsdom
 *
 * "Close this gap" (TDS-4a). The button said that and never called the close
 * route: it fired two seeding mutations without awaiting them and left the gap
 * open, with nothing on screen saying so.
 *
 * Pinned here: the click reaches the close path with THIS gap, the outcome is
 * reported after it settles rather than on the click, a failure says what was
 * written and what was not, and a gap the server reports as closed stops
 * offering to be closed — `GET /gaps` does not filter closed rows out.
 */
const gapsState: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false }
const closeMutate = jest.fn()

jest.mock("@/hooks/manager/development", () => ({
  useGapAnalysis: () => gapsState,
  useCloseGapPlan: () => ({ mutate: closeMutate, isPending: false }),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"
import { toast } from "sonner"

import { GapAnalysisPanel } from "../GapAnalysisPanel"
import type { CareerMatch, DevelopmentGap } from "@/types/development"

const matches: CareerMatch[] = [
  {
    matchId: "cm-1",
    memberId: "m-1",
    kind: "internal",
    title: "Senior CSM",
    blueprintId: "bp-1",
    fitScore: 82,
    classification: "strong_fit",
    rationale: "Strong behavioral alignment.",
  },
]

const gap = (over: Partial<DevelopmentGap> = {}): DevelopmentGap => ({
  gapId: "gap-1",
  memberId: "m-1",
  competency: "Delegation",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
  ...over,
})

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <GapAnalysisPanel memberId="m-1" matches={matches} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  gapsState.data = [gap({ goalId: "g-1" })]
  gapsState.isLoading = false
})

it("sends the gap the button names to the close path", () => {
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Close this gap" }))
  expect(closeMutate).toHaveBeenCalledTimes(1)
  expect(closeMutate.mock.calls[0][0]).toEqual({ gap: gap({ goalId: "g-1" }) })
})

it("reports the close only once it has settled, naming what landed on the plan", () => {
  closeMutate.mockImplementation((_v, opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess({ gap: gap({ status: "closed" }), item: { itemId: "li-1" } }),
  )
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Close this gap" }))
  expect(toast.success).toHaveBeenCalledWith(
    "Delegation gap closed, with a learning item and a milestone on the plan.",
  )
  expect(toast.error).not.toHaveBeenCalled()
})

it("does not promise a milestone for a gap that serves no goal", () => {
  gapsState.data = [gap()]
  closeMutate.mockImplementation((_v, opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess({ gap: gap({ status: "closed" }), item: { itemId: "li-1" } }),
  )
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Close this gap" }))
  expect(toast.success).toHaveBeenCalledWith(
    "Delegation gap closed, with a learning item on the plan.",
  )
})

it("says what was written and what was not when the close failed", () => {
  const message =
    "The learning item was created, but the milestone wasn't — the gap was left open."
  closeMutate.mockImplementation((_v, opts: { onError: (e: Error) => void }) =>
    opts.onError(new Error(message)),
  )
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Close this gap" }))
  expect(toast.error).toHaveBeenCalledWith(message)
  expect(toast.success).not.toHaveBeenCalled()
})

it("stops offering to close a gap the server already reports as closed", () => {
  gapsState.data = [gap({ status: "closed" })]
  renderPanel()
  expect(screen.queryByRole("button", { name: "Close this gap" })).not.toBeInTheDocument()
  expect(screen.getByText(/^Closed\. The learning item and milestone stay on the plan\.$/)).toBeInTheDocument()
})

it("disables only the row being closed, not every other gap's button", () => {
  gapsState.data = [gap(), gap({ gapId: "gap-2", competency: "Prioritising" })]
  closeMutate.mockImplementation(() => {
    /* left in flight */
  })
  renderPanel()
  const buttons = screen.getAllByRole("button", { name: "Close this gap" })
  expect(buttons).toHaveLength(2)
  fireEvent.click(buttons[0])
  expect(screen.getByRole("button", { name: "Closing…" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Close this gap" })).toBeEnabled()
})
