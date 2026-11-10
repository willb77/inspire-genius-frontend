/**
 * @jest-environment jsdom
 *
 * `/events` is a stub: heading, honest empty state, a link back to /join, and
 * NO network call of any kind (fetch or XHR, which is what axios uses here).
 */
import { render, screen } from "@testing-library/react"
import EventsPage from "../EventsPage"

describe("/events stub", () => {
  let fetchMock: jest.Mock
  let xhrOpen: jest.SpyInstance
  const realFetch = globalThis.fetch

  beforeEach(() => {
    fetchMock = jest.fn().mockRejectedValue(new Error("/events must not fetch"))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    xhrOpen = jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {
      throw new Error("/events must not make an XHR request")
    })
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    xhrOpen.mockRestore()
  })

  it("renders the heading, the empty state and a link back to /join", () => {
    render(<EventsPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Upcoming events" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "No events are scheduled yet. Register your interest and tick the webinar box to hear when the next one is announced.",
    )
    expect(screen.getByRole("link", { name: /register your interest/i })).toHaveAttribute("href", "/join")
  })

  it("makes no network request", async () => {
    render(<EventsPage />)
    // Let any effect or microtask that would start a request run first.
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(xhrOpen).not.toHaveBeenCalled()
  })
})
