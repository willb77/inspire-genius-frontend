/**
 * MMLR-5: the member's "Join a manager's team" card.
 *
 * The card is server-gated: it shows only after the list answers 200 for a
 * signed-in member. A 404 (feature off) and any failure of the FIRST read show
 * nothing; a failed refresh after a 200 keeps the list and says so. Every send
 * gets the same answer. "Stop sharing" on leave never claims what it did not
 * do. A fault inside the card blanks the card, never the sharing panel.
 */
import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthContext } from "@/context/auth-context"
import type { MemberLinkRequest } from "@/services/manager/development/growthService"
import type { VisibilityPerson } from "@/types/consent"

const growth = {
  getMyLinkRequests: jest.fn(),
  createLinkRequest: jest.fn(),
  actOnMyLinkRequest: jest.fn(),
  leaveTeam: jest.fn(),
}
jest.mock("@/services/manager/development/growthService", () => ({
  getMyLinkRequests: () => growth.getMyLinkRequests(),
  createLinkRequest: (...a: unknown[]) => growth.createLinkRequest(...a),
  actOnMyLinkRequest: (...a: unknown[]) => growth.actOnMyLinkRequest(...a),
  leaveTeam: () => growth.leaveTeam(),
}))

const svc = {
  getPeople: jest.fn(),
  getMyGrants: jest.fn(),
  getAccessLog: jest.fn(),
  lookupPerson: jest.fn(),
  offerAccess: jest.fn(),
  extendGrant: jest.fn(),
  revokeGrant: jest.fn(),
  respondToRequest: jest.fn(),
  getCategories: jest.fn(),
}
jest.mock("@/services/consent/visibility.service", () => ({
  getPeople: () => svc.getPeople(),
  getMyGrants: () => svc.getMyGrants(),
  getAccessLog: () => svc.getAccessLog(),
  lookupPerson: (...a: unknown[]) => svc.lookupPerson(...a),
  offerAccess: (...a: unknown[]) => svc.offerAccess(...a),
  extendGrant: (...a: unknown[]) => svc.extendGrant(...a),
  revokeGrant: (...a: unknown[]) => svc.revokeGrant(...a),
  respondToRequest: (...a: unknown[]) => svc.respondToRequest(...a),
  getCategories: () => svc.getCategories(),
}))
jest.mock("@/services/summit/goals.service", () => ({ getMyGoals: jest.fn() }))
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({
  CoachGoalCard: () => <div data-testid="coach-goal-card" />,
}))

import { MemberLinkRequestCard } from "@/components/sharing/MemberLinkRequestCard"
import {
  memberStatusLabel,
  NO_SHARE_FOUND,
  REFRESH_FAILED,
  SENT_MESSAGE,
} from "@/components/sharing/linkRequestCopy"
import { SharingCore } from "@/pages/summit/SummitSharing"
import { linkRequestKeys } from "@/hooks/summit/useLinkRequests"

const EMAIL = "lead@example.com"

function row(over: Partial<MemberLinkRequest> = {}): MemberLinkRequest {
  return {
    id: "r1",
    requestedEmail: EMAIL,
    status: "pending",
    categories: [],
    createdAt: "2026-10-01T10:00:00+00:00",
    expiresAt: "2026-10-15T10:00:00+00:00",
    decidedAt: null,
    grantOutcome: null,
    ...over,
  }
}

const ok = <T,>(data: T) => ({ data: { success: true, data, message: "OK" } })
const httpError = (status: number, detail?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { detail } } })

function person(over: Partial<VisibilityPerson> = {}): VisibilityPerson {
  return {
    userId: "u-lead",
    displayName: "Team Lead",
    email: "Lead@Example.com",
    kinds: ["roster_manager"],
    grant: { id: "g-1", status: "granted", categories: { goals: true }, expiresAt: null, requestedAt: null },
    ...over,
  }
}

