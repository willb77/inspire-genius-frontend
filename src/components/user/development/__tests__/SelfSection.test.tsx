/**
 * The state machine every My development section shares.
 *
 * The assertion that matters is the ORDER: a failed read must be reported as a
 * failed read even when the section would otherwise be empty. For a new member
 * "nothing yet" is the correct answer to most of these sections, so an error
 * falling through to the empty state is indistinguishable from the right
 * answer — the page looks considered and the person is told something false.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Target } from "lucide-react"
import SelfSection from "../SelfSection"

const base = {
  id: "s",
  title: "Gaps",
  icon: Target,
  lead: "What you are working on.",
  isLoading: false,
  isError: false,
  isEmpty: false,
  emptyHeadline: "Nothing on file yet.",
  emptyBody: "You or your coach can add one.",
}

it("shows a skeleton while loading, and neither the empty nor the error copy", () => {
  render(<SelfSection {...base} isLoading isEmpty />)
  expect(screen.getByTestId("s-loading")).toBeInTheDocument()
  expect(screen.queryByText("Nothing on file yet.")).not.toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

it("reports a FAILED READ even when the section is also empty", () => {
  // The whole point of the file. Both flags are set, as they are in the real
  // failure: the query errored, so there are no rows.
  render(<SelfSection {...base} isError isEmpty errorMessage="Service unavailable." />)
  const alert = screen.getByRole("alert")
  expect(alert).toHaveTextContent(/couldn't load this section/i)
  expect(alert).toHaveTextContent("Service unavailable.")
  // And it must NOT claim the person has nothing.
  expect(screen.queryByText("Nothing on file yet.")).not.toBeInTheDocument()
})

it("offers a retry on a failed read, and calls it", async () => {
  const onRetry = jest.fn()
  render(<SelfSection {...base} isError onRetry={onRetry} />)
  await userEvent.click(screen.getByRole("button", { name: /try again/i }))
  expect(onRetry).toHaveBeenCalled()
})

it("names what would fill an empty section, and who can do it", () => {
  render(<SelfSection {...base} isEmpty />)
  expect(screen.getByText("Nothing on file yet.")).toBeInTheDocument()
  // Not a shrug: an empty state that does not say what to do next tells the
  // reader nothing actionable even when it is correct.
  expect(screen.getByText("You or your coach can add one.")).toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

it("renders its content only when the read succeeded and returned rows", () => {
  render(
    <SelfSection {...base}>
      <p>one row</p>
    </SelfSection>,
  )
  expect(screen.getByText("one row")).toBeInTheDocument()
})

it("hides content behind every non-content state", () => {
  for (const flags of [{ isLoading: true }, { isError: true }, { isEmpty: true }]) {
    const { unmount } = render(
      <SelfSection {...base} {...flags}>
        <p>one row</p>
      </SelfSection>,
    )
    expect(screen.queryByText("one row")).not.toBeInTheDocument()
    unmount()
  }
})

it("keeps the `always` slot rendered in every state, so an empty section can still be filled", () => {
  // The self-declare forms live in that slot: a person whose section is empty
  // is exactly the person who needs to put the first thing in it, and a failed
  // READ does not mean the WRITE is unavailable.
  for (const flags of [{ isLoading: true }, { isError: true }, { isEmpty: true }, {}]) {
    const { unmount } = render(
      <SelfSection {...base} {...flags} always={<p>add form</p>} />,
    )
    expect(screen.getByText("add form")).toBeInTheDocument()
    unmount()
  }
})
