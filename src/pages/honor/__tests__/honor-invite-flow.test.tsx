/**
 * @jest-environment jsdom
 *
 * Honor invitation-flow FE changes:
 *  - InviteComposer builds a rich-text acknowledgement body and returns it on Send.
 *  - HonorCaseload opens the composer and fires the bulk invite WITH `messageHtml`.
 *  - The bulk invite no longer sends a magic link (backend owns the email now).
 *  - The per-fellow status control calls setFellowStatus.
 *  - Onboarding is NOT blocked when PRISM is omitted (PRISM is optional).
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Shared mocks ── */
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), warning: jest.fn(), error: jest.fn() },
}))

const inviteFellowsBulk = jest.fn()
const setFellowStatus = jest.fn()
const createFellow = jest.fn()
const inviteFellow = jest.fn()
const setFellowGoals = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  inviteFellowsBulk: (...a: unknown[]) => inviteFellowsBulk(...a),
  setFellowStatus: (...a: unknown[]) => setFellowStatus(...a),
  createFellow: (...a: unknown[]) => createFellow(...a),
  inviteFellow: (...a: unknown[]) => inviteFellow(...a),
  setFellowGoals: (...a: unknown[]) => setFellowGoals(...a),
}))

const requestMagicLink = jest.fn()
jest.mock("@/services/magic-auth/magic-auth.service", () => ({
  requestMagicLink: (...a: unknown[]) => requestMagicLink(...a),
}))

const importFellowAssessment = jest.fn()
jest.mock("@/services/honor/assessment.service", () => ({
  importFellowAssessment: (...a: unknown[]) => importFellowAssessment(...a),
  HONOR_FRAMEWORK_LABELS: { PRISM: "PRISM", DISC: "DISC", CLIFTON: "CliftonStrengths" },
}))

const initiateUpload = jest.fn()
const uploadToS3 = jest.fn()
const triggerProcessing = jest.fn()
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: (...a: unknown[]) => initiateUpload(...a),
  uploadToS3: (...a: unknown[]) => uploadToS3(...a),
  triggerProcessing: (...a: unknown[]) => triggerProcessing(...a),
}))

// Caseload roster — mock the read hook so no axios runs.
const MOCK_FELLOWS = [
  {
    id: "2201",
    firstName: "Marcus",
    lastName: "Reyes",
    email: "marcus@honor.org",
    background: "Naval Special Warfare",
    target: "Program Management",
    prism: null,
    disc: null,
    cliftonStrengths: [],
    status: "intake-pending",
    cohort: "Cohort 2026-A",
    docs: [],
  },
]
jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => ({ data: MOCK_FELLOWS, isLoading: false }),
}))

import InviteComposer, { DEFAULT_INVITE_HTML } from "../InviteComposer"
import HonorCaseload from "../HonorCaseload"
import { runHonorOnboard } from "@/hooks/honor/useHonorOnboard"

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  inviteFellowsBulk.mockResolvedValue({ data: { converted: 1, skipped: 0, errors: 0, results: [] } })
  setFellowStatus.mockResolvedValue({ data: { fellowId: "2201", status: "assessed" } })
})

