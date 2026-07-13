/**
 * @jest-environment jsdom
 *
 * Coach roster — invite co-access toggle + bulk invite flow.
 *
 * The roster query runs against the in-memory mock roster (USE_GRANT_MOCKS
 * forced on), while the invite/bulk-invite mutation hooks are replaced with
 * jest spies so we can assert exactly what the page passes through.
 */

import { render, screen, fireEvent, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { BulkInviteResult } from "@/types/grant/coach"

/* ── Mocks ── */
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

const inviteMock = jest.fn()
const bulkMock = jest.fn()

jest.mock("@/hooks/grant/useCoachRoster", () => {
  const actual = jest.requireActual("@/hooks/grant/useCoachRoster")
  return {
    ...actual,
    useInviteStudent: () => ({ mutate: inviteMock, isPending: false }),
    useBulkInviteStudents: () => ({ mutate: bulkMock, isPending: false }),
  }
})

import RosterPage from "../RosterPage"

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RosterPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  inviteMock.mockReset()
  bulkMock.mockReset()
})

describe("Single invite — co-access toggle", () => {
  test("toggle defaults ON and passes keepCoachAccess through the mutation", async () => {
    renderPage()
    await screen.findByText("Maria Gonzalez")

    // Open the invite dialog for Maria (row invite action).
    const mariaRow = screen.getByText("Maria Gonzalez").closest("tr") as HTMLElement
    fireEvent.click(within(mariaRow).getByRole("button", { name: /^Invite$/i }))

    // Toggle is present and defaults ON.
    const toggle = screen.getByRole("switch", {
      name: /Keep co-access after they claim their account/i,
    })
    expect(toggle).toHaveAttribute("data-state", "checked")

    fireEvent.click(screen.getByRole("button", { name: /^Send invitation$/i }))

    expect(inviteMock).toHaveBeenCalledTimes(1)
    expect(inviteMock).toHaveBeenCalledWith(
      { id: "stu-1", keepCoachAccess: true },
      expect.anything()
    )
  })

  test("turning the toggle off passes keepCoachAccess=false", async () => {
    renderPage()
    await screen.findByText("Maria Gonzalez")

    const mariaRow = screen.getByText("Maria Gonzalez").closest("tr") as HTMLElement
    fireEvent.click(within(mariaRow).getByRole("button", { name: /^Invite$/i }))
    fireEvent.click(
      screen.getByRole("switch", { name: /Keep co-access after they claim their account/i })
    )
    fireEvent.click(screen.getByRole("button", { name: /^Send invitation$/i }))

    expect(inviteMock).toHaveBeenCalledWith(
      { id: "stu-1", keepCoachAccess: false },
      expect.anything()
    )
  })
})

describe("Bulk invite", () => {
  test("selecting rows + confirming calls inviteCoachStudentsBulk and renders the report", async () => {
    // Have the mocked mutation invoke onSuccess with a plausible result.
    const result: BulkInviteResult = {
      converted: 2,
      skipped: 0,
      errors: 0,
      results: [
        { studentId: "stu-1", status: "invited", message: "Invitation sent" },
        { studentId: "stu-3", status: "linked", message: "Already linked" },
      ],
    }
    bulkMock.mockImplementation(
      (_vars: unknown, opts: { onSuccess?: (r: BulkInviteResult) => void }) =>
        opts?.onSuccess?.(result)
    )

    renderPage()
    await screen.findByText("Maria Gonzalez")

    // Select Maria (stu-1) and Aisha (stu-3) — both have emails.
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Maria Gonzalez/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Aisha Patel/i }))

    // Bulk button reflects the count and is enabled.
    const bulkBtn = screen.getByRole("button", { name: /Invite selected to IG \(2\)/i })
    expect(bulkBtn).toBeEnabled()
    fireEvent.click(bulkBtn)

    // Confirm dialog → send.
    fireEvent.click(screen.getByRole("button", { name: /Send 2 invitations/i }))

    expect(bulkMock).toHaveBeenCalledTimes(1)
    expect(bulkMock).toHaveBeenCalledWith(
      { studentIds: ["stu-1", "stu-3"], keepCoachAccess: true },
      expect.anything()
    )

    // Result report renders with counts + per-row statuses.
    expect(await screen.findByText("Bulk invite results")).toBeInTheDocument()
    const report = screen.getByRole("dialog")
    expect(within(report).getByText("Converted")).toBeInTheDocument()
    expect(within(report).getByText("invited")).toBeInTheDocument()
    expect(within(report).getByText("linked")).toBeInTheDocument()
  })

  test("bulk button is disabled when a selected row lacks an email", async () => {
    renderPage()
    await screen.findByText("Devon Carter")

    // Devon Carter (stu-2) has no email on file.
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Devon Carter/i }))

    const bulkBtn = screen.getByRole("button", { name: /Invite selected to IG \(1\)/i })
    expect(bulkBtn).toBeDisabled()
    expect(bulkBtn).toHaveAttribute(
      "title",
      expect.stringMatching(/every selected student needs an email/i)
    )
  })
})
