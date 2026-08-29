/**
 * User Management → Action → Activity.
 *
 * The assertions that matter are about what this dialog REFUSES to claim:
 *   - a failed read must not render as "no activity" (that would assert the
 *     account has never been used, which is a fabricated and alarming claim);
 *   - location must be shown as "Not recorded", never derived from the IP;
 *   - a legacy login row with no captured IP must say so, not show a blank that
 *     reads as an address.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { UserActivityDialog } from "../UserActivityDialog"
import { getUserActivity } from "@/services/audit/userActivity.service"

jest.mock("@/services/audit/userActivity.service", () => ({
  getUserActivity: jest.fn(),
}))
const mockGet = getUserActivity as jest.Mock

const USER = { id: "u1", name: "Ada Lovelace", email: "ada@example.com" }

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <UserActivityDialog open onOpenChange={() => {}} user={USER} />
    </QueryClientProvider>,
  )
}

beforeEach(() => jest.clearAllMocks())

it("shows the last sign-in date and IP", async () => {
  mockGet.mockResolvedValue({
    userId: "u1",
    lastLogin: { at: "2026-08-28T14:05:00Z", ipAddress: "203.0.113.10", userAgent: "Mozilla/5.0", action: "auth.user.login" },
    loginCount: 12,
    locationRecorded: false,
    activity: [],
  })
  renderDialog()
  expect(await screen.findByText("203.0.113.10")).toBeInTheDocument()
  expect(screen.getByText("12")).toBeInTheDocument()
})

it("shows location as Not recorded and never infers one from the IP", async () => {
  mockGet.mockResolvedValue({
    userId: "u1",
    lastLogin: { at: "2026-08-28T14:05:00Z", ipAddress: "203.0.113.10", userAgent: "UA", action: "auth.user.login" },
    loginCount: 1, locationRecorded: false, activity: [],
  })
  renderDialog()
  expect(await screen.findByText("Not recorded")).toBeInTheDocument()
  expect(screen.getByText(/no geographic lookup is performed/i)).toBeInTheDocument()
})

it("says the IP was not captured for a legacy login rather than showing a blank", async () => {
  mockGet.mockResolvedValue({
    userId: "u1",
    lastLogin: { at: "2026-01-01T00:00:00Z", ipAddress: null, userAgent: null, action: "login" },
    loginCount: 4, locationRecorded: false, activity: [],
  })
  renderDialog()
  expect(await screen.findByText(/not captured for this sign-in/i)).toBeInTheDocument()
})

it("distinguishes a real 'never signed in' from a failure", async () => {
  mockGet.mockResolvedValue({
    userId: "u1", lastLogin: null, loginCount: 0, locationRecorded: false, activity: [],
  })
  renderDialog()
  expect(await screen.findByText(/never signed in/i)).toBeInTheDocument()
})

it("on error, does NOT render as 'no activity'", async () => {
  // The load-bearing one. An empty state here would assert something false.
  mockGet.mockRejectedValue(new Error("403 Forbidden"))
  renderDialog()
  expect(await screen.findByText(/could not load activity/i)).toBeInTheDocument()
  expect(screen.getByText(/not a statement that the user has no activity/i)).toBeInTheDocument()
  await waitFor(() => {
    expect(screen.queryByText(/never signed in/i)).not.toBeInTheDocument()
  })
})

it("lists recent audited events", async () => {
  mockGet.mockResolvedValue({
    userId: "u1", lastLogin: null, loginCount: 0, locationRecorded: false,
    activity: [
      { id: "e1", at: "2026-08-28T10:00:00Z", action: "document.uploaded", description: "CV", ipAddress: "198.51.100.4" },
    ],
  })
  renderDialog()
  expect(await screen.findByText("document.uploaded")).toBeInTheDocument()
  expect(screen.getByText("198.51.100.4")).toBeInTheDocument()
})
