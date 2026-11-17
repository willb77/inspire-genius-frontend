/**
 * @jest-environment jsdom
 *
 * `/events` — the public events list, through the real hook and service, with
 * only the network answered by an adapter on `publicIntakeClient`. Four
 * states, each distinct: list, [] , 404 (switch off → the old stub, unchanged)
 * and a network/server failure (role="alert").
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { readFileSync } from "fs"
import { join } from "path"
import EventsPage, { EVENTS_EMPTY_COPY, EVENTS_ERROR_COPY, EVENTS_NOT_OPEN_COPY } from "../EventsPage"
import { EVENTS_NEXT_STEP, JOIN_NEXT_STEP } from "../JoinBrandPanel"
import { publicIntakeClient } from "@/services/intake/publicIntake.service"

const STUB_COPY =
  "No events are scheduled yet. Register your interest and tick the webinar box to hear when the next one is announced."

let calls = 0
function answer(status: number | "network", data?: unknown) {
  publicIntakeClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls += 1
    if (status === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config, {})
    const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
    if (status >= 200 && status < 300) return response
    throw new AxiosError(`status ${status}`, "ERR_BAD_RESPONSE", config, {}, response)
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <EventsPage />
    </QueryClientProvider>,
  )
}

const wallOf = (container: HTMLElement) => (container.firstChild as HTMLElement).firstChild as HTMLElement

const original = publicIntakeClient.defaults.adapter
beforeEach(() => {
  calls = 0
})
afterEach(() => {
  publicIntakeClient.defaults.adapter = original
})

describe("/events — switch off (404, today's state on every tier)", () => {
  it("looks exactly like the stub: same heading, same copy, same link back to /join", async () => {
    answer(404, { detail: "Not Found" })
    renderPage()
    expect(screen.getByRole("heading", { level: 1, name: "Upcoming events" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(STUB_COPY))
    expect(EVENTS_NOT_OPEN_COPY).toBe(STUB_COPY)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Upcoming events" })).not.toBeInTheDocument()
    expect(screen.queryByText(EVENTS_EMPTY_COPY)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /register your interest/i })).toHaveAttribute("href", "/join")
  })

  it("does not retry a 404", async () => {
    answer(404, { detail: "Not Found" })
    renderPage()
    await screen.findByText(STUB_COPY)
    expect(calls).toBe(1)
  })
})

describe("/events — switch on", () => {
  it("[] → an honest 'No upcoming events right now'", async () => {
    answer(200, { events: [] })
    renderPage()
    expect(await screen.findByText(EVENTS_EMPTY_COPY)).toHaveAttribute("role", "status")
    expect(EVENTS_EMPTY_COPY).toBe("No upcoming events right now")
    expect(screen.queryByText(STUB_COPY)).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("lists each event as a card with its title, and its sessions' times in the event's own zone", async () => {
    answer(200, {
      events: [
        {
          title: "Intro to Inspires Genius",
          starts_at: "2099-03-03T14:00:00+00:00",
          time_zone: "America/New_York",
          description: "Line one\nLine two",
        },
        { title: "Second", starts_at: "2099-03-04T09:30:00+00:00", time_zone: "Europe/London", description: null },
      ],
    })
    renderPage()
    const list = await screen.findByRole("list", { name: "Upcoming events" })
    const cards = within(list).getAllByRole("region")
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveAccessibleName("Intro to Inspires Genius")
    // The small reference line is the EVENT's zone, whatever zone the runner or viewer is in:
    // 14:00 UTC is 9:00 AM in New York on that date (EST). The large time is the viewer's local
    // time and so depends on the runner's zone; it is pinned in EventHeroCard.test.tsx, which
    // picks an event zone no viewer shares.
    expect(within(cards[0]).getByText("9:00 AM EST")).toBeInTheDocument()
    expect(within(cards[1]).getByText("9:30 AM GMT")).toBeInTheDocument()
    // a description is behind Details; none, nothing to open
    expect(within(cards[0]).getByRole("button", { name: /^Details:/ })).toHaveTextContent("Details")
    expect(within(cards[1]).queryByRole("button", { name: /Details/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    // the page's own link back, plus each card's no-registration-offered link: all go to /join
    const links = screen.getAllByRole("link", { name: /register your interest/i })
    expect(links.length).toBeGreaterThanOrEqual(3)
    for (const l of links) expect(l).toHaveAttribute("href", "/join")
  })

  it("the card shows no teaser of a description; Details opens all of it", async () => {
    const long = `${"word ".repeat(80)}END`
    answer(200, {
      events: [{ title: "Long", starts_at: "2099-03-03T14:00:00Z", time_zone: "UTC", description: long }],
    })
    renderPage()
    const list = await screen.findByRole("list", { name: "Upcoming events" })
    expect(list).not.toHaveTextContent("word word")
    await userEvent.click(within(list).getByRole("button", { name: /Details/ }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Long" })).toBeInTheDocument()
    expect(dialog).toHaveTextContent("END")
  })

  it("the full description is Markdown: formatting yes, raw HTML no, unsafe links no", async () => {
    const md = [
      "**Bold** and *italic*",
      "",
      "- one",
      "- two",
      "",
      "[safe](https://ok.example) [bad](javascript:alert(1))",
      "",
      '<img src=x onerror="alert(1)"><script>window.x=1</script>',
    ].join("\n")
    answer(200, {
      events: [{ title: "<b>Bold?</b>", starts_at: "2099-03-03T14:00:00Z", time_zone: "UTC", description: md }],
    })
    const { container } = renderPage()
    const list = await screen.findByRole("list", { name: "Upcoming events" })
    expect(within(list).getByText("<b>Bold?</b>")).toBeInTheDocument()
    // nothing from the description is parsed on the card itself
    expect(list.querySelector("strong")).toBeNull()
    await userEvent.click(within(list).getByRole("button", { name: /Details/ }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog.querySelector("strong")).toHaveTextContent("Bold")
    expect(dialog.querySelector("em")).toHaveTextContent("italic")
    expect(dialog.querySelectorAll("li")).toHaveLength(2)
    expect(dialog.querySelector("img")).toBeNull()
    expect(dialog.querySelector("script")).toBeNull()
    expect(dialog.querySelector("b")).toBeNull()
    expect(dialog).toHaveTextContent('<img src=x onerror="alert(1)"><script>window.x=1</script>')
    expect(container.querySelector("img[src=x]")).toBeNull()
    expect(document.body.querySelector("img[src=x]")).toBeNull()
    const links = Array.from(dialog.querySelectorAll("a"))
    expect(links.find((a) => a.getAttribute("href") === "https://ok.example")).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener"),
    )
    expect(links.some((a) => /^javascript:/i.test(a.getAttribute("href") ?? ""))).toBe(false)
  })

  it("still renders a pre-editor plain-text description, line breaks kept, in Details", async () => {
    answer(200, {
      events: [{ title: "Old", starts_at: "2099-03-03T14:00:00Z", time_zone: "UTC", description: "Line one\nLine two" }],
    })
    renderPage()
    const list = await screen.findByRole("list", { name: "Upcoming events" })
    await userEvent.click(within(list).getByRole("button", { name: /Details/ }))
    expect(await screen.findByRole("dialog")).toHaveTextContent(/Line one\s*Line two/)
  })
})

describe("/events — failure", () => {
  it.each([500, 502])("%s → a visible alert, after one retry, not an empty list", async (status) => {
    answer(status, {})
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(EVENTS_ERROR_COPY)
    expect(calls).toBe(2)
    expect(screen.queryByText(EVENTS_EMPTY_COPY)).not.toBeInTheDocument()
    expect(screen.queryByText(STUB_COPY)).not.toBeInTheDocument()
  })

  it("a network failure → a visible alert", async () => {
    answer("network")
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(EVENTS_ERROR_COPY)
  })
})

describe("/events brand panel", () => {
  it("does not tell the visitor to tick a box that is not on this page", async () => {
    answer(404, { detail: "Not Found" })
    const { container } = renderPage()
    const wall = wallOf(container)
    expect(within(wall).getByText("What happens next")).toBeInTheDocument()
    expect(within(wall).getByText(EVENTS_NEXT_STEP)).toBeInTheDocument()
    expect(EVENTS_NEXT_STEP).toBe(
      "No account and nothing to install. Register your interest to hear when the next event is announced.",
    )
    expect(within(wall).queryByText(JOIN_NEXT_STEP)).not.toBeInTheDocument()
    expect(wall).not.toHaveTextContent(/Tick the first box/)
  })
})

describe("/events source guards", () => {
  it("never renders HTML from data", () => {
    const src = readFileSync(join(__dirname, "..", "EventsPage.tsx"), "utf8")
    expect(src).not.toMatch(/dangerouslySetInnerHTML/)
    expect(src).not.toMatch(/innerHTML/)
    const desc = readFileSync(join(__dirname, "..", "EventDescription.tsx"), "utf8")
    expect(desc).not.toMatch(/dangerouslySetInnerHTML|innerHTML|react-markdown|rehype/)
  })
})
