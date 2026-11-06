/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { AxiosError, AxiosHeaders } from "axios"
import CohortReadout from "../CohortReadout"
import type { CohortReadout as Readout } from "@/types/cohortReadout"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

let mockQuery: { data?: Readout; isLoading: boolean; error: unknown }
const mockMutate = jest.fn()
const mockUseReadout = jest.fn()
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadout: (since?: string) => {
    mockUseReadout(since)
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
    expect(mockUseReadout).toHaveBeenLastCalledWith("2026-08-01")
    fireEvent.click(screen.getByRole("button", { name: /CSV/ }))
    fireEvent.click(screen.getByRole("button", { name: /Word/ }))
    expect(mockMutate.mock.calls.map((c) => c[0])).toEqual([
      { format: "csv", since: "2026-08-01" },
      { format: "docx", since: "2026-08-01" },
    ])
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