function authAs(role: string | null) {
  return { hasRole: (r: string) => r === role } as unknown as React.ContextType<typeof AuthContext>
}

function renderWith(ui: ReactNode, role: string | null = "user", qc?: QueryClient) {
  const client = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  const tree = (
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
  render(role === null ? tree : <AuthContext.Provider value={authAs(role)}>{tree}</AuthContext.Provider>)
  return client
}

beforeEach(() => {
  jest.clearAllMocks()
  growth.getMyLinkRequests.mockResolvedValue(ok([]))
  svc.getPeople.mockResolvedValue({ people: [person()], sources: {} })
  svc.getMyGrants.mockResolvedValue([])
  svc.getAccessLog.mockResolvedValue([])
  svc.getCategories.mockResolvedValue({ categories: [], notGrantable: [] })
})

describe("who sees the card", () => {
  it("a member whose list answers 200 sees the card", async () => {
    renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByTestId("link-request-card")).toBeInTheDocument()
    expect(screen.getByText("Join a manager's team")).toBeInTheDocument()
  })

  it("a manager sees nothing and no request is made", async () => {
    renderWith(<MemberLinkRequestCard />, "manager")
    await act(async () => undefined)
    expect(screen.queryByTestId("link-request-card")).toBeNull()
    expect(growth.getMyLinkRequests).not.toHaveBeenCalled()
  })

  it("no signed-in context: nothing, no request", async () => {
    renderWith(<MemberLinkRequestCard />, null)
    await act(async () => undefined)
    expect(screen.queryByTestId("link-request-card")).toBeNull()
    expect(growth.getMyLinkRequests).not.toHaveBeenCalled()
  })

  it("404 (feature not on for them) renders nothing", async () => {
    growth.getMyLinkRequests.mockRejectedValue(httpError(404, { code: "not_available", message: "Not found" }))
    const qc = renderWith(<MemberLinkRequestCard />)
    // A 404 is not retried: it settles as an error on the first call.
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.mine)?.status).toBe("error"))
    expect(growth.getMyLinkRequests).toHaveBeenCalledTimes(1)
    await act(async () => undefined)
    expect(screen.queryByTestId("link-request-card")).toBeNull()
    expect(screen.queryByText(REFRESH_FAILED)).toBeNull()
  })

  it("an error on the FIRST read renders nothing — no note on every customer's page", async () => {
    growth.getMyLinkRequests.mockRejectedValue(httpError(502))
    const qc = renderWith(<MemberLinkRequestCard />)
    // Wait for the read to SETTLE as an error (after its one retry), not just to start.
    await waitFor(() => expect(qc.getQueryState(linkRequestKeys.mine)?.status).toBe("error"), { timeout: 4000 })
    await act(async () => undefined)
    expect(screen.queryByTestId("link-request-card")).toBeNull()
    expect(screen.queryByText(REFRESH_FAILED)).toBeNull()
  })

  it("an error on a refresh after a 200 keeps the list and says it could not refresh", async () => {
    growth.getMyLinkRequests.mockResolvedValueOnce(ok([row()]))
    const qc = renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByTestId("link-request-r1")).toBeInTheDocument()
    expect(screen.queryByText(REFRESH_FAILED)).toBeNull()
    growth.getMyLinkRequests.mockRejectedValue(httpError(502))
    await act(async () => {
      await qc.refetchQueries({ queryKey: linkRequestKeys.mine })
    })
    expect(await screen.findByText(REFRESH_FAILED)).toBeInTheDocument()
    expect(screen.getByTestId("link-request-r1")).toBeInTheDocument()
  })

  it("a 404 on a refresh (switched off since) hides the card", async () => {
    growth.getMyLinkRequests.mockResolvedValueOnce(ok([row()]))
    const qc = renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByTestId("link-request-card")).toBeInTheDocument()
    growth.getMyLinkRequests.mockRejectedValue(httpError(404))
    await act(async () => {
      await qc.refetchQueries({ queryKey: linkRequestKeys.mine })
    })
    await waitFor(() => expect(screen.queryByTestId("link-request-card")).toBeNull())
  })
})

