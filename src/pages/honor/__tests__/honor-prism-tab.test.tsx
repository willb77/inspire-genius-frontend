/**
 * @jest-environment jsdom
 *
 * Fellow Profile → PRISM Report tab (replaced the old Intake tab):
 * shows the fellow's PRISM scores when a report is on file, or a
 * "Request a PRISM Report" action when it is not.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import type { HonorPrismReport } from "@/types/honor"

const FELLOW = {
  id: "11111111-1111-1111-1111-111111111111",
  firstName: "Marcus", lastName: "Reyes", email: "marcus@honor.org",
  background: "SOF", target: "Program Management", prism: null, disc: null,
  cliftonStrengths: [], status: "assessed", cohort: "2026", docs: [],
}

jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => ({ data: [FELLOW], isLoading: false }),
  useFellow: () => ({ data: FELLOW, isLoading: false }),
  useCoaches: () => ({ data: [] }),
  useTeams: () => ({ data: [] }),
  useCoachActivity: () => ({ data: [] }),
  useCoachSchedule: () => ({ data: [] }),
}))

let prismResult: { data?: HonorPrismReport; isLoading: boolean } = { isLoading: false }
const requestMutate = jest.fn()
jest.mock("@/hooks/honor/useHonorEvaluate", () => ({
  useFellowPrism: () => prismResult,
  useRequestFellowPrism: () => ({ mutate: requestMutate, isPending: false }),
}))

import HonorMemberProfile from "../HonorMemberProfile"

function renderProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/vertical/honor/member/${FELLOW.id}`]}>
        <Routes>
          <Route path="*" element={<HonorMemberProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  requestMutate.mockClear()
  prismResult = { isLoading: false }
})

test("shows the PRISM scores from the CSV when a report is on file", () => {
  prismResult = {
    isLoading: false,
    data: {
      fellowId: FELLOW.id, managed: false, hasReport: true, scoreCount: 2,
      assessedAt: "2026-07-20T00:00:00Z",
      scores: [
        { category: "Behavior Preferences", dimension: "Coordinating", score: 90 },
        { category: "Behavior Preferences", dimension: "Innovating", score: 25 },
      ],
    },
  }
  renderProfile()
  fireEvent.click(screen.getByRole("button", { name: "PRISM Report" }))
  expect(screen.getByText("Behavior Preferences")).toBeInTheDocument()
  expect(screen.getByText("Coordinating")).toBeInTheDocument()
  expect(screen.getByText("90")).toBeInTheDocument()
  expect(screen.getByText("25")).toBeInTheDocument()
  // no request button when a report exists
  expect(screen.queryByRole("button", { name: /Request a PRISM Report/i })).not.toBeInTheDocument()
})

test("shows Request a PRISM Report when none is on file, and requests it", () => {
  prismResult = {
    isLoading: false,
    data: { fellowId: FELLOW.id, managed: false, hasReport: false, scores: [] },
  }
  renderProfile()
  fireEvent.click(screen.getByRole("button", { name: "PRISM Report" }))
  const btn = screen.getByRole("button", { name: /Request a PRISM Report/i })
  expect(btn).toBeInTheDocument()
  fireEvent.click(btn)
  expect(requestMutate).toHaveBeenCalledWith(FELLOW.id)
})
