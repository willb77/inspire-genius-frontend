/**
 * @jest-environment jsdom
 *
 * O-CBW-a (2026-11-27, R2). After "Make this my target" succeeds, the targets
 * refetch puts the same goal in the "already targets this role" list while the
 * status line still says it "now targets" the role. The card names that goal
 * once — in the role="status" line — and keeps listing any OTHER goal that
 * already aimed here.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitDetail } from "@/types/job-fit"

type Target = { goalId: string; jobId: string }
let mockTargets: Target[] = []
let mockDone: { goal: { goalId: string; title: string }; target: { roleTitle: string } } | undefined
jest.mock("@/hooks/goals/useGoalTargets", () => ({
  useMyTargets: () => ({ data: mockTargets, isLoading: false }),
  useMakeTarget: () => ({ data: mockDone, mutate: jest.fn(), isPending: false, isError: false, error: null }),
}))
jest.mock("@/hooks/summit/useMyGoals", () => ({
  useMyGoals: () => ({
    data: {
      goals: [
        { goalId: "g1", title: "Invented goal one" },
        { goalId: "g2", title: "Invented goal two" },
      ],
    },
    isError: false,
  }),
}))

import { MakeTargetCard } from "../MakeTargetCard"

const DATA = { jobId: "job-1" } as unknown as FitDetail
const renderCard = () =>
  render(
    <MemoryRouter>
      <MakeTargetCard data={DATA} />
    </MemoryRouter>,
  )

beforeEach(() => {
  mockTargets = []
  mockDone = undefined
})

it("after a make, the goal just aimed is named once, in the status line", () => {
  mockTargets = [{ goalId: "g1", jobId: "job-1" }]
  mockDone = { goal: { goalId: "g1", title: "Invented goal one" }, target: { roleTitle: "Invented role" } }
  renderCard()
  expect(screen.getByRole("status").textContent).toContain("Invented goal one")
  expect(screen.getByRole("status").textContent).toContain("now targets Invented role")
  expect(screen.queryByRole("list", { name: "Goals already aimed at this role" })).toBeNull()
  expect(screen.queryByText(/already targets this role/)).toBeNull()
})

it("a different goal that already aimed here is still listed beside the status line", () => {
  mockTargets = [
    { goalId: "g1", jobId: "job-1" },
    { goalId: "g2", jobId: "job-1" },
  ]
  mockDone = { goal: { goalId: "g1", title: "Invented goal one" }, target: { roleTitle: "Invented role" } }
  renderCard()
  const items = screen.getAllByText(/already targets this role/)
  expect(items).toHaveLength(1)
  expect(items[0].textContent).toContain("Invented goal two")
})

it("before any make, an existing target is listed as today", () => {
  mockTargets = [{ goalId: "g1", jobId: "job-1" }]
  renderCard()
  expect(screen.getByText(/already targets this role/).textContent).toContain("Invented goal one")
  expect(screen.queryByRole("status")).toBeNull()
})