describe("asking", () => {
  it("nothing is ticked to start with", async () => {
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    const boxes = screen.getAllByRole("checkbox")
    expect(boxes.length).toBe(6)
    for (const b of boxes) expect(b).toHaveAttribute("aria-checked", "false")
    expect(screen.getByText("Shared only if they accept.")).toBeInTheDocument()
  })

  it("sends the exact email with nothing ticked and shows the same neutral answer", async () => {
    growth.createLinkRequest.mockResolvedValue({ data: { data: { status: "sent", message: "server words" } } })
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    fireEvent.change(screen.getByLabelText("Manager's email address"), { target: { value: `  ${EMAIL} ` } })
    fireEvent.click(screen.getByRole("button", { name: /send request/i }))
    expect(await screen.findByText(SENT_MESSAGE)).toBeInTheDocument()
    expect(growth.createLinkRequest).toHaveBeenCalledWith({ managerEmail: EMAIL, categories: [] })
  })

  it("sends what was ticked", async () => {
    growth.createLinkRequest.mockResolvedValue({ data: { data: { status: "sent", message: "" } } })
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    fireEvent.change(screen.getByLabelText("Manager's email address"), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole("checkbox", { name: "Share Goals if they accept" }))
    fireEvent.click(screen.getByRole("button", { name: /send request/i }))
    await screen.findByText(SENT_MESSAGE)
    expect(growth.createLinkRequest).toHaveBeenCalledWith({ managerEmail: EMAIL, categories: ["goals"] })
  })

  it("an invalid address is caught before anything is sent", async () => {
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    fireEvent.change(screen.getByLabelText("Manager's email address"), { target: { value: "not-an-email" } })
    fireEvent.click(screen.getByRole("button", { name: /send request/i }))
    expect(await screen.findByText("Enter their exact email address.")).toBeInTheDocument()
    expect(growth.createLinkRequest).not.toHaveBeenCalled()
  })

  it("409 already_on_a_team says so, and never 'Sent'", async () => {
    growth.createLinkRequest.mockRejectedValue(httpError(409, { code: "already_on_a_team", message: "x" }))
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    fireEvent.change(screen.getByLabelText("Manager's email address"), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole("button", { name: /send request/i }))
    expect(await screen.findByText("You're already on a team. Leave it first to join another.")).toBeInTheDocument()
    expect(screen.queryByText(SENT_MESSAGE)).toBeNull()
  })

  it.each([
    [httpError(403, { code: "members_only", message: "x" }), "Only members can ask to join a team."],
    [httpError(422, [{ msg: "bad" }]), "One of those choices can't be shared. Nothing was sent."],
    [httpError(404), "Asking to join a team isn't available for your account right now. Nothing was sent."],
    [httpError(500), "That didn't send. Nothing was sent — try again."],
  ])("other refusals are honest errors (%#)", async (err, text) => {
    growth.createLinkRequest.mockRejectedValue(err)
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-request-card")
    fireEvent.change(screen.getByLabelText("Manager's email address"), { target: { value: EMAIL } })
    fireEvent.click(screen.getByRole("button", { name: /send request/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(text)
    expect(screen.queryByText(SENT_MESSAGE)).toBeNull()
  })
})

describe("my requests", () => {
  it("pending: Withdraw withdraws", async () => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row()]))
    growth.actOnMyLinkRequest.mockResolvedValue(ok(row({ status: "withdrawn" })))
    renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByTestId("link-status-r1")).toHaveTextContent("Waiting for a reply")
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }))
    await waitFor(() => expect(growth.actOnMyLinkRequest).toHaveBeenCalledWith("r1", "withdraw"))
  })

  it("a failed withdraw says so", async () => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row()]))
    growth.actOnMyLinkRequest.mockRejectedValue(httpError(500))
    renderWith(<MemberLinkRequestCard />)
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't withdraw")
  })

  it("approved and shared: Added and Leave team, no retry", async () => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row({ status: "approved", categories: ["goals"], grantOutcome: "offered", decidedAt: "2026-10-02T10:00:00+00:00" })]))
    renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByTestId("link-status-r1")).toHaveTextContent("Added")
    expect(screen.getByRole("button", { name: "Leave team" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    expect(screen.queryByText("Sharing wasn't applied.")).toBeNull()
  })

  it("approved with nothing ticked never offers a retry", async () => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row({ status: "approved", categories: [], grantOutcome: null })]))
    renderWith(<MemberLinkRequestCard />)
    await screen.findByTestId("link-status-r1")
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it.each(["failed", null])("approved with grantOutcome %s: 'Sharing wasn't applied' and Try again shares", async (outcome) => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row({ status: "approved", categories: ["goals"], grantOutcome: outcome })]))
    growth.actOnMyLinkRequest.mockResolvedValue(ok(row({ status: "approved", grantOutcome: "offered" })))
    renderWith(<MemberLinkRequestCard />)
    expect(await screen.findByText("Sharing wasn't applied.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(growth.actOnMyLinkRequest).toHaveBeenCalledWith("r1", "share"))
  })

  it("a failed retry says sharing still wasn't applied", async () => {
    growth.getMyLinkRequests.mockResolvedValue(ok([row({ status: "approved", categories: ["goals"], grantOutcome: "failed" })]))
    growth.actOnMyLinkRequest.mockRejectedValue(httpError(500))
    renderWith(<MemberLinkRequestCard />)
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Sharing still wasn't applied")
  })

  it.each(["closed", "declined", "cancelled", "expired", "something-new"])(
    "%s reads 'Closed', with no date and no actions",
    async (status) => {
      growth.getMyLinkRequests.mockResolvedValue(ok([row({ status, decidedAt: "2026-10-02T10:00:00+00:00" })]))
      renderWith(<MemberLinkRequestCard />)
      const li = await screen.findByTestId("link-request-r1")
      expect(screen.getByTestId("link-status-r1")).toHaveTextContent(/^Closed$/)
      expect(li).not.toHaveTextContent(/Asked|Added/)
      expect(li.querySelectorAll("button").length).toBe(0)
    },
  )

  it("labels the member's own endings as themselves", () => {
    expect(memberStatusLabel("withdrawn")).toBe("Withdrawn")
    expect(memberStatusLabel("left")).toBe("Left the team")
    expect(memberStatusLabel("pending")).toBe("Waiting for a reply")
    expect(memberStatusLabel("approved")).toBe("Added")
  })
})

