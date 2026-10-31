/**
 * MMLR-6: the manager's "Requests to join your team" panel.
 *
 * The list answers 200 `[]` both when nobody has asked and when the feature is
 * off, so the panel shows only while a request waits. `[]`, 403, 404 and a
 * failed FIRST read show nothing; a failed refresh after requests have shown
 * keeps them and says so. Accept and Decline report each refusal by its code
 * and never claim success. Practitioners make no call. A fault inside the
 * panel blanks the panel, never what sits beside it.
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
jest.mock("@/hooks/useFrontendText", () => ({ useFrontendText: () => ({ data: undefined }) }))

import { LinkRequestsPanel } from "@/components/manager/development/LinkRequestsPanel"
import { linkRequestKeys } from "@/hooks/summit/useLinkRequests"
import { developmentKeys } from "@/hooks/manager/development/queryKeys"
import { DEV_TEXT } from "@/constants/development"

/** Invented people — this repo is public. */
function row(over: Partial<IncomingLinkRequest> = {}): IncomingLinkRequest {
  return {
    id: "r1",
    memberId: "m-1",
    memberName: "Robin Example",
    status: "pending",
    categories: [],
    createdAt: "2026-10-01T10:00:00+00:00",
    expiresAt: "2026-10-15T10:00:00+00:00",
    grantOutcome: null,
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

function renderWith(ui: ReactNode, role: string | null = "manager", qc?: QueryClient) {
  const client = qc ?? newClient()
  const tree = <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  render(role === null ? tree : <AuthContext.Provider value={authAs(role)}>{tree}</AuthContext.Provider>)
  return client
}

const T = DEV_TEXT

beforeEach(() => {
  jest.clearAllMocks()
  growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
})

describe("who sees the panel", () => {
  it("a manager with a pending request sees it", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsPanel audience="manager" />)
    expect(await screen.findByTestId("link-requests-panel")).toBeInTheDocument()
    expect(screen.getByText(T["dev.linkRequests.title"])).toBeInTheDocument()
    expect(screen.getByText("Robin Example")).toBeInTheDocument()
    expect(screen.getByText(/^asked /)).toBeInTheDocument()
  })

  it("200 [] (none, or the feature off — indistinguishable) renders nothing", async () => {
    const qc = renderWith(<LinkRequestsPanel audience="manager" />)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("success"))
    expect(growth.getIncomingLinkRequests).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  })

  it.each([403, 404])("%s renders nothing and is not retried", async (status) => {
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(status))
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryDelay: 1 } } })
    const qc = renderWith(<LinkRequestsPanel audience="manager" />, "manager", client)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("error"))
    expect(growth.getIncomingLinkRequests).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  })

  it("an error on the FIRST read renders nothing — no note on every manager's page", async () => {
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(502))
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryDelay: 1 } } })
    const qc = renderWith(<LinkRequestsPanel audience="manager" />, "manager", client)
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.incoming)?.status).toBe("error"))
    // A 502 is retried once before it settles.
    expect(growth.getIncomingLinkRequests).toHaveBeenCalledTimes(2)
    await act(async () => undefined)
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
    expect(screen.queryByText(T["dev.linkRequests.refreshFailed"])).toBeNull()
  })

  it("an error on a refresh after requests showed keeps them and says it could not refresh", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    const qc = renderWith(<LinkRequestsPanel audience="manager" />)
    expect(await screen.findByTestId("incoming-r1")).toBeInTheDocument()
    expect(screen.queryByTestId("link-requests-refresh-failed")).toBeNull()
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(502))
    await act(async () => {
      await qc.refetchQueries({ queryKey: linkRequestKeys.incoming })
    })
    expect(await screen.findByText(T["dev.linkRequests.refreshFailed"])).toBeInTheDocument()
    expect(screen.getByTestId("incoming-r1")).toBeInTheDocument()
  })

  it("a 403 on a refresh hides the panel rather than noting a refresh failure", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    const qc = renderWith(<LinkRequestsPanel audience="manager" />)
    expect(await screen.findByTestId("link-requests-panel")).toBeInTheDocument()
    growth.getIncomingLinkRequests.mockRejectedValue(httpError(403))
    await act(async () => {
      await qc.refetchQueries({ queryKey: linkRequestKeys.incoming })
    })
    await waitFor(() => expect(screen.queryByTestId("link-requests-panel")).toBeNull())
  })

  it("a practitioner mount makes no call, even for a manager role", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsPanel audience="practitioner" />, "manager")
    await act(async () => undefined)
    expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  })

  it.each(["practitioner", "company-admin", "user"])("role %s on the manager mount makes no call", async (role) => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsPanel audience="manager" />, role)
    await act(async () => undefined)
    expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
  })

  it("no signed-in context: nothing, no call", async () => {
    renderWith(<LinkRequestsPanel audience="manager" />, null)
    await act(async () => undefined)
    expect(growth.getIncomingLinkRequests).not.toHaveBeenCalled()
  })
})

describe("what a row says", () => {
  it("names what they'll share if accepted, with the Sharing page's labels", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row({ categories: ["development", "goals", "not_a_label"] })]))
    renderWith(<LinkRequestsPanel audience="manager" />)
    expect(await screen.findByText(`${T["dev.linkRequests.willShare"]} Goals, Development`)).toBeInTheDocument()
  })

  it("says nothing about sharing when nothing was ticked", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsPanel audience="manager" />)
    await screen.findByTestId("incoming-r1")
    expect(screen.queryByText(new RegExp(T["dev.linkRequests.willShare"]))).toBeNull()
  })

  it("a missing name still reads as a person", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row({ memberName: null, createdAt: null })]))
    renderWith(<LinkRequestsPanel audience="manager" />)
    expect(await screen.findByText("A member")).toBeInTheDocument()
    expect(screen.queryByText(/^asked /)).toBeNull()
  })
})

