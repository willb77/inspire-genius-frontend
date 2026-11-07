/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { AxiosError, AxiosHeaders } from "axios"
import CohortReadout from "../CohortReadout"
import type { CohortReadout as Readout } from "@/types/cohortReadout"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="company-admin-layout">{children}</div>,
}))
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))
const mockUseOrgDirectory = jest.fn()
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrgDirectory: () => mockUseOrgDirectory(),
}))

let mockQuery: { data?: Readout; isLoading: boolean; error: unknown }
const mockMutate = jest.fn()
const mockUseReadout = jest.fn()
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadout: (...args: unknown[]) => {
    mockUseReadout(...args)
    return mockQuery
  },
  useCohortReadoutExport: () => ({ mutate: mockMutate, isPending: false }),
}))

const cell = (count: number | null, percent: number | null) => ({
  count,
  percent,
  suppressed: count === null,
  display: count === null ? "<5" : String(count),
})

const full: Readout = {
  level: "org",
  threshold: 5,
  since: null,
  suppressed: false,
  members: 12,
  metrics: {
    prismCoverage: { label: "PRISM profile on file", ...cell(7, 58.3) },
    goalsSet: { label: "Set at least one goal", ...cell(6, 50) },
    goalsProgressed: { label: "Confirmed at least one goal", ...cell(null, null) },
    practice: { label: "Completed at least one practice session", ...cell(5, 41.7), sessions: 9 },
  },
  jobFit: {
    withheld: false,
    cells: [
      { tier: "strong-fit", label: "Strong fit", ...cell(5, 41.7) },
      { tier: "potential-fit", label: "Potential fit", ...cell(null, null) },
      { tier: "none", label: "No fit yet", ...cell(null, null) },
    ],
  },
  suppressedCells: 3,
  orgId: "org-1",
  generatedAt: "2026-11-06T00:00:00+00:00",
}

function forbidden(detail: string) {
  const err = new AxiosError("forbidden")
  err.response = { status: 403, data: { detail }, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } }
  return err
}

