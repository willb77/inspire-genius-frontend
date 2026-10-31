/**
 * MMLR-6: the company-admin's "Requests to join a team" section (D7: see and
 * cancel). Same visibility rule as the manager's panel; no categories, ever;
 * "a manager's team" until growth sends the manager's name; each cancel
 * refusal said for what it is; a fault never blanks the users table.
 */
import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthContext } from "@/context/auth-context"
import type { IncomingLinkRequest } from "@/services/manager/development/growthService"

const growth = {
  getIncomingLinkRequests: jest.fn(),
  decideLinkRequest: jest.fn(),
}
jest.mock("@/services/manager/development/growthService", () => ({
  getIncomingLinkRequests: () => growth.getIncomingLinkRequests(),
  decideLinkRequest: (...a: unknown[]) => growth.decideLinkRequest(...a),
}))

/* The Users page around it, for the mount and boundary checks. */
jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="company-admin-layout">{children}</div>,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", changeLanguage: jest.fn() } }),
}))
jest.mock("sonner", () => ({ toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyUsers: () => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() }),
}))

import { LinkRequestsAdminSection } from "@/components/company-admin/LinkRequestsAdminSection"
import CompanyAdminUsers from "@/pages/company-admin/Users"
import { linkRequestKeys } from "@/hooks/summit/useLinkRequests"
import { developmentKeys } from "@/hooks/manager/development/queryKeys"
import { ADMIN_COPY, adminRequestLine, memberStatusLabel } from "@/components/sharing/linkRequestCopy"

/** Invented people — this repo is public. */
function row(over: Partial<IncomingLinkRequest> = {}): IncomingLinkRequest {
  return {
    id: "r1",
    memberId: "m-1",
    memberName: "Robin Example",
    status: "pending",
    categories: ["goals", "development"],
    createdAt: "2026-10-01T10:00:00+00:00",
    expiresAt: "2026-10-15T10:00:00+00:00",
    grantOutcome: null,
    managerName: "Casey Lead",
    ...over,
  }
}

const ok = <T,>(data: T) => ({ data: { success: true, data, message: "OK" } })
const httpError = (status: number, detail?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { detail } } })

function authAs(role: string | null) {
  return { hasRole: (r: string) => r === role } as unknown as React.ContextType<typeof AuthContext>
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
}

function renderWith(ui: ReactNode, role: string | null = "company-admin", qc?: QueryClient) {
  const client = qc ?? newClient()
  const tree = <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  render(role === null ? tree : <AuthContext.Provider value={authAs(role)}>{tree}</AuthContext.Provider>)
  return client
}

beforeEach(() => {
  jest.clearAllMocks()
  growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
})

describe("who sees the section", () => {
  it("a company-admin with a pending request in their org sees whose team it is", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsAdminSection />)
    expect(await screen.findByTestId("admin-link-requests")).toBeInTheDocument()
    expect(screen.getByText(ADMIN_COPY.title)).toBeInTheDocument()
    expect(screen.getByText(/Robin Example asked to join Casey Lead's team/)).toBeInTheDocument()
  })

  it("never shows what the member offered to share", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsAdminSection />)
    await screen.findByTestId("admin-request-r1")
    // Neither the labels nor the raw keys, in any case.
    const section = screen.getByTestId("admin-link-requests").textContent ?? ""
    expect(section).not.toMatch(/goals|development|share/i)
  })

  it("without the manager's name (growth not yet sending it) it reads 'a manager's team'", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row({ managerName: undefined })]))
    renderWith(<LinkRequestsAdminSection />)
    expect(await screen.findByText(/Robin Example asked to join a manager's team/)).toBeInTheDocument()
  })

  it("200 [] renders nothing", async () => {
    const qc = renderWith(<LinkRequestsAdminSection />)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("success"))
    expect(screen.queryByTestId("admin-link-requests")).toBeNull()
  })

  it.each([403, 404])("%s renders nothing", async (status) => {
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(status))
    const qc = renderWith(<LinkRequestsAdminSection />)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("error"))
    expect(screen.queryByTestId("admin-link-requests")).toBeNull()
  })

  it("an error on the FIRST read renders nothing", async () => {
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(502))
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryDelay: 1 } } })
    const qc = renderWith(<LinkRequestsAdminSection />, "company-admin", client)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("error"))
    await act(async () => undefined)
    expect(screen.queryByTestId("admin-link-requests")).toBeNull()
    expect(screen.queryByText(ADMIN_COPY.refreshFailed)).toBeNull()
  })

  it("an error on a refresh after requests showed keeps them and says so", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    const qc = renderWith(<LinkRequestsAdminSection />)
    expect(await screen.findByTestId("admin-request-r1")).toBeInTheDocument()
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(502))
    await act(async () => {
      await qc.refetchQueries({ queryKey: linkRequestKeys.incoming })
    })
    expect(await screen.findByText(ADMIN_COPY.refreshFailed)).toBeInTheDocument()
    expect(screen.getByTestId("admin-request-r1")).toBeInTheDocument()
  })

  it.each(["manager", "user", "super-admin"])("role %s makes no call", async (role) => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsAdminSection />, role)
    await act(async () => undefined)
    expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
    expect(screen.queryByTestId("admin-link-requests")).toBeNull()
  })
})