describe("accepting", () => {
  it("success: says added, the row leaves, and the roster and the list are re-read", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row(), row({ id: "r2", memberName: "Sam Example" })]))
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row({ id: "r2", memberName: "Sam Example" })]))
    growth.decideLinkRequest.mockResolvedValue(ok(row({ status: "approved" })))
    const qc = newClient()
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    renderWith(<LinkRequestsPanel audience="manager" />, "manager", qc)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getAllByRole("button", { name: T["dev.linkRequests.accept"] })[0])
    expect(await screen.findByText(T["dev.linkRequests.added"])).toBeInTheDocument()
    expect(growth.decideLinkRequest).toHaveBeenCalledWith("r1", "approve")
    await waitFor(() => expect(screen.queryByTestId("incoming-r1")).toBeNull())
    expect(screen.getByTestId("incoming-r2")).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: developmentKeys.roster() })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: linkRequestKeys.incoming })
  })

  it("accepting the LAST request keeps the panel long enough to say so", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
    growth.decideLinkRequest.mockResolvedValue(ok(row({ status: "approved" })))
    renderWith(<LinkRequestsPanel audience="manager" />)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.accept"] }))
    expect(await screen.findByRole("status")).toHaveTextContent(T["dev.linkRequests.added"])
    await waitFor(() => expect(screen.queryByTestId("incoming-r1")).toBeNull())
    expect(screen.getByTestId("link-requests-panel")).toBeInTheDocument()
  })

  it.each([
    [409, "already_on_a_team", "dev.linkRequests.refused.alreadyOnTeam"],
    [409, "cross_org", "dev.linkRequests.refused.crossOrg"],
    [409, "not_pending", "dev.linkRequests.refused.notPending"],
    [404, "not_available", "dev.linkRequests.refused.gone"],
    [404, "not_found", "dev.linkRequests.refused.gone"],
    [500, undefined, "dev.linkRequests.refused.other"],
    [409, "something_new", "dev.linkRequests.refused.other"],
  ])("refusal %s %s: says so, never 'added', and re-reads the list", async (status, code, key) => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    growth.decideLinkRequest.mockRejectedValue(httpError(status, code ? { code, message: "x" } : undefined))
    const qc = newClient()
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    renderWith(<LinkRequestsPanel audience="manager" />, "manager", qc)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.accept"] }))
    expect(await screen.findByRole("alert")).toHaveTextContent(T[key])
    expect(screen.queryByText(T["dev.linkRequests.added"])).toBeNull()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: linkRequestKeys.incoming })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: developmentKeys.roster() })
  })
})

describe("declining", () => {
  it("asks once, then declines and says so; the roster is not re-read", async () => {
    growth.getIncomingLinkRequests.mockResolvedValueOnce(ok([row()]))
    growth.getIncomingLinkRequests.mockResolvedValue(ok([]))
    growth.decideLinkRequest.mockResolvedValue(ok(row({ status: "declined" })))
    const qc = newClient()
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    renderWith(<LinkRequestsPanel audience="manager" />, "manager", qc)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.decline"] }))
    expect(growth.decideLinkRequest).not.toHaveBeenCalled()
    expect(screen.getByText(T["dev.linkRequests.declineConfirm"])).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.declineYes"] }))
    expect(await screen.findByRole("status")).toHaveTextContent(T["dev.linkRequests.declined"])
    expect(growth.decideLinkRequest).toHaveBeenCalledWith("r1", "decline")
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: developmentKeys.roster() })
  })

  it("Keep backs out without deciding", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    renderWith(<LinkRequestsPanel audience="manager" />)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.decline"] }))
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.keep"] }))
    expect(screen.getByRole("button", { name: T["dev.linkRequests.accept"] })).toBeInTheDocument()
    expect(growth.decideLinkRequest).not.toHaveBeenCalled()
  })

  it("a refused decline says what happened", async () => {
    growth.getIncomingLinkRequests.mockResolvedValue(ok([row()]))
    growth.decideLinkRequest.mockRejectedValue(httpError(409, { code: "not_pending", message: "x" }))
    renderWith(<LinkRequestsPanel audience="manager" />)
    await screen.findByTestId("incoming-r1")
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.decline"] }))
    fireEvent.click(screen.getByRole("button", { name: T["dev.linkRequests.declineYes"] }))
    expect(await screen.findByRole("alert")).toHaveTextContent(T["dev.linkRequests.refused.notPending"])
    expect(screen.queryByText(T["dev.linkRequests.declined"])).toBeNull()
  })
})

describe("its own error boundary", () => {
  it("a fault inside the panel blanks the panel only", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    growth.getIncomingLinkRequests.mockResolvedValue(
      ok([row({ categories: null as unknown as string[] })]),
    )
    renderWith(
      <div>
        <LinkRequestsPanel audience="manager" />
        <p>the roster beside it</p>
      </div>,
    )
    await waitFor(() => expect(growth.getIncomingLinkRequests).toHaveBeenCalled())
    await act(async () => undefined)
    expect(screen.queryByTestId("link-requests-panel")).toBeNull()
    expect(screen.getByText("the roster beside it")).toBeInTheDocument()
    spy.mockRestore()
  })
})
