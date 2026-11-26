/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

/**
 * U5 — the Team view (Compare and Scenarios) is a fourth lens on the Studio
 * page, offered only where `VITE_FEATURE_TDS_STUDIO` is on. With the flag off
 * the page is exactly what it was: three lenses, no Team view.
 *
 * The view itself is a probe here; its behaviour is covered by
 * `tabs/__tests__/TeamView.u5.test.tsx` and the two hook suites.
 *
 * Invented people — this repo is public.
 */

let mockFlag = false
// RM-6 B: the practitioner client-roster status reads OFF here, so the
// practitioner Studio is today's (the switch-on Studio is DevelopmentStudio.rm6).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}))
jest.mock("@/constants/development", () => {
  const actual = jest.requireActual("@/constants/development")
  return {
    ...actual,
    get TDS_STUDIO_ENABLED() {
      return mockFlag
    },
  }
})

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const roster: RosterMember[] = [
  {
    memberId: "m-1",
    name: "Dana Whitfield",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "on_track",
  },
]

// TDS-U11b: the practitioner mount also reads unconnected clients from the
// roster query; that section has its own suite (UnconnectedClientsSection).
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: () => null,
}))

jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ data: roster, isLoading: false, isError: false, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
    useAddTeamMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useBulkAddTeamMembers: () => ({ mutateAsync: jest.fn(), isPending: false }),
  }
})
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => role === "manager" }),
}))
jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel" />,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel" />,
}))
jest.mock("@/components/manager/development/LinkRequestsPanel", () => ({
  LinkRequestsPanel: () => null,
}))
jest.mock("@/components/manager/development/TeamStudioView", () => ({
  __esModule: true,
  default: () => <div data-testid="team-studio-view" />,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/components/ui/select", () => ({
  __esModule: true,
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

import DevelopmentStudio from "../DevelopmentStudio"

function renderStudio(audience: "manager" | "practitioner" = "manager") {
  return render(
    <MemoryRouter>
      <DevelopmentStudio audience={audience} />
    </MemoryRouter>,
  )
}

const LENS = /Compare & scenarios/

describe("DevelopmentStudio — Team view (U5)", () => {
  it("flag off: no Team lens, and the page is the roster as before", () => {
    mockFlag = false
    renderStudio()
    expect(screen.queryByRole("button", { name: LENS })).not.toBeInTheDocument()
    expect(screen.queryByTestId("team-studio-view")).not.toBeInTheDocument()
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
  })

  it("flag on: the lens opens the Team view in place of the roster", async () => {
    mockFlag = true
    renderStudio()
    const lens = screen.getByRole("button", { name: LENS })
    expect(lens).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(lens)
    expect(await screen.findByTestId("team-studio-view")).toBeInTheDocument()
    expect(lens).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByText("Dana Whitfield")).not.toBeInTheDocument()
  })

  it("flag on: a practitioner gets the same lens", async () => {
    mockFlag = true
    renderStudio("practitioner")
    fireEvent.click(screen.getByRole("button", { name: LENS }))
    expect(await screen.findByTestId("team-studio-view")).toBeInTheDocument()
  })

  it("flag on: the roster is still the default view", () => {
    mockFlag = true
    renderStudio()
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument()
    expect(screen.queryByTestId("team-studio-view")).not.toBeInTheDocument()
  })
})