/* ── T1: InviteComposer ── */
describe("InviteComposer", () => {
  test("returns the composed HTML body on Send", () => {
    const onSend = jest.fn()
    render(
      <InviteComposer open recipientCount={2} onCancel={jest.fn()} onSend={onSend} />,
    )

    // Simulate the coach typing a formatted message into the contentEditable body.
    const editor = screen.getByRole("textbox", { name: /message body/i })
    editor.innerHTML = "<p><strong>Congratulations</strong> and welcome.</p>"
    fireEvent.input(editor)

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /send invitation/i }))

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0]).toContain("<strong>Congratulations</strong>")
  })

  test("toolbar Bold invokes execCommand and the preview mirrors the body", async () => {
    const exec = jest.fn()
    // jsdom has no execCommand impl — spy so we can assert the wiring.
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true, writable: true })

    render(<InviteComposer open recipientCount={1} onCancel={jest.fn()} onSend={jest.fn()} />)

    // Wait for the editor to be seeded with the default body (rAF).
    const editor = screen.getByRole("textbox", { name: /message body/i })
    await waitFor(() => expect(editor.innerHTML).toContain("Congratulations"))

    fireEvent.click(screen.getByRole("button", { name: /^bold$/i }))
    expect(exec).toHaveBeenCalledWith("bold", false)

    // The preview renders the seeded default body verbatim.
    expect(screen.getByLabelText(/email preview/i).innerHTML).toContain("Congratulations")
    expect(DEFAULT_INVITE_HTML).toContain("Congratulations")
  })

  test("does not render when closed", () => {
    render(<InviteComposer open={false} recipientCount={1} onCancel={jest.fn()} onSend={jest.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

/* ── T1 + T2: Caseload opens composer → bulk invite with messageHtml, no magic link ── */
describe("HonorCaseload — invite via composer", () => {
  test("opens the composer and fires the bulk invite with messageHtml (no magic link)", async () => {
    renderWithProviders(<HonorCaseload />)

    // Select the fellow → the bulk bar appears (Send invitation email is on by default).
    fireEvent.click(await screen.findByRole("checkbox", { name: /select marcus reyes/i }))
    fireEvent.click(screen.getByRole("button", { name: /send invitations to 1 selected/i }))

    // Composer opens instead of sending immediately.
    const dialog = await screen.findByRole("dialog", { name: /compose invitation message/i })
    fireEvent.click(within(dialog).getByRole("button", { name: /send invitation/i }))

    await waitFor(() => expect(inviteFellowsBulk).toHaveBeenCalledTimes(1))
    const [ids, keepAccess, sendInvitation, messageHtml] = inviteFellowsBulk.mock.calls[0]
    expect(ids).toEqual(["2201"])
    expect(keepAccess).toBe(true) // inviting must keep the coach's roster link
    expect(sendInvitation).toBe(true)
    expect(messageHtml).toContain("Congratulations")

    // The backend now owns the confirmation email — the FE must not send a magic link.
    expect(requestMagicLink).not.toHaveBeenCalled()
  })

  test("with the email unchecked, links fellows silently without opening the composer", async () => {
    renderWithProviders(<HonorCaseload />)
    fireEvent.click(await screen.findByRole("checkbox", { name: /select marcus reyes/i }))
    // Uncheck "Send invitation email".
    fireEvent.click(screen.getByRole("checkbox", { name: /send invitation email/i }))
    fireEvent.click(screen.getByRole("button", { name: /send invitations to 1 selected/i }))

    await waitFor(() => expect(inviteFellowsBulk).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const [ids, , sendInvitation] = inviteFellowsBulk.mock.calls[0]
    expect(ids).toEqual(["2201"])
    expect(sendInvitation).toBe(false)
  })
})

/* ── T3: per-fellow status control ── */
describe("HonorCaseload — status control", () => {
  test("changing the status dropdown calls setFellowStatus", async () => {
    renderWithProviders(<HonorCaseload />)
    const select = await screen.findByLabelText(/status for marcus reyes/i)
    fireEvent.change(select, { target: { value: "assessed" } })
    await waitFor(() => expect(setFellowStatus).toHaveBeenCalledWith("2201", "assessed"))
  })
})

/* ── T4: onboarding is not blocked when PRISM is omitted ── */
describe("runHonorOnboard — PRISM optional", () => {
  beforeEach(() => {
    createFellow.mockResolvedValue({ data: { id: "fellow-1" } })
    inviteFellow.mockResolvedValue({ data: { userId: "user-9" } })
    initiateUpload.mockResolvedValue({ document_id: "d1", upload_url: "u", upload_fields: {} })
    uploadToS3.mockResolvedValue(undefined)
    triggerProcessing.mockResolvedValue({ id: "d1" })
  })

  test("onboards a fellow with no PRISM file — no PRISM import, no block", async () => {
    const res = await runHonorOnboard({
      firstName: "Marcus",
      lastName: "Reyes",
      email: "marcus@honor.org",
      role: "Fellow",
      // no prismFile
    })

    expect(createFellow).toHaveBeenCalledTimes(1)
    expect(inviteFellow).toHaveBeenCalledWith("fellow-1", true, true)
    // PRISM import is skipped entirely when no file is provided.
    expect(importFellowAssessment).not.toHaveBeenCalled()
    // The onboard still succeeds (no failed steps for a missing optional PRISM).
    expect(res.steps.some((s) => s.step === "prism")).toBe(false)
    expect(res.steps.every((s) => s.ok)).toBe(true)
  })
})