describe("cancelling", () => {
  it("asks once, cancels, says so, and the row leaves; the roster is not touched", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
    growth.decideLinkRequest.mockResolvedValue(ok(row({ status: "cancelled" })))
    const qc = newClient()
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    renderWith(<LinkRequestsAdminSection />, "company-admin", qc)
    await screen.findByTestId("admin-request-r1")
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.cancel }))
    expect(growth.decideLinkRequest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.confirm }))
    expect(await screen.findByRole("status")).toHaveTextContent(ADMIN_COPY.cancelled)
    expect(growth.decideLinkRequest).toHaveBeenCalledWith("r1", "cancel")
    await waitFor(() => expect(screen.queryByTestId("admin-request-r1")).toBeNull())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: linkRequestKeys.incoming })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: developmentKeys.roster() })
  })

  it("Keep backs out", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsAdminSection />)
    await screen.findByTestId("admin-request-r1")
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.cancel }))
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.keep }))
    expect(screen.getByRole("button", { name: ADMIN_COPY.cancel })).toBeInTheDocument()
    expect(growth.decideLinkRequest).not.toHaveBeenCalled()
  })

  it.each([
    [403, "company_admin_only", ADMIN_COPY.companyAdminOnly],
    [404, "not_found", ADMIN_COPY.gone],
    [409, "not_pending", ADMIN_COPY.notPending],
    [409, "something_new", ADMIN_COPY.failed],
    [500, undefined, ADMIN_COPY.failed],
  ])("refusal %s %s says so and never 'cancelled'", async (status, code, text) => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    growth.decideLinkRequest.mockRejectedValue(httpError(status, code ? { code, message: "x" } : undefined))
    renderWith(<LinkRequestsAdminSection />)
    await screen.findByTestId("admin-request-r1")
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.cancel }))
    fireEvent.click(screen.getByRole("button", { name: ADMIN_COPY.confirm }))
    expect(await screen.findByRole("alert")).toHaveTextContent(text)
    expect(screen.queryByText(ADMIN_COPY.cancelled)).toBeNull()
  })
})

describe("on the Users page", () => {
  it("shows above the users table for a company-admin with a request", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<CompanyAdminUsers />)
    expect(await screen.findByTestId("admin-link-requests")).toBeInTheDocument()
    expect(screen.getByText("admin:users.users")).toBeInTheDocument()
  })

  it("a fault inside the section blanks the section only; the users table stays", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row({ memberName: {} as unknown as string })]))
    renderWith(<CompanyAdminUsers />)
    await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
    await act(async () => undefined)
    expect(screen.queryByTestId("admin-link-requests")).toBeNull()
    expect(screen.getByText("admin:users.users")).toBeInTheDocument()
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument()
    spy.mockRestore()
  })
})

describe("the copy", () => {
  it("the admin line falls back for a missing member name too", () => {
    expect(adminRequestLine(null, null)).toBe("A member asked to join a manager's team")
    expect(adminRequestLine("  ", "  ")).toBe("A member asked to join a manager's team")
  })

  it("MMLR-F-b: a request a manager's removal marks 'removed' reads Closed on the member's card", () => {
    expect(memberStatusLabel("removed")).toBe("Closed")
  })
})
