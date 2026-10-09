/** @jest-environment jsdom */
/** 3.4 P4 — the simulated result: labelled, an alignment band, and "Make this a goal". */
import { fireEvent, render, screen } from "@testing-library/react"
import SimulatedResultCard from "../SimulatedResultCard"

const mutate = jest.fn()
jest.mock("@/hooks/summit/useMyGoals", () => ({
  useCreateGoal: () => ({ mutate, isPending: false, isSuccess: false }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const result = {
  session_id: "ps-1", overall_score: 3.25, overall_mean: 3.25, recommendation: "good-alignment",
  section_scores: {}, answered: 2,
  notice: "Simulated result — practice only. It is not a hiring decision.",
  answers: [
    { competency_id: "vision.strategic_vision", question_text: "Q1", score: 4 },
    { competency_id: "behavioral.conflict_resolution", question_text: "Q2", score: 2 },
  ],
}
const names = { "vision.strategic_vision": "Strategic vision", "behavioral.conflict_resolution": "Conflict resolution" }

beforeEach(() => mutate.mockReset())

it("labels everything simulated and shows the alignment band, never a hiring word", () => {
  render(<SimulatedResultCard result={result} competencyNames={names} roleTitle="Data Scientist" />)
  const card = screen.getByTestId("simulated-result")
  expect(card).toHaveTextContent("Simulated result — practice only")
  expect(screen.getByTestId("simulated-score")).toHaveTextContent("3.3")
  expect(screen.getByTestId("simulated-band")).toHaveTextContent("Good alignment")
  expect(card.textContent?.toLowerCase()).not.toMatch(/\bhire\b|do not hire|no-hire/)
})

it("makes the WEAKEST competency a draft goal that says where it came from", () => {
  render(<SimulatedResultCard result={result} competencyNames={names} roleTitle="Data Scientist" />)
  fireEvent.click(screen.getByRole("button", { name: /Conflict resolution/ }))
  expect(mutate).toHaveBeenCalledTimes(1)
  const body = mutate.mock.calls[0][0]
  expect(body.title).toBe("Get stronger at Conflict resolution")
  expect(body.motivation).toMatch(/interview practice for Data Scientist/)
  expect(body.motivation).toMatch(/scored 2 of 5 \(simulated\)/)
})

it("offers no goal when nothing was scored", () => {
  render(<SimulatedResultCard result={{ ...result, answers: [{ competency_id: "x", question_text: "Q", score: null }] }}
    competencyNames={{}} />)
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})
