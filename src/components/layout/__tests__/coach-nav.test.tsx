/**
 * @jest-environment jsdom
 *
 * Coach nav — the "My Students" GRANT item appears only for coach-capable roles
 * that are grant-entitled, and never for a plain user.
 */

import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }))

const mockUseVerticalAccess = jest.fn()
jest.mock("@/hooks/grant/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

import AppSidebar from "@/components/layout/AppSidebar"
import type { UserRole } from "@/types/roles"

function renderSidebar(role: UserRole) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppSidebar
          role={role}
          open
          onClose={jest.fn()}
          collapsed={false}
          onToggleCollapse={jest.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("GRANT coach nav item", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: "user", email: "a@b.com", fullName: "Test User" },
      logout: jest.fn(),
    })
    // Grant-entitled in every case — role is the gate under test.
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
      enabledVerticals: ["grant"],
    })
  })

  test.each(["practitioner", "super-admin"] as const)(
    "shows 'My Students' for %s",
    (role) => {
      renderSidebar(role)
      expect(screen.getByText("Financial Aid")).toBeInTheDocument()
      expect(screen.getByText("My Students")).toBeInTheDocument()
    }
  )

  test("hides 'My Students' for a plain user", () => {
    renderSidebar("user")
    // The GRANT section still renders (entitled) but without the coach item.
    expect(screen.getByText("Financial Aid")).toBeInTheDocument()
    expect(screen.queryByText("My Students")).not.toBeInTheDocument()
  })
})
