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

describe("the IP fallback found in the browser, not by a test", () => {
  /* The legacy bare `login` action records no IP (dev: 127 rows, 0 addresses)
   * while `auth.user.login` always does (349 of 349). `lastLogin` takes the
   * newest row across both spellings, so a user whose most recent sign-in
   * landed under the legacy name was shown "not captured" while their address
   * sat in the log minutes earlier — 8 of the 40 users with login history. */

  it("shows the address we hold, and says which sign-in it belongs to", async () => {
    mockGet.mockResolvedValue({
      userId: "u1",
      lastLogin: { at: "2026-08-25T18:29:00Z", ipAddress: null, userAgent: null, action: "login" },
      lastKnownIp: { ipAddress: "203.0.113.10", at: "2026-08-25T18:25:00Z" },
      loginCount: 24,
      locationRecorded: false,
      activity: [],
    })
    renderDialog()
    expect(await screen.findByText("203.0.113.10")).toBeInTheDocument()
    // It must still be clear the LATEST sign-in had no address of its own —
    // attributing an older IP to it would be a worse bug than showing none.
    expect(screen.getByText(/Not captured for this sign-in/i)).toBeInTheDocument()
    expect(screen.getByText(/most recent recorded address/i)).toBeInTheDocument()
  })

  it("says nothing extra when there is no address anywhere", async () => {
    mockGet.mockResolvedValue({
      userId: "u1",
      lastLogin: { at: "2026-08-25T18:29:00Z", ipAddress: null, userAgent: null, action: "login" },
      lastKnownIp: null,
      loginCount: 2,
      locationRecorded: false,
      activity: [],
    })
    renderDialog()
    expect(await screen.findByText(/Not captured for this sign-in/i)).toBeInTheDocument()
    expect(screen.queryByText(/most recent recorded address/i)).not.toBeInTheDocument()
  })

  it("does not show the same address twice when the latest sign-in has one", async () => {
    mockGet.mockResolvedValue({
      userId: "u1",
      lastLogin: {
        at: "2026-08-25T18:29:00Z", ipAddress: "203.0.113.99",
        userAgent: null, action: "auth.user.login",
      },
      lastKnownIp: null,
      loginCount: 5,
      locationRecorded: false,
      activity: [],
    })
    renderDialog()
    expect(await screen.findByText("203.0.113.99")).toBeInTheDocument()
    expect(screen.queryByText(/most recent recorded address/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Not captured for this sign-in/i)).not.toBeInTheDocument()
  })
})
