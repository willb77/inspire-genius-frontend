/**
 * @jest-environment jsdom
 *
 * PI-4 S5 — the practitioner's invitations: every status, the claimed email
 * when it differs (D1), and which actions each status offers.
 */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ClientInvitesLoadError, ClientInvitesPanel } from "../ClientInvitesPanel"
import { STATUS_LABEL, canRevoke, canRotate, inviteUrl, SHOWN_ONCE_NOTE } from "../invitePresentation"
import type { ClientInvite } from "@/types/practitioner-invites"

const mockRevoke = jest.fn()
const mockRotate = jest.fn()
jest.mock("@/hooks/practitioner/useClientInvites", () => ({
  useRevokeClientInvite: () => ({ mutate: mockRevoke, isPending: false }),
  useRotateClientInvite: () => ({ mutate: mockRotate, isPending: false }),
}))
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock("sonner", () => ({
  toast: { success: (m: string) => mockToastSuccess(m), error: (m: string) => mockToastError(m) },
}))
const mockCopy = jest.fn()
jest.mock("@/lib/copyText", () => ({ copyText: (t: string) => mockCopy(t) }))

function inv(id: string, status: ClientInvite["status"], over: Partial<ClientInvite> = {}): ClientInvite {
  return {
    id,
    clientId: `c-${id}`,
    email: `${id}@example.com`,
    status,
    createdAt: "2026-11-01T00:00:00+00:00",
    expiresAt: "2026-11-15T00:00:00+00:00",
    claimedAt: status.startsWith("claimed") ? "2026-11-02T00:00:00+00:00" : null,
    claimedEmail: null,
    revokedAt: status === "revoked" ? "2026-11-03T00:00:00+00:00" : null,
    rotatedFrom: null,
    ...over,
  }
}

const ALL = [
  inv("open", "pending"),
  inv("mine", "claimed", { claimedEmail: "other@example.com" }),
  inv("same", "claimed", { claimedEmail: "SAME@example.com" }),
  inv("other", "claimed_by_other"),
  inv("old", "expired"),
  inv("gone", "revoked"),
]

beforeEach(() => jest.clearAllMocks())

describe("invitePresentation", () => {
  it("rotates anything unclaimed and revokes only an open link", () => {
    expect(["pending", "expired", "revoked"].every((s) => canRotate(s as never))).toBe(true)
    expect(canRotate("claimed")).toBe(false)
    expect(canRotate("claimed_by_other")).toBe(false)
    expect(canRevoke("pending")).toBe(true)
    for (const s of ["claimed", "claimed_by_other", "expired", "revoked"] as const) expect(canRevoke(s)).toBe(false)
  })
  it("builds the link on this origin and keeps the fragment", () => {
    expect(inviteUrl("/signup#invite=abc")).toBe(`${window.location.origin}/signup#invite=abc`)
  })
})

