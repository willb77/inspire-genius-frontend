/**
 * Direction Setting merge, reading B1 — a "My journey" door in Goals Studio.
 *
 * The link must appear ONLY for a person who holds the `direction-setting`
 * entitlement, and must fail closed otherwise: Goals Studio is open to every
 * role, the journey is not. Every "absent" assertion has a control (the
 * entitled case) in the same file, so "absent" cannot pass on a render that
 * could never have shown the link.
 *
 * The link is a visibility control only. These tests do not claim anything
 * about who may ENTER the vertical — that is `VerticalShell`'s job, unchanged.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ROUTES } from "@/constants/routes"

const mockGetGoalSession = jest.fn()
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person", email: "test@example.com", role: "user" } }),
}))
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

type Access = { hasAccess: boolean; isLoading: boolean; enabledVerticals: string[] }
const mockAccess = jest.fn<Access, [string]>()
jest.mock("@/verticals/core", () => {
  const actual = jest.requireActual("@/verticals/core")
  return { ...actual, useVerticalAccess: (key: string) => mockAccess(key) }
})

import GoalsStudioLayout from "@/pages/summit/GoalsStudioLayout"

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/my/goals"]}>
        <Routes>
          <Route path="/my/goals" element={<GoalsStudioLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const entitled: Access = { hasAccess: true, isLoading: false, enabledVerticals: ["direction-setting"] }

beforeEach(() => {
  localStorage.clear()
  mockGetGoalSession.mockResolvedValue({ categories: {}, goals: [] })
  mockAccess.mockReset()
})

describe("Goals Studio — My journey link", () => {
  it("CONTROL: shows the link to the journey for an entitled person", () => {
    mockAccess.mockReturnValue(entitled)
    renderLayout()
    const link = screen.getByTestId("goals-journey-link")
    expect(link).toHaveTextContent("My journey")
    expect(link).toHaveAttribute("href", ROUTES.DIRECTION_SETTING.JOURNEY)
    expect(ROUTES.DIRECTION_SETTING.JOURNEY).toBe("/vertical/direction-setting/journey")
  })

  it("asks about the direction-setting vertical and no other", () => {
    mockAccess.mockReturnValue(entitled)
    renderLayout()
    expect(mockAccess).toHaveBeenCalledWith("direction-setting")
    expect(mockAccess.mock.calls.every(([k]) => k === "direction-setting")).toBe(true)
  })

  it("renders nothing for a person who is not entitled", () => {
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false, enabledVerticals: [] })
    renderLayout()
    expect(screen.queryByTestId("goals-journey-link")).not.toBeInTheDocument()
    expect(screen.queryByText("My journey")).not.toBeInTheDocument()
    // The studio itself is untouched.
    expect(screen.getByRole("heading", { name: "Goals Studio" })).toBeInTheDocument()
  })

  it("renders nothing while the entitlement read is loading, even if access is already true", () => {
    mockAccess.mockReturnValue({ hasAccess: true, isLoading: true, enabledVerticals: [] })
    renderLayout()
    expect(screen.queryByTestId("goals-journey-link")).not.toBeInTheDocument()
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: true, enabledVerticals: [] })
    renderLayout()
    expect(screen.queryByTestId("goals-journey-link")).not.toBeInTheDocument()
  })

  it.each([["off", "false"], ["on", "true"]])("shows it with house style %s", (_l, value) => {
    localStorage.setItem("house_style_goals", value)
    mockAccess.mockReturnValue(entitled)
    renderLayout()
    expect(screen.getByTestId("goals-journey-link")).toBeInTheDocument()
  })

  it("is a door, not a section: the pill row is unchanged", () => {
    localStorage.setItem("house_style_goals", "true")
    mockAccess.mockReturnValue(entitled)
    renderLayout()
    const nav = screen.getByRole("navigation", { name: "Goals Studio sections" })
    expect(within(nav).getAllByRole("link").map((a) => a.textContent?.trim())).toEqual([
      "My goals", "Talk it through", "Overview", "Discovery", "Who can see them",
    ])
    expect(within(nav).queryByText("My journey")).not.toBeInTheDocument()
  })
})
