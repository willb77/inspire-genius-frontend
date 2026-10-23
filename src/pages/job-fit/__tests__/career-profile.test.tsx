/**
 * @jest-environment jsdom
 *
 * N-8 — the candidate's Career Pathways Profile page and its one entry point.
 * Off (or on any error), the page says so and calls nothing else, and the link
 * on Career Pathways renders nothing. On, the candidate ticks sections, saves,
 * approves, and shares only to a listed recipient after the server's consent
 * text, and sees every open and refusal.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { Draft, RecipientList, Share, Snapshot } from "@/types/careerPathways"

const svc = {
  getCareerPathwaysStatus: jest.fn(),
  getDraft: jest.fn(),
  listSnapshots: jest.fn(),
  listShares: jest.fn(),
  listRecipients: jest.fn(),
  createSnapshot: jest.fn(),
  approveSnapshot: jest.fn(),
  downloadSnapshot: jest.fn(),
  createShare: jest.fn(),
  revokeShare: jest.fn(),
}
jest.mock("@/services/career-pathways/careerPathways.service", () => ({
  getCareerPathwaysStatus: () => svc.getCareerPathwaysStatus(),
  getDraft: () => svc.getDraft(),
  listSnapshots: () => svc.listSnapshots(),
  listShares: () => svc.listShares(),
  listRecipients: () => svc.listRecipients(),
  createSnapshot: (b: unknown) => svc.createSnapshot(b),
  approveSnapshot: (id: unknown) => svc.approveSnapshot(id),
  downloadSnapshot: (id: unknown, f: unknown) => svc.downloadSnapshot(id, f),
  createShare: (b: unknown) => svc.createShare(b),
  revokeShare: (id: unknown) => svc.revokeShare(id),
}))

import CareerProfilePage from "../CareerProfilePage"
import { CareerProfileLink } from "../CareerProfileLink"

const DRAFT: Draft = {
  profile: {
    sections: {
      identity: { available: true, name: "Casey Candidate" },
      prism: { available: false, reason: "No PRISM profile is on file for you yet." },
      fit: { available: true, roles: [], validatedRoles: 0, note: "No role you can see has a validated benchmark yet." },
      pathway: { available: true, suggestions: [], skillLadders: [], note: "No suggested roles yet." },
      goals: { available: true, goals: [{ goalId: "g1", title: "Lead a team" }] },
      practice: { available: true, sessions: 0, latestAt: null, latestBand: null, byGoal: [], note: "Practice only." },
    },
  },
  sectionOrder: ["identity", "prism", "fit", "pathway", "goals", "practice"],
  defaultSections: ["identity", "prism", "fit", "pathway", "practice"],
  consent: { version: "cpp-v", text: "SERVER CONSENT WORDS" },
}

const APPROVED: Snapshot = {
  id: "s1", sections: ["identity", "fit"], approvedAt: "2026-10-23T01:00:00Z", createdAt: "2026-10-23T00:00:00Z",
  content: { sections: { identity: { available: true, name: "Casey Candidate" },
    fit: { available: true, roles: [], validatedRoles: 0, note: "No role you can see has a validated benchmark yet." } } },
}
const UNAPPROVED: Snapshot = { ...APPROVED, id: "s2", approvedAt: null }

const RECIPIENTS: RecipientList = {
  recipients: [{ id: "r-test", organisation: "Example Programme", contactName: "Rita", isTest: true }],
  externalSharing: false,
  consent: { version: "cpp-v", text: "SERVER CONSENT WORDS" },
  limits: { defaultDays: 14, maxDays: 30, defaultOpens: 10, maxOpens: 10 },
}

const SHARE: Share = {
  id: "sh1", snapshotId: "s1", recipient: { organisation: "Example Programme", contactName: "Rita" },
  createdAt: "2026-10-23T00:00:00Z", expiresAt: "2026-11-06T00:00:00Z", maxOpens: 10, opens: 1,
  allowDownload: false, consentVersion: "cpp-v", revokedAt: null, status: "live",
  accessLog: [{ outcome: "opened", at: "2026-10-23T02:00:00Z" }, { outcome: "bad_code", at: "2026-10-23T01:59:00Z" }],
}

function renderIt(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  svc.getDraft.mockResolvedValue(DRAFT)
  svc.listSnapshots.mockResolvedValue([APPROVED, UNAPPROVED])
  svc.listShares.mockResolvedValue([SHARE])
  svc.listRecipients.mockResolvedValue(RECIPIENTS)
})

describe("off", () => {
  test("the page says so and calls nothing else", async () => {
    svc.getCareerPathwaysStatus.mockResolvedValue({ enabled: false, externalSharing: false })
    renderIt(<CareerProfilePage />)
    expect(await screen.findByText(/not available for you yet/i)).toBeInTheDocument()
    expect(svc.getDraft).not.toHaveBeenCalled()
    expect(svc.listSnapshots).not.toHaveBeenCalled()
    expect(svc.listShares).not.toHaveBeenCalled()
  })

  test("the Pathway link renders nothing", async () => {
    svc.getCareerPathwaysStatus.mockResolvedValue({ enabled: false, externalSharing: false })
    const { container } = renderIt(<CareerProfileLink />)
    await waitFor(() => expect(svc.getCareerPathwaysStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})

describe("on", () => {
  beforeEach(() => svc.getCareerPathwaysStatus.mockResolvedValue({ enabled: true, externalSharing: false }))

  test("the Pathway link points at the profile", async () => {
    renderIt(<CareerProfileLink />)
    const link = await screen.findByRole("link", { name: /Career Pathways Profile/ })
    expect(link).toHaveAttribute("href", "/vertical/job-fit/profile")
  })

  test("saves only the ticked sections and chosen goals", async () => {
    svc.createSnapshot.mockResolvedValue(APPROVED)
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByLabelText("PRISM highlights"))
    await userEvent.click(screen.getByLabelText("Goals you choose"))
    await userEvent.click(screen.getByLabelText("Lead a team"))
    await userEvent.click(screen.getByRole("button", { name: "Save this profile" }))
    await waitFor(() => expect(svc.createSnapshot).toHaveBeenCalled())
    expect(svc.createSnapshot).toHaveBeenCalledWith({
      sections: ["identity", "fit", "pathway", "practice", "goals"],
      goalIds: ["g1"],
      includeEmail: false,
    })
  })

  test("a save failure is shown, not swallowed", async () => {
    svc.createSnapshot.mockRejectedValue({ response: { data: { detail: "The Career Pathways Profile is not enabled for you." } } })
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByRole("button", { name: "Save this profile" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("not enabled for you")
  })

  test("an unapproved copy can be approved, not shared", async () => {
    svc.approveSnapshot.mockResolvedValue(UNAPPROVED)
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByRole("button", { name: "Approve this copy" }))
    await waitFor(() => expect(svc.approveSnapshot).toHaveBeenCalledWith("s2"))
  })

  test("sharing needs a listed recipient and agreement to the server's consent text", async () => {
    svc.createShare.mockResolvedValue(SHARE)
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByRole("button", { name: "Share" }))
    const form = await screen.findByTestId("share-form")
    expect(within(form).getByTestId("consent-text")).toHaveTextContent("SERVER CONSENT WORDS")
    const share = within(form).getByRole("button", { name: "Share" })
    expect(share).toBeDisabled()
    await userEvent.selectOptions(within(form).getByRole("combobox"), "r-test")
    expect(share).toBeDisabled()
    await userEvent.click(within(form).getByLabelText("I agree"))
    expect(share).toBeEnabled()
    await userEvent.click(share)
    await waitFor(() => expect(svc.createShare).toHaveBeenCalled())
    expect(svc.createShare).toHaveBeenCalledWith({
      snapshotId: "s1", recipientId: "r-test", consentVersion: "cpp-v", consentAccepted: true,
      expiresInDays: 14, maxOpens: 10, allowDownload: false,
    })
  })

  test("no recipient is listed while there is nobody to share with", async () => {
    svc.listRecipients.mockResolvedValue({ ...RECIPIENTS, recipients: [] })
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByRole("button", { name: "Share" }))
    expect(await screen.findByText(/nobody you can share with/i)).toBeInTheDocument()
  })

  test("every open and refusal is listed, and a live share can be withdrawn", async () => {
    svc.revokeShare.mockResolvedValue({ ...SHARE, status: "revoked" })
    renderIt(<CareerProfilePage />)
    const row = await screen.findByTestId("share-row")
    expect(row).toHaveTextContent("Opened")
    expect(row).toHaveTextContent("Wrong code")
    expect(row).toHaveTextContent("1 of 10 opens")
    await userEvent.click(within(row).getByRole("button", { name: "Withdraw" }))
    await waitFor(() => expect(svc.revokeShare).toHaveBeenCalledWith("sh1"))
  })

  test("the honest empty fit state is visible in the preview", async () => {
    renderIt(<CareerProfilePage />)
    await userEvent.click(await screen.findByText("Preview everything available"))
    expect(screen.getByTestId("fit-empty")).toHaveTextContent("validated benchmark")
    expect(screen.getByText("No PRISM profile is on file for you yet.")).toBeInTheDocument()
  })

  test("a download opens the file the server made", async () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null)
    svc.downloadSnapshot.mockResolvedValue({ downloadUrl: "https://files.example.test/p.pdf" })
    renderIt(<CareerProfilePage />)
    await userEvent.click((await screen.findAllByRole("button", { name: "PDF" }))[0])
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://files.example.test/p.pdf", "_blank", "noopener"))
    expect(svc.downloadSnapshot).toHaveBeenCalledWith("s1", "pdf")
    open.mockRestore()
  })
})
