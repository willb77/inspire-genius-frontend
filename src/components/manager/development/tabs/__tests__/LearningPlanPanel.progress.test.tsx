/**
 * @jest-environment jsdom
 *
 * Learning progress (TDS-4a). The tab rendered `<Progress value={item.progress}>`
 * with no way to change it — a number the surface could show and not write.
 *
 * Pinned here: the save reaches the PATCH with the item and the percentage, only
 * the fields it means to change are sent, a value outside 0..100 is clamped
 * before it is sent rather than being rejected by the server, and the outcome is
 * reported after the mutation settles.
 */
const updateMutate = jest.fn()
jest.mock("@/hooks/manager/development", () => ({
  useUpdateLearningItem: () => ({ mutate: updateMutate, isPending: false }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"
import { toast } from "sonner"

import { LearningPlanPanel } from "../LearningPlanPanel"
import type { LearningItem } from "@/types/development"

const item = (over: Partial<LearningItem> = {}): LearningItem => ({
  itemId: "li-1",
  memberId: "m-1",
  gapId: "gap-1",
  title: "Delegation for new managers",
  provider: "LinkedIn Learning",
  status: "in_progress",
  progress: 40,
  ...over,
})

function renderPanel(items: LearningItem[] = [item()]) {
  return render(
    <MemoryRouter>
      <LearningPlanPanel memberId="m-1" learning={items} gaps={[]} goals={[]} />
    </MemoryRouter>,
  )
}

const percentBox = () => screen.getByLabelText("Percent complete for Delegation for new managers")

beforeEach(() => jest.clearAllMocks())

it("starts from the progress the server reported", () => {
  renderPanel()
  expect(percentBox()).toHaveValue(40)
})

it("saves the percentage the manager typed, and nothing else", () => {
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "65" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(updateMutate).toHaveBeenCalledTimes(1)
  expect(updateMutate.mock.calls[0][0]).toEqual({ itemId: "li-1", input: { progress: 65 } })
})

// The form is `noValidate` precisely so these two reach the clamp: with native
// constraint validation on, an out-of-range value blocks submit entirely and the
// manager gets a browser bubble and no saved number.
it("clamps a percentage above 100 and shows what it actually saved", () => {
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "150" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(updateMutate.mock.calls[0][0]).toEqual({ itemId: "li-1", input: { progress: 100 } })
  // The box is corrected too, so the number on screen is the number sent.
  expect(percentBox()).toHaveValue(100)
})

it("clamps a negative percentage to 0", () => {
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "-20" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(updateMutate.mock.calls[0][0]).toEqual({ itemId: "li-1", input: { progress: 0 } })
})

it("rounds a fractional percentage rather than sending a decimal", () => {
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "65.7" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(updateMutate.mock.calls[0][0]).toEqual({ itemId: "li-1", input: { progress: 66 } })
})

it("reports that a save is in flight instead of looking idle", () => {
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
})

it("sends nothing at all when the box holds something that is not a number", () => {
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "abc" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(updateMutate).not.toHaveBeenCalled()
})

it("marking complete writes the status AND 100%", () => {
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Mark complete" }))
  expect(updateMutate.mock.calls[0][0]).toEqual({
    itemId: "li-1",
    input: { status: "complete", progress: 100 },
  })
})

it("a completed item offers a way back, and does not offer to complete it again", () => {
  renderPanel([item({ status: "complete", progress: 100 })])
  expect(screen.queryByRole("button", { name: "Mark complete" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Reopen" }))
  expect(updateMutate.mock.calls[0][0]).toEqual({
    itemId: "li-1",
    input: { status: "in_progress" },
  })
})

it("reports the saved number the SERVER returned, not the one that was typed", () => {
  updateMutate.mockImplementation((_v, opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess({ itemId: "li-1", progress: 65 }),
  )
  renderPanel()
  fireEvent.change(percentBox(), { target: { value: "65" } })
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(toast.success).toHaveBeenCalledWith("Saved — 65% complete.")
})

it("says a failed save failed, with the server's own sentence, and claims nothing", () => {
  updateMutate.mockImplementation((_v, opts: { onError: (e: unknown) => void }) =>
    opts.onError({ response: { data: { detail: "learning item not found" } } }),
  )
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  expect(toast.error).toHaveBeenCalledWith("learning item not found")
  expect(toast.success).not.toHaveBeenCalled()
})

it("renders a STRING for a 422 detail array, never the array itself", () => {
  updateMutate.mockImplementation((_v, opts: { onError: (e: unknown) => void }) =>
    opts.onError({
      response: { data: { detail: [{ loc: ["body", "progress"], msg: "Input should be less than 100" }] } },
    }),
  )
  renderPanel()
  fireEvent.click(screen.getByRole("button", { name: "Save progress" }))
  const arg = (toast.error as jest.Mock).mock.calls[0][0]
  expect(typeof arg).toBe("string")
  expect(arg).toMatch(/progress/)
})

it("does not invent a percentage when the server's reply carries none", () => {
  updateMutate.mockImplementation((_v, opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess({ itemId: "li-1", status: "in_progress" }),
  )
  renderPanel([item({ status: "complete", progress: 100 })])
  fireEvent.click(screen.getByRole("button", { name: "Reopen" }))
  expect(toast.success).toHaveBeenCalledWith("Saved.")
})