describe("CohortReadout page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQuery = { data: full, isLoading: false, error: null }
  })

  it("renders the server's counts and shows suppressed cells as <5", () => {
    render(<CohortReadout />)
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getAllByText("<5").length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/Practice sessions in total: 9/)).toBeInTheDocument()
  })

  it("says so when the org is below the floor, without any figure", () => {
    mockQuery = {
      data: {
        level: "org",
        threshold: 5,
        since: null,
        suppressed: true,
        reason: "fewer than 5 members",
        members: null,
        orgId: "org-1",
        generatedAt: "x",
      },
      isLoading: false,
      error: null,
    }
    render(<CohortReadout />)
    expect(screen.getByRole("status")).toHaveTextContent(/fewer than 5 members/)
  })

  it("renders the server's refusal when the switch is off", () => {
    mockQuery = { isLoading: false, error: forbidden("The cohort read-out is not enabled for this organisation.") }
    render(<CohortReadout />)
    expect(screen.getByRole("alert")).toHaveTextContent("not enabled for this organisation")
  })

  it("renders a generic failure for other errors", () => {
    mockQuery = { isLoading: false, error: new Error("boom") }
    render(<CohortReadout />)
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded")
  })

  it("passes the date filter and exports both formats", () => {
    render(<CohortReadout />)
    fireEvent.change(screen.getByLabelText("Activity since"), { target: { value: "2026-08-01" } })
    expect(mockUseReadout).toHaveBeenLastCalledWith("2026-08-01", undefined)
    fireEvent.click(screen.getByRole("button", { name: /CSV/ }))
    fireEvent.click(screen.getByRole("button", { name: /Word/ }))
    expect(mockMutate.mock.calls.map((c) => c[0])).toStrictEqual([
      { format: "csv", since: "2026-08-01" },
      { format: "docx", since: "2026-08-01" },
    ])
  })

  it("company-admin path is unchanged: own layout, no picker, no org scope, no directory read", () => {
    render(<CohortReadout />)
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument()
    expect(screen.queryByTestId("super-admin-layout")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Organisation")).not.toBeInTheDocument()
    expect(screen.queryByText(/Pick an organisation/)).not.toBeInTheDocument()
    expect(screen.getByText(/Your organisation at a glance/)).toBeInTheDocument()
    // Every read is the caller's own org: no scope object, so the hook keeps
    // its original key, its original service call and no enabled guard.
    expect(mockUseReadout.mock.calls.length).toBeGreaterThan(0)
    for (const call of mockUseReadout.mock.calls) expect(call[1]).toBeUndefined()
    expect(mockUseOrgDirectory).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /CSV/ }))
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ format: "csv", since: undefined })
  })

  it("company-admin 403 without a detail says 'your organisation'", () => {
    const err = forbidden("")
    ;(err.response as { data: unknown }).data = {}
    mockQuery = { isLoading: false, error: err }
    render(<CohortReadout />)
    expect(screen.getByRole("alert")).toHaveTextContent("not enabled for your organisation")
  })

  it("super-admin with no org picked: a prompt to pick, the hook gets an empty scope, exports disabled", () => {
    mockQuery = { isLoading: false, error: null }
    mockUseOrgDirectory.mockReturnValue({ data: [{ id: "org-1", name: "Org One" }], isLoading: false, isError: false })
    render(<CohortReadout audience="super-admin" />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
    expect(screen.getByText("Pick an organisation to see its read-out.")).toBeInTheDocument()
    expect(mockUseReadout).toHaveBeenLastCalledWith(undefined, { orgId: undefined })
    expect(screen.getByRole("button", { name: /CSV/ })).toBeDisabled()
  })

  it("super-admin picker states: loading and failed directory", () => {
    mockQuery = { isLoading: false, error: null }
    mockUseOrgDirectory.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { unmount } = render(<CohortReadout audience="super-admin" />)
    expect(screen.getByLabelText("Organisation")).toBeDisabled()
    expect(screen.getByText("Loading organisations…")).toBeInTheDocument()
    unmount()
    mockUseOrgDirectory.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<CohortReadout audience="super-admin" />)
    expect(screen.getByText("Organisations could not be loaded")).toBeInTheDocument()
  })

  it("super-admin: picking an org scopes the read and the export to it", () => {
    mockUseOrgDirectory.mockReturnValue({
      data: [
        { id: "org-1", name: "Org One" },
        { id: "org-2", name: "" },
      ],
      isLoading: false,
      isError: false,
    })
    render(<CohortReadout audience="super-admin" />)
    expect(screen.getByRole("option", { name: "org-2" })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "org-1" } })
    expect(mockUseReadout).toHaveBeenLastCalledWith(undefined, { orgId: "org-1" })
    expect(screen.queryByText(/Pick an organisation to see/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Word/ }))
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ format: "docx", since: undefined, orgId: "org-1" })
  })

  it("super-admin: a refused org shows the server's message, or a 'this organisation' fallback", () => {
    mockUseOrgDirectory.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockQuery = { isLoading: false, error: forbidden("The cohort read-out is not enabled for this organisation.") }
    const { unmount } = render(<CohortReadout audience="super-admin" />)
    expect(screen.getByRole("alert")).toHaveTextContent("The cohort read-out is not enabled for this organisation.")
    unmount()
    const err = forbidden("")
    ;(err.response as { data: unknown }).data = {}
    mockQuery = { isLoading: false, error: err }
    render(<CohortReadout audience="super-admin" />)
    expect(screen.getByRole("alert")).toHaveTextContent("not enabled for this organisation")
  })

  it("saves the downloaded file", () => {
    const create = jest.fn(() => "blob:x")
    const revoke = jest.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    mockMutate.mockImplementation((_v, opts) => opts.onSuccess(new Blob(["a"])))
    render(<CohortReadout />)
    fireEvent.click(screen.getByRole("button", { name: /CSV/ }))
    expect(create).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith("blob:x")
  })

  it("shows the withheld note when one tier holds everyone", () => {
    mockQuery = { data: { ...full, jobFit: { ...full.jobFit, withheld: true } }, isLoading: false, error: null }
    render(<CohortReadout />)
    expect(screen.getByText(/Withheld/)).toBeInTheDocument()
  })
})
