/**
 * @jest-environment jsdom
 *
 * The declaration must never imply it granted anything.
 *
 * Membership is written only when a manager approves, so a user who has
 * declared is waiting — and if the UI does not say so, they are left staring at
 * empty org-scoped pages with no way to tell "not approved yet" from "broken".
 * These tests pin the wording that carries that distinction.
 */
import { render, screen } from "@testing-library/react"

import { DeclareOrganisation } from "../DeclareOrganisation"

const mockCreate = { mutate: jest.fn(), isPending: false }
let mockMine: { data: unknown; isLoading: boolean } = { data: null, isLoading: false }

jest.mock("@/hooks/org/useOrgMembership", () => ({
  useMyJoinRequest: () => mockMine,
  useCreateJoinRequest: () => mockCreate,
}))

beforeEach(() => {
  mockMine = { data: null, isLoading: false }
  mockCreate.isPending = false
  jest.clearAllMocks()
})

describe("DeclareOrganisation", () => {
  it("offers the form when nothing has been declared", () => {
    render(<DeclareOrganisation />)
    expect(screen.getByText(/which organisation are you with/i)).toBeInTheDocument()
  })

  it("says a manager must confirm, rather than implying it is done", () => {
    render(<DeclareOrganisation />)
    expect(screen.getByText(/manager will confirm/i)).toBeInTheDocument()
  })

  it("while pending, says the request is waiting — not that they joined", () => {
    mockMine = { data: { status: "pending" }, isLoading: false }
    render(<DeclareOrganisation />)
    expect(screen.getByText(/waiting for approval/i)).toBeInTheDocument()
    expect(screen.queryByText(/you're in/i)).not.toBeInTheDocument()
  })

  it("while pending, warns that team pages will be empty", () => {
    // The whole point: an empty page after declaring is expected, not a fault.
    mockMine = { data: { status: "pending" }, isLoading: false }
    render(<DeclareOrganisation />)
    expect(screen.getByText(/those pages will be empty/i)).toBeInTheDocument()
  })

  it("on approval, tells them to sign in again for it to take effect", () => {
    // org_id reaches the token only when auth-service mints a new one.
    mockMine = { data: { status: "approved" }, isLoading: false }
    render(<DeclareOrganisation />)
    expect(screen.getByText(/sign out and back in/i)).toBeInTheDocument()
  })

  it("on rejection, shows the reason and allows another attempt", () => {
    mockMine = {
      data: { status: "rejected", decision_reason: "not in this cohort" },
      isLoading: false,
    }
    render(<DeclareOrganisation />)
    expect(screen.getByText(/not in this cohort/i)).toBeInTheDocument()
    expect(screen.getByText(/which organisation are you with/i)).toBeInTheDocument()
  })

  it("does not send an empty organisation", () => {
    render(<DeclareOrganisation />)
    expect(screen.getByRole("button", { name: /send request/i })).toBeDisabled()
  })

  it("shows a loading state rather than an empty form while checking", () => {
    mockMine = { data: null, isLoading: true }
    render(<DeclareOrganisation />)
    expect(screen.getByText(/checking your organisation/i)).toBeInTheDocument()
  })
})
