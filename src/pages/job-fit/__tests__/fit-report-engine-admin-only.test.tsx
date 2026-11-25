/**
 * @jest-environment jsdom
 *
 * Walk finding F-W3-3 — a reopened fit report showed the scoring engine's id
 * ("ig-blueprint-scoring 0.1.0; scheme=mean-gap-v2; …") to the person. It is
 * an internal record: super-admins see it, everyone else sees only the date.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthContext } from "@/context/auth-context"
import type { FitSnapshot } from "@/types/job-fit"

const mockSnapshot = jest.fn()
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useFitSnapshot: (id: string) => mockSnapshot(id),
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({ useFitSharedDisplayEnabled: () => false }))

import FitHistoryPage from "../FitHistoryPage"

const ENGINE = "ig-blueprint-scoring 0.1.0; scheme=mean-gap-v2; critical_gap_limit=45; unmeasured=excluded"
const SNAP = {
  id: "s1", source: "matches", jobId: null, roleTitle: "", fitScore: null, tier: null,
  engineVersion: ENGINE, computedAt: "2026-11-25T20:27:45Z", payload: [],
} as unknown as FitSnapshot

function renderAs(role: string | null) {
  mockSnapshot.mockReturnValue({ data: SNAP, isLoading: false, isError: false, error: null })
  const page = (
    <MemoryRouter initialEntries={["/vertical/job-fit/history/s1"]}>
      <Routes>
        <Route path="/vertical/job-fit/history/:snapshotId" element={<FitHistoryPage />} />
      </Routes>
    </MemoryRouter>
  )
  if (role === null) return render(page)
  const auth = { hasRole: (r: string) => r === role, user: { id: "me", role } }
  return render(
    <AuthContext.Provider value={auth as unknown as React.ContextType<typeof AuthContext>}>{page}</AuthContext.Provider>
  )
}

describe("fit report header", () => {
  test.each(["user", "manager", "company-admin", "practitioner", "distributor"])(
    "%s sees the date, never the engine id",
    (role) => {
      const { container } = renderAs(role)
      expect(screen.getByText(/^Recorded /)).toBeInTheDocument()
      expect(container.textContent).not.toContain("ig-blueprint-scoring")
      expect(container.textContent).not.toContain("scheme=")
    }
  )

  test("no auth context (bare render) hides it too", () => {
    const { container } = renderAs(null)
    expect(screen.getByText(/^Recorded /)).toBeInTheDocument()
    expect(container.textContent).not.toContain("ig-blueprint-scoring")
  })

  test("a super-admin still sees the engine id", () => {
    const { container } = renderAs("super-admin")
    expect(container.textContent).toContain(ENGINE)
  })
})