describe("ClientInvitesPanel (S5)", () => {
  it("labels every status", () => {
    render(<ClientInvitesPanel invites={ALL} clientNames={{ "c-open": "Open Client" }} />)
    expect(within(screen.getByTestId("invite-row-open")).getByText(STATUS_LABEL.pending)).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-open")).getByText("Open Client")).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-mine")).getByText("Claimed")).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-other")).getByText("Claimed by another account")).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-old")).getByText("Expired")).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-gone")).getByText("Revoked")).toBeInTheDocument()
  })

  it("shows the claimed email only when it differs from the invited one (D1)", () => {
    render(<ClientInvitesPanel invites={ALL} clientNames={{}} />)
    expect(within(screen.getByTestId("invite-row-mine")).getByText("other@example.com")).toBeInTheDocument()
    expect(within(screen.getByTestId("invite-row-same")).queryByText(/different email/)).toBeNull()
  })

  it("offers the right actions per status", () => {
    render(<ClientInvitesPanel invites={ALL} clientNames={{}} />)
    const row = (id: string) => within(screen.getByTestId(`invite-row-${id}`))
    expect(row("open").getByRole("button", { name: /copy new link/i })).toBeInTheDocument()
    expect(row("open").getByRole("button", { name: /revoke/i })).toBeInTheDocument()
    expect(row("old").getByRole("button", { name: /copy new link/i })).toBeInTheDocument()
    expect(row("old").queryByRole("button", { name: /revoke/i })).toBeNull()
    expect(row("gone").getByRole("button", { name: /copy new link/i })).toBeInTheDocument()
    for (const id of ["mine", "other"]) expect(row(id).queryAllByRole("button")).toHaveLength(0)
  })

  it("revokes and confirms", async () => {
    mockRevoke.mockImplementation((_id, opts) => {
      opts.onSuccess()
      opts.onSettled()
    })
    render(<ClientInvitesPanel invites={[inv("open", "pending")]} clientNames={{}} />)
    await userEvent.click(screen.getByRole("button", { name: /revoke/i }))
    expect(mockRevoke).toHaveBeenCalledWith("open", expect.any(Object))
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/revoked/i))
  })

  it("reports a refused revoke with the server's words", async () => {
    mockRevoke.mockImplementation((_id, opts) => {
      opts.onError(new Error("x"))
      opts.onSettled()
    })
    render(<ClientInvitesPanel invites={[inv("open", "pending")]} clientNames={{}} />)
    await userEvent.click(screen.getByRole("button", { name: /revoke/i }))
    expect(mockToastError).toHaveBeenCalledWith("Could not revoke the link. Please try again.")
  })

  it("rotates, then shows the new link once with the once-note and copy", async () => {
    mockRotate.mockImplementation((_id, opts) => {
      opts.onSuccess({ invite: {}, invitePath: "/signup#invite=NEWTOKEN" })
      opts.onSettled()
    })
    mockCopy.mockResolvedValue(true)
    render(<ClientInvitesPanel invites={[inv("old", "expired")]} clientNames={{ "c-old": "Pat" }} />)
    await userEvent.click(screen.getByRole("button", { name: /copy new link/i }))
    expect(await screen.findByText(SHOWN_ONCE_NOTE)).toBeInTheDocument()
    expect(screen.getByLabelText("Invite link")).toHaveValue(`${window.location.origin}/signup#invite=NEWTOKEN`)
    await userEvent.click(screen.getByRole("button", { name: /copy link/i }))
    expect(mockCopy).toHaveBeenCalledWith(`${window.location.origin}/signup#invite=NEWTOKEN`)
    expect(mockToastSuccess).toHaveBeenCalledWith("Invite link copied")
  })

  it("selects the link for a hand copy when the clipboard fails", async () => {
    mockRotate.mockImplementation((_id, opts) => {
      opts.onSuccess({ invite: {}, invitePath: "/signup#invite=NEWTOKEN" })
      opts.onSettled()
    })
    mockCopy.mockResolvedValue(false)
    render(<ClientInvitesPanel invites={[inv("old", "expired")]} clientNames={{}} />)
    await userEvent.click(screen.getByRole("button", { name: /copy new link/i }))
    await userEvent.click(await screen.findByRole("button", { name: /copy link/i }))
    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/copy it by hand/))
    await userEvent.click(screen.getByRole("button", { name: /done/i }))
    expect(screen.queryByText(SHOWN_ONCE_NOTE)).toBeNull()
  })

  it("says so when there are no invitations", () => {
    render(<ClientInvitesPanel invites={[]} clientNames={{}} />)
    expect(screen.getByText(/No invitations yet/)).toBeInTheDocument()
  })

  it("load error offers a retry", async () => {
    const retry = jest.fn()
    render(<ClientInvitesLoadError onRetry={retry} />)
    expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/)
    await userEvent.click(screen.getByRole("button", { name: /retry/i }))
    expect(retry).toHaveBeenCalled()
  })
})
