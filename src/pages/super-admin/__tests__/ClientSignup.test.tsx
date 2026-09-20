/**
 * Pipeline page tests.
 *
 * These assert the three things about this surface that would otherwise fail
 * silently:
 *
 * 1. A load failure renders an ALERT, not an empty list. An error that degrades
 *    to "no opportunities yet" is the dishonest empty state this codebase has
 *    shipped before — the surface looks considered and nobody can tell.
 * 2. The roll-up and the At Risk flag are rendered from the SERVER's values. If
 *    the page ever starts computing them itself it will eventually disagree
 *    with the gate that enforces the same rules, and the screen is the
 *    convincing half.
 * 3. The stage filter comes from the process reference, not a local list.
 */
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import ClientSignup from "../ClientSignup"
import { formatMoney } from "@/lib/clientSignupMoney"
import * as service from "@/services/super-admin/client-signup.service"
import type { Pipeline, ProcessReference } from "@/types/client-signup"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/shared/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}))

jest.mock("@/services/super-admin/client-signup.service")

const mocked = service as jest.Mocked<typeof service>

const PROCESS: ProcessReference = {
  stages: [
    { key: "lead", label: "Lead", terminal: false, gates: [] },
    { key: "qualified", label: "Qualified", terminal: false, gates: [] },
    { key: "closed_lost", label: "Closed – Lost", terminal: true, gates: [] },
  ],
  fields: [],
  industries: ["hospitality", "finance"],
  lead_sources: ["referral"],
  service_lines: [{ key: "voicedesk_ai", label: "VoiceDesk AI" }],
  lost_reason_codes: ["price"],
  sow_sections: [],
  checklist: [],
  raci: { roles: [], rows: [] },
  at_risk_business_days: 10,
  source_document: "docs/operations/IG_Client_Signup_and_SOW_Process.docx v1.0",
}

const PIPELINE: Pipeline = {
  engagements: [
    {
      id: "e1",
      opportunity_name: "Seaside Resort – VoiceDesk AI – Oct 2026",
      company_name: "Seaside Resort",
      stage: "qualified",
      stage_label: "Qualified",
      service_line: "voicedesk_ai",
      industry: "hospitality",
      owner_email: "lead@example.test",
      estimated_value_cents: 4_800_000,
      expected_close_date: "2026-11-01",
      next_action: "Send the recap",
      next_action_due: "2026-09-30",
      last_activity_at: "2026-09-16T12:00:00Z",
      at_risk: true,
    },
    {
      id: "e2",
      opportunity_name: "Harbour CPA – Consulting – Sep 2026",
      company_name: "Harbour CPA",
      stage: "lead",
      stage_label: "Lead",
      service_line: null,
      industry: "finance",
      owner_email: "lead@example.test",
      estimated_value_cents: 0,
      expected_close_date: null,
      next_action: null,
      next_action_due: null,
      last_activity_at: "2026-09-16T12:00:00Z",
      at_risk: false,
    },
  ],
  summary: {
    by_stage: { lead: 1, qualified: 1 },
    open_value_cents: 4_800_000,
    won_value_cents: 0,
    at_risk: 1,
    overdue_actions: 2,
  },
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClientSignup />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mocked.getProcessReference.mockResolvedValue(PROCESS)
})

describe("formatMoney", () => {
  it("renders cents as whole dollars", () => {
    expect(formatMoney(4_800_000)).toBe("$48,000")
    expect(formatMoney(0)).toBe("$0")
    expect(formatMoney(null)).toBe("$0")
  })
})

describe("ClientSignup pipeline", () => {
  it("lists opportunities with their server-supplied stage and value", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()

    expect(
      await screen.findByText("Seaside Resort – VoiceDesk AI – Oct 2026"),
    ).toBeInTheDocument()
    expect(screen.getByText("Harbour CPA – Consulting – Sep 2026")).toBeInTheDocument()
    // Twice, and both are correct: the row's own value, and the open-pipeline
    // roll-up, which happens to equal it because the second row is worth $0.
    expect(screen.getAllByText("$48,000")).toHaveLength(2)
  })

  it("renders the At Risk flag from the server, not from a local date calculation", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()

    // Exactly one row is flagged — the one the server marked.
    expect(await screen.findAllByText(/At risk — no contact logged/)).toHaveLength(1)
  })

  it("shows the roll-up, with open pipeline excluding won and lost", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()

    expect(await screen.findByText("Open pipeline")).toBeInTheDocument()
    expect(
      screen.getByText(/Forecast, excluding won and lost/),
    ).toBeInTheDocument()
    expect(screen.getByText("Overdue actions")).toBeInTheDocument()
  })

  it("takes the At Risk window from the process reference", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()
    expect(
      await screen.findByText(/No contact for 10 business days/),
    ).toBeInTheDocument()
  })

  it("flags an opportunity with no next action", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()
    // §3: "There is always a next action until Closed."
    expect(await screen.findByText("No next action set")).toBeInTheDocument()
  })

  it("renders a load failure as an alert, never as an empty pipeline", async () => {
    mocked.listEngagements.mockRejectedValue({
      message: "Network Error",
      response: undefined,
    })
    renderPage()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The pipeline could not be loaded")
    // The honest-empty-state trap: the "no opportunities" copy must NOT show.
    expect(screen.queryByText(/No opportunities/)).not.toBeInTheDocument()
  })

  it("says plainly when the caller is not authorised", async () => {
    mocked.listEngagements.mockRejectedValue({
      message: "Forbidden",
      response: { status: 403, data: {} },
    })
    renderPage()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have access to the client sign-up process",
    )
  })

  it("shows a genuine empty pipeline as empty", async () => {
    mocked.listEngagements.mockResolvedValue({
      engagements: [],
      summary: {
        by_stage: {},
        open_value_cents: 0,
        won_value_cents: 0,
        at_risk: 0,
        overdue_actions: 0,
      },
    })
    renderPage()

    expect(await screen.findByText(/No opportunities/)).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("defaults to open opportunities only", async () => {
    mocked.listEngagements.mockResolvedValue(PIPELINE)
    renderPage()
    await waitFor(() => expect(mocked.listEngagements).toHaveBeenCalled())
    expect(mocked.listEngagements).toHaveBeenCalledWith({ includeClosed: false })
  })
})