describe("leaving", () => {
  const approved = () => ok([row({ status: "approved", categories: ["goals"], grantOutcome: "offered" })])

  async function startLeave() {
    renderWith(<MemberLinkRequestCard />)
    fireEvent.click(await screen.findByRole("button", { name: "Leave team" }))
    return screen.getByRole("checkbox", { name: "Also stop sharing with them?" })
  }

  it("asks 'Also stop sharing with them?', ticked by default, and stops the matching share", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockResolvedValue(ok({ left: true, requestId: "r1" }))
    svc.revokeGrant.mockResolvedValue({ id: "g-1", status: "revoked" })
    const box = await startLeave()
    expect(box).toHaveAttribute("aria-checked", "true")
    await waitFor(() => expect(svc.getPeople).toHaveBeenCalled())
    await act(async () => undefined)
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByText("You've left the team and stopped sharing with them.")).toBeInTheDocument()
    expect(growth.leaveTeam).toHaveBeenCalled()
    expect(svc.revokeGrant).toHaveBeenCalledWith("g-1")
  })

  it("no matching share: says it couldn't find one and never claims it stopped", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockResolvedValue(ok({ left: true, requestId: "r1" }))
    svc.getPeople.mockResolvedValue({ people: [person({ email: "someone-else@example.com" })], sources: {} })
    await startLeave()
    await waitFor(() => expect(svc.getPeople).toHaveBeenCalled())
    await act(async () => undefined)
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByText(`You've left the team. ${NO_SHARE_FOUND}`)).toBeInTheDocument()
    expect(svc.revokeGrant).not.toHaveBeenCalled()
    expect(screen.queryByText(/stopped sharing/)).toBeNull()
  })

  it("a share that is not live is not one to stop", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockResolvedValue(ok({ left: true, requestId: "r1" }))
    svc.getPeople.mockResolvedValue({
      people: [person({ grant: { id: "g-old", status: "revoked", categories: {}, expiresAt: null, requestedAt: null } })],
      sources: {},
    })
    await startLeave()
    await waitFor(() => expect(svc.getPeople).toHaveBeenCalled())
    await act(async () => undefined)
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByText(`You've left the team. ${NO_SHARE_FOUND}`)).toBeInTheDocument()
    expect(svc.revokeGrant).not.toHaveBeenCalled()
  })

  it("unticked: leaves and stops nothing", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockResolvedValue(ok({ left: true, requestId: "r1" }))
    const box = await startLeave()
    fireEvent.click(box)
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByText("You've left the team.")).toBeInTheDocument()
    expect(svc.revokeGrant).not.toHaveBeenCalled()
  })

  it("a failed revoke says sharing wasn't stopped", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockResolvedValue(ok({ left: true, requestId: "r1" }))
    svc.revokeGrant.mockRejectedValue(httpError(500))
    await startLeave()
    await waitFor(() => expect(svc.getPeople).toHaveBeenCalled())
    await act(async () => undefined)
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByRole("alert")).toHaveTextContent("sharing wasn't stopped")
  })

  it("409 ask_your_manager: only the manager can remove them, nothing revoked", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockRejectedValue(httpError(409, { code: "ask_your_manager", message: "x" }))
    await startLeave()
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByRole("alert")).toHaveTextContent("Your manager added you to this team, so only they can remove you.")
    expect(svc.revokeGrant).not.toHaveBeenCalled()
  })

  it("any other leave failure says they are still on the team", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    growth.leaveTeam.mockRejectedValue(httpError(500))
    await startLeave()
    fireEvent.click(screen.getAllByRole("button", { name: "Leave team" }).at(-1)!)
    expect(await screen.findByRole("alert")).toHaveTextContent("You're still on the team")
  })

  it("Keep closes the question without leaving", async () => {
    growth.getMyLinkRequests.mockResolvedValue(approved())
    await startLeave()
    fireEvent.click(screen.getByRole("button", { name: "Keep" }))
    expect(screen.queryByRole("checkbox", { name: "Also stop sharing with them?" })).toBeNull()
    expect(growth.leaveTeam).not.toHaveBeenCalled()
  })
})

describe("inside the sharing panel (both mounts render SharingCore)", () => {
  it("renders after Add a person", async () => {
    renderWith(<SharingCore />)
    const card = await screen.findByTestId("link-request-card")
    const add = screen.getByText("Add a person")
    expect(add.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("a fault inside the card blanks only the card, never the panel", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    // A malformed row (categories not a list) throws while rendering.
    growth.getMyLinkRequests.mockResolvedValue(ok([{ ...row({ status: "approved" }), categories: null }]))
    renderWith(<SharingCore />)
    await waitFor(() => expect(growth.getMyLinkRequests).toHaveBeenCalled())
    await act(async () => undefined)
    expect(screen.getByText("Add a person")).toBeInTheDocument()
    expect(screen.getByTestId("sharing-people")).toBeInTheDocument()
    expect(screen.queryByTestId("link-request-card")).toBeNull()
    spy.mockRestore()
  })
})
