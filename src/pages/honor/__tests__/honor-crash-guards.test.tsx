/**
 * @jest-environment jsdom
 *
 * Regression: the coach surfaces must not throw when the LIVE backend fellow
 * view omits mock-only fields (`docs`, and a `prism` without `quads`). Before the
 * guards, HonorMemberProfile crashed on `fellow.docs.length` → the app's
 * "Something went wrong" boundary. These render the real components against a
 * live-shaped fellow and assert no throw.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), info: jest.fn(), warning: jest.fn(), error: jest.fn() } }))

// A fellow exactly as the live `_roster_view` returns it: NO `docs`, prism null.
const LIVE_FELLOW = {
  id: "11111111-1111-1111-1111-111111111111",
  firstName: "Marcus",
  lastName: "Reyes",
  email: "marcus@honor.org",
  background: "Naval Special Warfare",
  target: "Program Management",
  cohort: "Cohort 2026-A",
  prism: null,
  disc: null,
  cliftonStrengths: [],
  status: "intake-pending",
  // NOTE: no `docs`, no fullName — mimics the live payload
}

jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => ({ data: [LIVE_FELLOW], isLoading: false }),
  useFellow: () => ({ data: LIVE_FELLOW, isLoading: false }),
  useCoaches: () => ({ data: [{ id: "c1", name: "S. Carter", email: "s@honor.org", title: "Mentor", teams: ["Cohort 2026-A"] }] }),
  useTeams: () => ({ data: [{ id: "t1", name: "Cohort 2026-A", memberCount: 3 }] }),
  useCoachActivity: () => ({ data: [] }),
  useCoachSchedule: () => ({ data: [] }),
}))

import HonorMemberProfile from "../HonorMemberProfile"
import HonorCaseload from "../HonorCaseload"
import HonorAdministration from "../HonorAdministration"

function renderPage(ui: React.ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("Honor coach surfaces — live-shaped data (no crash)", () => {
  test("Fellow Profile renders with a live fellow that has no `docs` (was the crash)", () => {
    expect(() => renderPage(<HonorMemberProfile />, "/vertical/honor/member/11111111-1111-1111-1111-111111111111")).not.toThrow()
    expect(screen.getByText("Marcus Reyes")).toBeInTheDocument()
    // The Overview now renders the 10-artifact "Fellow data" card (replaced the
    // old docs list). It must render without throwing on the live-shaped fellow.
    expect(screen.getByText("Fellow data")).toBeInTheDocument()
  })

  test("Caseload renders a live fellow (no prism/docs) without throwing", () => {
    expect(() => renderPage(<HonorCaseload />)).not.toThrow()
    expect(screen.getByText("Marcus Reyes")).toBeInTheDocument()
  })

  test("Administration renders without throwing", () => {
    expect(() => renderPage(<HonorAdministration />)).not.toThrow()
    expect(screen.getByText("Administration")).toBeInTheDocument()
  })
})
