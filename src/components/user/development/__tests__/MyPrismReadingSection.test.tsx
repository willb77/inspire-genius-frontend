/**
 * My PRISM reading — the three response properties that read as ordinary data
 * if they are ignored.
 *
 *  1. `isConflicted` is a REFUSAL: the message and nothing else.
 *  2. `coverage < 88` is normal, and `missing` is named rather than implied.
 *  3. A missing scale is never rendered as a zero.
 */
import { render, screen } from "@testing-library/react"
import type { FullPrismProfileResponse } from "@/types/development"

const useMyFullPrism = jest.fn()
jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyFullPrism: () => useMyFullPrism(),
}))

import MyPrismReadingSection from "../MyPrismReadingSection"

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

const profile = (over: Partial<FullPrismProfileResponse> = {}): FullPrismProfileResponse => ({
  hasData: true,
  scales: [
    { key: "innovating", label: "Innovating", group: "Behaviours", scores: { Underlying: 74 } },
  ],
  colours: { Gold: 61, Green: 44 },
  missing: [],
  coverage: 80,
  fromLegacyRows: false,
  isConflicted: false,
  conflicts: [],
  ...over,
})

it("refuses a conflicted profile: the message, and no scores of any kind", () => {
  useMyFullPrism.mockReturnValue(
    query({
      data: profile({
        isConflicted: true,
        conflictMessage: "Two assessment records disagree.",
        // The server still sends the agreeing remainder. It must not be shown:
        // the overlap that reveals a conflict is only a lower bound.
        colours: { Gold: 61 },
      }),
    }),
  )
  render(<MyPrismReadingSection />)

  expect(screen.getByRole("alert")).toHaveTextContent("Two assessment records disagree.")
  expect(screen.queryByText("Innovating")).not.toBeInTheDocument()
  expect(screen.queryByText("Gold")).not.toBeInTheDocument()
  expect(screen.queryByText(/scales on file/)).not.toBeInTheDocument()
  // And it is NOT the "no assessment" empty state — a different, wrong fact.
  expect(screen.queryByText(/No PRISM assessment on file/i)).not.toBeInTheDocument()
})

it("still refuses when the server sent no conflict sentence of its own", () => {
  useMyFullPrism.mockReturnValue(
    query({ data: profile({ isConflicted: true, conflictMessage: null }) }),
  )
  render(<MyPrismReadingSection />)
  const alert = screen.getByRole("alert")
  expect(alert).toHaveTextContent(/disagree/i)
  // Never a newest-wins, said out loud.
  expect(alert).toHaveTextContent(/will not guess/i)
  expect(screen.queryByText("Innovating")).not.toBeInTheDocument()
})

it("still refuses when a conflicted profile also reports hasData: false", () => {
  // THE case growth-service actually returns: the conflict suppresses the
  // scales, so `hasData` comes back false as well. An emptiness check written
  // as `data === null || !data.hasData` swallows the conflict into the "no
  // assessment on file" state — which tells the person a different and wrong
  // thing about themselves, and hides the fact that two people's reports are
  // filed under one account. (Caught by mutation, not by the first draft of
  // this suite: every other fixture here has hasData: true.)
  useMyFullPrism.mockReturnValue(
    query({
      data: profile({
        hasData: false,
        isConflicted: true,
        conflictMessage: "Two assessment records disagree.",
        scales: [],
        colours: null,
      }),
    }),
  )
  render(<MyPrismReadingSection />)
  expect(screen.getByRole("alert")).toHaveTextContent("Two assessment records disagree.")
  expect(screen.queryByText(/No PRISM assessment on file/i)).not.toBeInTheDocument()
})

it("renders a partial profile as a normal reading, not as a failure", () => {
  useMyFullPrism.mockReturnValue(
    query({ data: profile({ coverage: 76, missing: ["auditing", "verifying"] }) }),
  )
  render(<MyPrismReadingSection />)
  expect(screen.getByText("76 scales on file")).toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  // What is absent is NAMED, rather than left to look complete.
  expect(screen.getByText(/auditing, verifying/)).toBeInTheDocument()
  expect(screen.getByText(/not shown as a zero/)).toBeInTheDocument()
})

it("summarises a long missing list instead of printing all of it", () => {
  const missing = ["a", "b", "c", "d", "e", "f", "g", "h"]
  useMyFullPrism.mockReturnValue(query({ data: profile({ missing }) }))
  render(<MyPrismReadingSection />)
  expect(screen.getByText(/and 2 more/)).toBeInTheDocument()
})

it("says 'not scored' for a scale the server sent with no numbers", () => {
  // Rather than 0. A zero is a specific and wrong reading, not an absence.
  useMyFullPrism.mockReturnValue(
    query({
      data: profile({
        scales: [{ key: "x", label: "Auditing", group: "Behaviours", scores: {} }],
      }),
    }),
  )
  render(<MyPrismReadingSection />)
  expect(screen.getByText("not scored")).toBeInTheDocument()
  expect(screen.queryByText("0")).not.toBeInTheDocument()
})

it("labels each score type rather than presenting Adapted as the score", () => {
  useMyFullPrism.mockReturnValue(
    query({
      data: profile({
        scales: [
          {
            key: "innovating",
            label: "Innovating",
            group: "Behaviours",
            scores: { Underlying: 74, Adapted: 52 },
          },
        ],
      }),
    }),
  )
  render(<MyPrismReadingSection />)
  expect(screen.getByText("Underlying 74 · Adapted 52")).toBeInTheDocument()
})

it("says there is no assessment when the read succeeded with nothing", () => {
  useMyFullPrism.mockReturnValue(query({ data: null }))
  render(<MyPrismReadingSection />)
  expect(screen.getByText(/No PRISM assessment on file for you yet/i)).toBeInTheDocument()
  expect(screen.getByText(/nothing here is estimated/i)).toBeInTheDocument()
})

it("distinguishes a failed read from having no assessment", () => {
  useMyFullPrism.mockReturnValue(query({ isError: true, error: new Error("nope") }))
  render(<MyPrismReadingSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this section/i)
  expect(screen.queryByText(/No PRISM assessment on file/i)).not.toBeInTheDocument()
})

it("flags a legacy record so an old reading is not read as a current one", () => {
  useMyFullPrism.mockReturnValue(query({ data: profile({ fromLegacyRows: true }) }))
  render(<MyPrismReadingSection />)
  expect(screen.getByText("From an older record")).toBeInTheDocument()
})
