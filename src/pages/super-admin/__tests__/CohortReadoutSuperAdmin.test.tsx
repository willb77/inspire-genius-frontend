/**
 * @jest-environment jsdom
 *
 * N-3 follow-up: the super-admin route renders the cohort read-out with an
 * organisation picker. Real React Query, real hooks; only the services are
 * mocked, so "no call before a pick" is asserted at the request boundary.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, AxiosHeaders } from "axios"
import CohortReadout from "@/pages/company-admin/CohortReadout"
import * as readoutSvc from "@/services/company-admin/cohortReadout.service"
import * as orgSvc from "@/services/super-admin/organization-management/organization-management.service"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/services/company-admin/cohortReadout.service", () => ({
  getCohortReadoutEnabled: jest.fn(),
  getCohortReadout: jest.fn(),
  exportCohortReadout: jest.fn(),
}))
jest.mock("@/services/super-admin/organization-management/organization-management.service", () => ({
  listOrgs: jest.fn(),
}))

const getReadout = readoutSvc.getCohortReadout as jest.Mock
const listOrgs = orgSvc.listOrgs as jest.Mock

function renderPage(audience?: "super-admin") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CohortReadout audience={audience} />
    </QueryClientProvider>,
  )
}

describe("Cohort read-out — super-admin org picker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listOrgs.mockResolvedValue([
      { id: "org-a", name: "Alpha", contact: "", active: true },
      { id: "org-b", name: "Beta", contact: "", active: true },
    ])
  })

  it("with no org picked: prompts, and makes no read-out call", async () => {
    renderPage("super-admin")
    expect(screen.getByText("Pick an organisation to see its read-out.")).toBeInTheDocument()
    await screen.findByRole("option", { name: "Alpha" })
    await new Promise((r) => setTimeout(r, 20))
    expect(getReadout).not.toHaveBeenCalled()
  })

  it("picking an org sends org_id to the read-out", async () => {
    getReadout.mockResolvedValue({ level: "org", threshold: 5, since: null, suppressed: true, members: null })
    renderPage("super-admin")
    await screen.findByRole("option", { name: "Beta" })
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "org-b" } })
    await waitFor(() => expect(getReadout).toHaveBeenCalledWith(undefined, "org-b"))
    expect(await screen.findByRole("status")).toHaveTextContent(/This organisation has fewer than 5 members/)
  })

  it("shows the server's switch-off 403 for an org not on the allowlist", async () => {
    const err = new AxiosError("forbidden")
    err.response = {
      status: 403,
      data: { detail: "The cohort read-out is not enabled for this organisation." },
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
    getReadout.mockRejectedValue(err)
    renderPage("super-admin")
    await screen.findByRole("option", { name: "Alpha" })
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "org-a" } })
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The cohort read-out is not enabled for this organisation.",
    )
  })

  it("company-admin: reads the own org at once, never the directory", async () => {
    getReadout.mockResolvedValue({ level: "org", threshold: 5, since: null, suppressed: true, members: null })
    renderPage()
    await waitFor(() => expect(getReadout).toHaveBeenCalled())
    expect(getReadout.mock.calls[0]).toEqual([undefined])
    expect(listOrgs).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("Organisation")).not.toBeInTheDocument()
  })
})
