/** @jest-environment jsdom */
/**
 * TDS-U11b on the Studio page. Only the practitioner mount shows unconnected
 * clients and the client-record link; the manager mount, given the very same
 * roster, is unchanged. The section only appears on the people grid.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import type { RosterMember } from "@/types/development"

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

const sectionProps: Array<{ search?: string }> = []
jest.mock("@/components/manager/development/UnconnectedClientsSection", () => ({
  UnconnectedClientsSection: (p: { search?: string }) => {
    sectionProps.push(p)
    return <div data-testid="unconnected-section-stub">{p.search ?? ""}</div>
  },
}))

let rosterState: { data?: RosterMember[]; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
}
jest.mock("@/hooks/manager/development", () => {
  const { DEV_TEXT } = jest.requireActual("@/constants/development")
  return {
    useTeamDevelopmentRoster: () => ({ ...rosterState, refetch: jest.fn() }),
    useDevelopmentText: () => ({ t: (key: string) => DEV_TEXT[key] ?? key }),
  }
})
jest.mock("@/hooks/useFrontendText", () => ({ useFrontendText: () => ({ data: undefined }) }))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ hasRole: () => false }) }))
jest.mock("@/components/manager/development/OrgChartPanel", () => ({
  OrgChartPanel: () => <div data-testid="org-chart-panel">org chart</div>,
}))
jest.mock("@/components/manager/development/MyReportsPanel", () => ({
  MyReportsPanel: () => <div data-testid="my-reports-panel">my reports</div>,
}))
jest.mock("@/components/manager/development/AddMemberDialog", () => ({
  AddMemberDialog: () => <button type="button">Add people</button>,
}))
jest.mock("@/components/manager/development/LinkRequestsNotice", () => ({
  LinkRequestsNotice: () => null,
}))

import DevelopmentStudio from "../DevelopmentStudio"

const cov = { prism: false, clifton: false, disc: false }
const linkedClient = {
  memberId: "acct-1",
  name: "Lee Client",
  coverage: cov,
  planStatus: null,
  clientId: "cl-1",
  connected: true,
} as RosterMember

function renderStudio(audience: "manager" | "practitioner") {
  return render(
    <MemoryRouter>
      <DevelopmentStudio audience={audience} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sectionProps.length = 0
  rosterState = { data: [linkedClient], isLoading: false, isError: false }
})

it("the practitioner mount shows the unconnected-clients section and the client-record link", () => {
  renderStudio("practitioner")
  expect(screen.getByTestId("unconnected-section-stub")).toBeInTheDocument()
  expect(screen.getByTestId("member-card-client-record")).toHaveAttribute("href", "/practitioner/clients/cl-1")
})

it("the manager mount, given the same roster, shows neither", () => {
  renderStudio("manager")
  expect(screen.queryByTestId("unconnected-section-stub")).toBeNull()
  expect(screen.queryByTestId("member-card-client-record")).toBeNull()
  expect(screen.getByText("Lee Client")).toBeInTheDocument()
})

it("the section follows the search box", () => {
  renderStudio("practitioner")
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "ada" } })
  expect(sectionProps.at(-1)).toEqual({ search: "ada" })
})

it("the section shows with an empty member list too: clients with no account are not 'nobody'", () => {
  rosterState = { data: [], isLoading: false, isError: false }
  renderStudio("practitioner")
  expect(screen.getByTestId("unconnected-section-stub")).toBeInTheDocument()
})

it("the section is not on the other lenses", () => {
  renderStudio("practitioner")
  fireEvent.click(screen.getByRole("button", { name: /Org Chart/ }))
  expect(screen.queryByTestId("unconnected-section-stub")).toBeNull()
})

it("not while loading", () => {
  rosterState = { data: undefined, isLoading: true, isError: false }
  renderStudio("practitioner")
  expect(screen.queryByTestId("unconnected-section-stub")).toBeNull()
})

it("not after a failed read: a failure is never shown beside a partial list", () => {
  rosterState = { data: undefined, isLoading: false, isError: true }
  renderStudio("practitioner")
  expect(screen.queryByTestId("unconnected-section-stub")).toBeNull()
})
