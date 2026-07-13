/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import NotificationBell from "@/components/layout/NotificationBell"
import type { NotificationItem } from "@/types/broadcast"

// Render Radix primitives inline so content is always in the DOM for assertions.
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}))

const mockUnread = jest.fn()
const mockList = jest.fn()
jest.mock("@/hooks/useNotificationInbox", () => ({
  useUnreadCount: () => mockUnread(),
  useNotifications: () => mockList(),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn() }),
}))

const notif = (over: Partial<NotificationItem>): NotificationItem => ({
  id: "n1",
  broadcast_id: "b1",
  severity: "warning",
  title: "Scheduled maintenance",
  html_body: "<p>x</p>",
  created_at: new Date().toISOString(),
  read_at: null,
  dismissed_at: null,
  ...over,
})

describe("NotificationBell", () => {
  test("shows an unread badge when there are unread notifications", () => {
    mockUnread.mockReturnValue({ data: 3 })
    mockList.mockReturnValue({ data: [notif({})], isLoading: false })
    render(<NotificationBell />)
    expect(screen.getByLabelText("Notifications (3 unread)")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  test("renders the notification title in the dropdown", () => {
    mockUnread.mockReturnValue({ data: 1 })
    mockList.mockReturnValue({ data: [notif({ title: "New policy" })], isLoading: false })
    render(<NotificationBell />)
    expect(screen.getByText("New policy")).toBeInTheDocument()
  })

  test("shows the empty state and no badge when nothing is unread", () => {
    mockUnread.mockReturnValue({ data: 0 })
    mockList.mockReturnValue({ data: [], isLoading: false })
    render(<NotificationBell />)
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument()
  })
})
