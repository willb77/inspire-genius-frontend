import { render, screen } from "@testing-library/react"
import CastPicker from "../CastPicker"
import type { ProfileSummary } from "@/types/character-lab"

/**
 * The picker's scale count is how an operator decides whether there is enough
 * on file to be worth asking about. Team Studio built its rows from the roster,
 * which carries no count, and sent `0` — so "0 scales scored" printed beside
 * every colleague in a list that is FILTERED to people who have PRISM. Two of
 * them had eighty-seven scales.
 *
 * `scored` is optional so that "not counted" and "counted zero" are different
 * states, and only the second prints a number.
 */
const row = (over: Partial<ProfileSummary> = {}): ProfileSummary =>
  ({
    id: "a",
    name: "Ada Lovelace",
    source: "",
    notes: "",
    has_analysis: false,
    created_at: null,
    updated_at: null,
    ...over,
  }) as ProfileSummary

function picker(profiles: ProfileSummary[]) {
  return render(
    <CastPicker
      profiles={profiles}
      loading={false}
      selected={[]}
      onChange={() => {}}
      max={4}
      idPrefix="t"
    />,
  )
}

it("prints no count for a subject whose scales were never counted", () => {
  picker([row()])
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
  expect(screen.queryByText(/scales? scored/i)).not.toBeInTheDocument()
})

it("still prints a MEASURED zero, which is a different statement", () => {
  // Character Lab can genuinely produce a profile where every battery failed.
  // Suppressing that would trade one dishonest empty state for another.
  picker([row({ scored: 0 })])
  expect(screen.getByText(/0 scales scored/i)).toBeInTheDocument()
})

it("prints a real count, and gets the singular right", () => {
  picker([row({ scored: 1 }), row({ id: "b", name: "Bo", scored: 87 })])
  expect(screen.getByText(/^1 scale scored/i)).toBeInTheDocument()
  expect(screen.getByText(/87 scales scored/i)).toBeInTheDocument()
})

it("shows 'analysed' on its own when there is no count", () => {
  picker([row({ has_analysis: true })])
  expect(screen.getByText("analysed")).toBeInTheDocument()
  expect(screen.queryByText(/scales? scored/i)).not.toBeInTheDocument()
})
