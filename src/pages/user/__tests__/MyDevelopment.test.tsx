/**
 * `/my/development` — the page a member reads about their own development.
 *
 * The sections are rendered for REAL here (only the hooks are mocked), because
 * the two assertions that matter are about composition: which sections exist,
 * and — the load-bearing one — that Targets, Roadmaps and Practice do NOT.
 * Stubbing the five children would make the absence assertion vacuous, which is
 * the shape of guard that reads as coverage and tests nothing.
 */
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"

const mockUser: { role?: string } = { role: "user" }
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { ...mockUser } }),
}))

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}))
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ role, children }: { role: string; children: ReactNode }) => (
    <div data-testid="unified-layout" data-role={role}>
      {children}
    </div>
  ),
}))

const emptyQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
}
const idleMutation = { mutate: jest.fn(), isPending: false, error: null, variables: undefined }

jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyGaps: () => ({ ...emptyQuery, data: [] }),
  useCreateMyGap: () => idleMutation,
  useCloseMyGap: () => idleMutation,
  useMyLearningItems: () => ({ ...emptyQuery, data: [] }),
  useCreateMyLearningItem: () => idleMutation,
  useUpdateMyLearningItem: () => idleMutation,
  useMyMilestones: () => ({ ...emptyQuery, data: [] }),
  useMyFullPrism: () => ({ ...emptyQuery, data: null }),
}))
jest.mock("@/hooks/summit/useMyGoals", () => ({
  useMyGoalReviews: () => ({ ...emptyQuery, data: { memberId: "m1", reviews: [] } }),
}))

import MyDevelopment from "@/pages/user/MyDevelopment"

beforeEach(() => {
  mockUser.role = "user"
})

it("is called My development and is addressed to the person", () => {
  render(<MyDevelopment />)
  expect(screen.getByRole("heading", { name: "My development", level: 1 })).toBeInTheDocument()
  expect(screen.getByText(/What your coach sees about you, as you/i)).toBeInTheDocument()
})

it("renders the five sections that have a live backend", () => {
  render(<MyDevelopment />)
  for (const title of ["Gaps", "Learning", "Milestones", "Coach reviews", "My PRISM reading"]) {
    expect(screen.getByText(title)).toBeInTheDocument()
  }
})

it("renders NO Targets, Roadmaps or Practice section", () => {
  // `git grep` over origin/development finds no `goal_targets`, `goal_roadmap`
  // or `practice_session` anywhere in `services/`: Feeds Phase 3 is an open
  // and held CSA (#1518) and Phase 4 has not started. A section saying "no
  // targets yet" is the same sentence a working, empty Targets section would
  // show — so it would teach the person the feature is theirs and unused,
  // undetectably. This assertion is what stops one being added ahead of its
  // service.
  render(<MyDevelopment />)
  const text = document.body.textContent ?? ""
  // A populated control first: without it this assertion would also pass
  // against a page that rendered nothing at all.
  expect(text).toContain("Milestones")
  for (const word of ["Targets", "Roadmaps", "Practice"]) {
    expect(text).not.toContain(word)
  }
})

it("gives a user and a super-admin the platform user chrome", () => {
  for (const role of ["user", "super-admin"]) {
    mockUser.role = role
    const { unmount } = render(<MyDevelopment />)
    expect(screen.getByTestId("user-layout")).toBeInTheDocument()
    expect(screen.queryByTestId("unified-layout")).not.toBeInTheDocument()
    unmount()
  }
})

it("keeps a manager in the manager chrome", () => {
  mockUser.role = "manager"
  render(<MyDevelopment />)
  expect(screen.getByTestId("unified-layout")).toHaveAttribute("data-role", "manager")
})

it("renders for a signed-in account with no role rather than blanking", () => {
  mockUser.role = undefined
  render(<MyDevelopment />)
  expect(screen.getByTestId("user-layout")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "My development", level: 1 })).toBeInTheDocument()
})

it("needs no manager: every section renders its own state with no member id in sight", () => {
  // The page takes no member id and no route param. If any section required
  // one, its empty state would not be reachable for a plain `user`.
  render(<MyDevelopment />)
  expect(screen.getByText("No gaps on file yet.")).toBeInTheDocument()
  expect(screen.getByText("Nothing in your learning plan yet.")).toBeInTheDocument()
  expect(screen.getByText("No milestones on your roadmap yet.")).toBeInTheDocument()
  expect(screen.getByText("No coach has reviewed your goals yet.")).toBeInTheDocument()
  expect(screen.getByText(/No PRISM assessment on file for you yet/i)).toBeInTheDocument()
})
