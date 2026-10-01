/**
 * Learning, self-scoped — the person records their own progress.
 *
 * ## About the Select mock
 *
 * `@/components/ui/select` is replaced with a NATIVE select that forwards
 * `onValueChange`. That is not "mocking the component whose call site you mean
 * to exercise": the call site under test is this component's own
 * `onStatus`/`mutate` handler, and it still runs. What is replaced is Radix's
 * pointer machinery, which jsdom cannot drive. If the handler stopped pairing
 * status with progress, the assertions below would fail.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import type { LearningItem } from "@/types/development"

const useMyLearningItems = jest.fn()
const createMutate = jest.fn()
const updateMutate = jest.fn()
const createItem = { mutate: createMutate, isPending: false, error: null as unknown }
const updateItem = {
  mutate: updateMutate,
  isPending: false,
  error: null as unknown,
  variables: undefined as { itemId: string } | undefined,
}

jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyLearningItems: () => useMyLearningItems(),
  useCreateMyLearningItem: () => createItem,
  useUpdateMyLearningItem: () => updateItem,
}))

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: ReactNode
  }) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

import MyLearningSection from "../MyLearningSection"

const item = (over: Partial<LearningItem> = {}): LearningItem => ({
  itemId: "l1",
  memberId: "m1",
  title: "Negotiation fundamentals",
  provider: "Internal L&D",
  status: "in_progress",
  progress: 40,
  ...over,
})

function query(over: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  createItem.isPending = false
  createItem.error = null
  updateItem.isPending = false
  updateItem.error = null
  updateItem.variables = undefined
  useMyLearningItems.mockReturnValue(query({ data: [] }))
})

it("names what would fill an empty learning plan, and who can", () => {
  render(<MyLearningSection />)
  expect(screen.getByText("Nothing in your learning plan yet.")).toBeInTheDocument()
  expect(screen.getByText(/your coach can add one against a gap/i)).toBeInTheDocument()
})

it("distinguishes a failed read from an empty plan", () => {
  useMyLearningItems.mockReturnValue(query({ isError: true, error: new Error("boom") }))
  render(<MyLearningSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this section/i)
  expect(screen.queryByText("Nothing in your learning plan yet.")).not.toBeInTheDocument()
})

it("shows the stored progress number, not a derived one", () => {
  useMyLearningItems.mockReturnValue(query({ data: [item({ progress: 40 })] }))
  render(<MyLearningSection />)
  expect(screen.getByLabelText("40% complete")).toBeInTheDocument()
})

it("says so when no provider was recorded, rather than leaving a blank", () => {
  useMyLearningItems.mockReturnValue(query({ data: [item({ provider: "" })] }))
  render(<MyLearningSection />)
  expect(screen.getByText(/No provider recorded/)).toBeInTheDocument()
})

it("writes status AND 100% together when marked complete", async () => {
  // A row reading "Complete, 40%" is not a state anyone can act on, so the two
  // are never allowed to disagree.
  useMyLearningItems.mockReturnValue(query({ data: [item()] }))
  render(<MyLearningSection />)
  await userEvent.selectOptions(screen.getByTestId("status-select"), "complete")
  expect(updateMutate).toHaveBeenCalledWith({
    itemId: "l1",
    input: { status: "complete", progress: 100 },
  })
})

it("writes status AND 0% together when moved back to not started", async () => {
  useMyLearningItems.mockReturnValue(query({ data: [item()] }))
  render(<MyLearningSection />)
  await userEvent.selectOptions(screen.getByTestId("status-select"), "not_started")
  expect(updateMutate).toHaveBeenCalledWith({
    itemId: "l1",
    input: { status: "not_started", progress: 0 },
  })
})

it("leaves the percentage alone when moved to in progress", async () => {
  // Omitting the key is what leaves the stored number alone: the server writes
  // only the fields it receives, so sending 0 here would silently reset it.
  useMyLearningItems.mockReturnValue(query({ data: [item({ status: "complete" })] }))
  render(<MyLearningSection />)
  await userEvent.selectOptions(screen.getByTestId("status-select"), "in_progress")
  expect(updateMutate).toHaveBeenCalledWith({
    itemId: "l1",
    input: { status: "in_progress" },
  })
})

it("adds an item, omitting an empty provider rather than sending a blank one", async () => {
  render(<MyLearningSection />)
  await userEvent.type(screen.getByLabelText("What is it?"), "Negotiation fundamentals")
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() =>
    expect(createMutate).toHaveBeenCalledWith(
      { title: "Negotiation fundamentals" },
      expect.anything(),
    ),
  )
})

it("sends the provider when one was typed", async () => {
  render(<MyLearningSection />)
  await userEvent.type(screen.getByLabelText("What is it?"), "Negotiation")
  await userEvent.type(screen.getByLabelText(/Where is it from/), "Internal L&D")
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() =>
    expect(createMutate).toHaveBeenCalledWith(
      { title: "Negotiation", provider: "Internal L&D" },
      expect.anything(),
    ),
  )
})

it("refuses an empty title client-side", async () => {
  render(<MyLearningSection />)
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  expect(createMutate).not.toHaveBeenCalled()
})

it("says the number on screen is the old one when a progress save failed", () => {
  updateItem.error = new Error("nope")
  useMyLearningItems.mockReturnValue(query({ data: [item()] }))
  render(<MyLearningSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/still the old one/i)
})
