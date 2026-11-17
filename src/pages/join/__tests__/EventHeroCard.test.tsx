/**
 * @jest-environment jsdom
 *
 * The `/events` hero card and its session picker (R4, "A go EventReg page rebuild",
 * 2026-11-17), through the real page, hook and services; only the network (an adapter
 * on `publicIntakeClient`) and the Turnstile widget are faked.
 */
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { readFileSync } from "fs"
import { join } from "path"
import EventsPage from "../EventsPage"
import { groupSessions, sessionDay, sessionLocalTime, viewerZoneAbbreviation } from "../eventSessions"
import { parsePublicEvents } from "@/services/intake/publicEvents.service"
import { publicIntakeClient } from "@/services/intake/publicIntake.service"
import { EVENT_OPTIONS_PATH } from "@/services/intake/eventRegistration.service"

jest.mock("@/components/shared/TurnstileWidget", () => ({
  TurnstileWidget: () => <div>check</div>,
}))

const TITLE = "Intro to PRISM"
const S1 = "2099-03-03T14:00:00Z" // 6:00 AM PST Tue Mar 3 ; 9:00 AM EST
const S2 = "2099-03-04T14:00:00Z"
const S3 = "2099-03-05T18:30:00Z"
// An event zone the viewer is very unlikely to share (Bill is in New York, CI is UTC), so a
// time shown in the wrong zone cannot pass by coincidence.
const REF_ZONE = "Pacific/Auckland"
const ref = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: REF_ZONE, hour: "numeric", minute: "2-digit", timeZoneName: "short" })
const ev = (starts_at: string, extra: Record<string, unknown> = {}, title = TITLE) => ({
  title,
  starts_at,
  time_zone: REF_ZONE,
  description: null,
  ...extra,
})
const opt = (id: string, starts_at: string, full = false, title = TITLE) => ({
  id,
  title,
  starts_at,
  time_zone: REF_ZONE,
  full,
})

type Reply = { status: number | "network"; data?: unknown }
function network(events: unknown[], options: Reply = { status: 404, data: { detail: "Not Found" } }) {
  publicIntakeClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const r: Reply = config.url === EVENT_OPTIONS_PATH ? options : { status: 200, data: { events } }
    const response = { data: r.data, status: r.status, statusText: String(r.status), headers: {}, config } as AxiosResponse
    if (r.status === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config, {})
    if (r.status >= 200 && r.status < 300) return response
    throw new AxiosError(`status ${r.status}`, "ERR_BAD_RESPONSE", config, {}, response)
  }
}
const withOptions = (...o: unknown[]): Reply => ({ status: 200, data: { events: o } })

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <EventsPage />
    </QueryClientProvider>,
  )
}

const original = publicIntakeClient.defaults.adapter
const originalMatchMedia = window.matchMedia
afterEach(() => {
  publicIntakeClient.defaults.adapter = original
  window.matchMedia = originalMatchMedia
})

const tiles = () => within(screen.getByRole("radiogroup", { name: "Choose a session" })).getAllByRole("radio")

// The viewer is whatever zone this machine is in, so the expected strings are built here, with
// a different API (toLocale*String) from the one the component uses (Intl.DateTimeFormat). The
// helpers' own tests below fix the zone and pin exact strings.
const local = (iso: string) => ({
  day: new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
  time: new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  zone: (new Date(iso).toLocaleTimeString([], { timeZoneName: "short" }).split(" ").pop() ?? "") as string,
})
const radios = () => Array.from(document.querySelectorAll<HTMLInputElement>("input[type=radio]"))

describe("grouping and time helpers", () => {
  const now = Date.parse("2099-03-02T00:00:00Z")

  it("groups by EXACT title, earliest session first, and hides sessions that have started", () => {
    const events = [
      ev(S3),
      ev(S2),
      ev("2099-03-01T10:00:00Z"), // already started at `now`
      ev(S2, {}, "Other event"),
      ev(S1, {}, "intro to prism"), // different case: a different event, never merged
    ]
    const groups = groupSessions(events, now)
    // groups are ordered by their earliest session
    expect(groups.map((g) => g.title)).toEqual(["intro to prism", TITLE, "Other event"])
    expect(groups[1].sessions.map((s) => s.starts_at)).toEqual([S2, S3])
    expect(groups[0].sessions).toHaveLength(1)
    // a title with only past sessions has no group
    expect(groupSessions([ev("2099-03-01T10:00:00Z")], now)).toEqual([])
    // a session that starts exactly now has started
    expect(groupSessions([ev("2099-03-02T00:00:00Z")], now)).toEqual([])
  })

  it("formats in the viewer's zone, whatever the event's zone is", () => {
    expect(sessionDay(S1, "America/Los_Angeles")).toBe("Tue, Mar 3")
    expect(sessionLocalTime(S1, "America/Los_Angeles")).toBe("6:00 AM")
    expect(sessionLocalTime(S1, "Europe/London")).toBe("2:00 PM")
    // a late event crosses the date line for a viewer far east
    expect(sessionDay("2099-03-03T23:00:00Z", "Asia/Tokyo")).toBe("Wed, Mar 4")
    expect(viewerZoneAbbreviation(S1, "America/Los_Angeles")).toBe("PST")
  })

  it("an unknown viewer zone falls back instead of throwing", () => {
    expect(() => sessionLocalTime(S1, "Not/AZone")).not.toThrow()
    expect(viewerZoneAbbreviation(S1, "Not/AZone")).toEqual(expect.any(String))
  })
})

describe("the optional fields in the mapping", () => {
  it("keeps well-formed presentation fields and never invents any", () => {
    const [full, bare] = parsePublicEvents({
      events: [
        ev(S1, { presenter_name: " Ada ", presenter_role: "Founder", duration_minutes: 30, seats_left: 7 }),
        ev(S2),
      ],
    })
    expect(full).toMatchObject({ presenter_name: "Ada", presenter_role: "Founder", duration_minutes: 30, seats_left: 7 })
    expect(bare).not.toHaveProperty("presenter_name")
    expect(bare).not.toHaveProperty("duration_minutes")
    expect(bare).not.toHaveProperty("seats_left")
  })

  it("drops malformed values rather than guessing", () => {
    const [e] = parsePublicEvents({
      events: [ev(S1, { presenter_name: "  ", presenter_role: 5, duration_minutes: -3, seats_left: "many" })],
    })
    expect(e).not.toHaveProperty("presenter_name")
    expect(e).not.toHaveProperty("presenter_role")
    expect(e).not.toHaveProperty("duration_minutes")
    expect(e).not.toHaveProperty("seats_left")
    expect(parsePublicEvents({ events: [ev(S1, { duration_minutes: 2.5 })] })[0]).not.toHaveProperty("duration_minutes")
    expect(parsePublicEvents({ events: [ev(S1, { seats_left: 0 })] })[0].seats_left).toBe(0)
  })
})

describe("the card", () => {
  it("one card per title; each session is a radio tile in the viewer's time", async () => {
    network([ev(S1), ev(S2), ev(S3), ev(S1, {}, "Another event")])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2)
    const group = screen.getAllByRole("radiogroup")[0]
    const radios = within(group).getAllByRole("radio")
    expect(radios).toHaveLength(3)
    expect(radios[0].closest("div")).toHaveTextContent(local(S1).day)
    expect(radios[0].closest("div")).toHaveTextContent(local(S1).time) // the viewer's time, large
    expect(radios[0].closest("div")).toHaveTextContent(ref(S1)) // the event's own zone, small
    expect(screen.getAllByText(`Times shown in your time zone (${local(S1).zone})`).length).toBeGreaterThan(0)
  })

  it("selects the earliest session by default and says so in the call to action", async () => {
    network([ev(S3), ev(S1), ev(S2)], withOptions(opt("a", S1), opt("b", S2), opt("c", S3)))
    renderPage()
    const cta = await screen.findByRole("button", { name: /Save my seat/ })
    expect(cta.textContent).toBe(`Save my seat · ${local(S1).day}, ${local(S1).time}`)
    const radios = tiles()
    expect(radios.map((r) => (r as HTMLInputElement).checked)).toEqual([true, false, false])
  })

  it("choosing another tile updates the call to action", async () => {
    network([ev(S1), ev(S2), ev(S3)], withOptions(opt("a", S1), opt("b", S2), opt("c", S3)))
    renderPage()
    await screen.findByRole("button", { name: /Save my seat/ })
    await userEvent.click(tiles()[2])
    expect(screen.getByRole("button", { name: /Save my seat/ }).textContent).toBe(`Save my seat · ${local(S3).day}, ${local(S3).time}`)
    expect(tiles().map((r) => (r as HTMLInputElement).checked)).toEqual([false, false, true])
  })

  it("arrow keys move between the tiles and Tab reaches the Details pill then the call to action", async () => {
    network(
      [ev(S1, { description: "one" }), ev(S2, { description: "two" })],
      withOptions(opt("a", S1), opt("b", S2)),
    )
    renderPage()
    await screen.findByRole("button", { name: /Save my seat/ })
    const user = userEvent.setup()
    tiles()[0].focus()
    await user.keyboard("{ArrowDown}")
    expect(tiles()[1]).toHaveFocus()
    expect((tiles()[1] as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole("button", { name: /Save my seat/ })).toHaveTextContent(local(S2).day)
    await user.keyboard("{ArrowUp}")
    expect(tiles()[0]).toHaveFocus()
    await user.tab() // out of the radio group: the first Details pill
    expect(screen.getByRole("button", { name: new RegExp(`Details: ${local(S1).day}`) })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: new RegExp(`Details: ${local(S2).day}`) })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: /Save my seat/ })).toHaveFocus()
  })

  it("NEXT UP is on the earliest session only, once per card", async () => {
    network([ev(S3), ev(S2), ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.getAllByText("NEXT UP")).toHaveLength(1)
    expect(tiles()[0].closest("div")).toHaveTextContent("NEXT UP")
    expect(tiles()[1].closest("div")).not.toHaveTextContent("NEXT UP")
    expect(tiles()[2].closest("div")).not.toHaveTextContent("NEXT UP")
  })

  it("every tile carries the logo, LIVE DEMO at the top right and the heading text under the logo", async () => {
    network([ev(S1), ev(S2), ev(S3)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    const group = screen.getByRole("radiogroup", { name: "Choose a session" })
    for (const input of within(group).getAllByRole("radio")) {
      const label = document.querySelector(`label[for="${input.id}"]`) as HTMLElement
      // top row: the logo first, LIVE DEMO after it (the row puts it on the right)
      const top = label.firstElementChild as HTMLElement
      expect(top.firstElementChild).toHaveAttribute("src", "/Logo-Dark.png")
      expect(top.lastElementChild).toHaveTextContent("LIVE DEMO")
      // the heading text sits under the logo, in the owner's order
      const text = (label.textContent ?? "").replace(/\s+/g, " ")
      const order = [
        "LIVE DEMO",
        TITLE,
        "See your AI mentoring partner in action",
        "PRISM has never been this powerful",
        "PRISM meets InspiresGenius — an exclusive invitation for PRISM Practitioners to see the InspiresGenius AI platform in action.",
      ].map((t) => text.indexOf(t))
      expect(order.every((i) => i >= 0)).toBe(true)
      expect([...order].sort((x, y) => x - y)).toEqual(order)
    }
    expect(screen.getAllByText("See your AI mentoring partner in action")).toHaveLength(3)
    expect(screen.getAllByText("LIVE DEMO")).toHaveLength(3)
  })

  it("the radio's own name is the session, not the whole marketing text", async () => {
    network([ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(tiles()[0]).toHaveAccessibleName(`${local(S1).day}, ${local(S1).time}`)
  })

  it("the navy block is gone: no pills, no checklist, no free-access line, no light logo", async () => {
    network([ev(S1)], withOptions(opt("a", S1)))
    renderPage()
    await screen.findByRole("button", { name: /Save my seat/ })
    expect(screen.queryByRole("list", { name: "What you will see" })).not.toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Event type" })).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/Free 30-day access/)
    expect(document.body).not.toHaveTextContent(/Invite clients and follow their progress between sessions/)
    expect(screen.queryByText("FREE")).not.toBeInTheDocument()
    expect(document.querySelector('img[src="/Logo-Light.png"]:not(aside img)')).not.toBeNull() // the left wall's own logo only
    const region = screen.getByRole("region", { name: TITLE })
    expect(region.querySelector('img[src="/Logo-Light.png"]')).toBeNull()
  })

  it("the tiles are gray and raised (3D), through theme tokens that exist", () => {
    const card = readFileSync(join(__dirname, "..", "EventHeroCard.tsx"), "utf8")
    const css = readFileSync(join(__dirname, "..", "..", "..", "index.css"), "utf8")
    expect(card).toMatch(/from-event-tile-top/)
    expect(card).toMatch(/to-event-tile-bottom/)
    // the BASE class, not the "-selected" variant that merely contains it
    expect(card).toMatch(/(?<![-:\w])shadow-event-tile(?![-\w])/)
    expect(card).toMatch(/peer-checked:shadow-event-tile-selected/)
    for (const token of ["--color-event-tile-top", "--color-event-tile-bottom", "--shadow-event-tile:", "--shadow-event-tile-selected:"]) {
      expect(css).toContain(token)
    }
    // the removed navy block leaves no navy token behind in the card
    expect(card).not.toMatch(/event-navy/)
  })

  it("promises nothing the service does not do: no calendar invite line", async () => {
    network([ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(document.body).not.toHaveTextContent(/calendar invite/i)
  })
})

describe("the footer and the pills", () => {
  it("shows no seats segment when seats left is missing", async () => {
    network([ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/seats? left/)
  })

  it("shows seats left when the data has it, and says 'seat' for one", async () => {
    network([ev(S1, { seats_left: 7 }), ev(S2, { seats_left: 1 })])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.getByText("Free · 7 seats left")).toBeInTheDocument()
    await userEvent.click(tiles()[1])
    expect(screen.getByText("Free · 1 seat left")).toBeInTheDocument()
    expect(screen.queryByText("Free · 7 seats left")).not.toBeInTheDocument()
  })

  it("shows no duration pill: the navy block that held it is gone", async () => {
    network([ev(S1, { duration_minutes: 30 })])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(document.body).not.toHaveTextContent(/FREE · 30 MIN/)
    expect(document.body).not.toHaveTextContent(/\bMIN\b/)
  })

  it("every tile says who hosts it, bottom left, from the owner's fixed line", async () => {
    network([ev(S1), ev(S2), ev(S3)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    const hosts = screen.getAllByText(/^Hosted by/).map((e) => e.closest("p") as HTMLElement)
    expect(hosts).toHaveLength(3)
    for (const p of hosts) {
      expect(p.textContent).toBe("Hosted by Mark Tully, PRISM Practitioner")
      // bottom left of the tile, beside (not inside) the label, so a click on it still selects the tile
      expect(p.className).toMatch(/bottom-4/)
      expect(p.className).toMatch(/left-5/)
      expect(p.className).toMatch(/pointer-events-none/)
      expect(p.closest("label")).toBeNull()
    }
  })

  it("a session that names its own presenter shows that one, never the fixed host", async () => {
    network([
      ev(S1, { presenter_name: "Ada Lovelace", presenter_role: "Founder" }),
      ev(S2, { presenter_name: "Grace Hopper" }), // no role: no stray comma
      ev(S3),
    ])
    renderPage()
    await screen.findAllByRole("radiogroup")
    const texts = screen.getAllByText(/^Hosted by/).map((e) => e.closest("p")?.textContent)
    expect(texts).toEqual([
      "Hosted by Ada Lovelace, Founder",
      "Hosted by Grace Hopper",
      "Hosted by Mark Tully, PRISM Practitioner",
    ])
  })

  it("'Can't make it? Get notified' goes to the register-your-interest page", async () => {
    network([ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.getByRole("link", { name: "Can't make it? Get notified" })).toHaveAttribute("href", "/join")
  })
})

describe("Details", () => {
  it("opens that session's description without changing the selection", async () => {
    network([ev(S1, { description: "First **session**" }), ev(S2, { description: "Second session" })], withOptions(opt("a", S1), opt("b", S2)))
    renderPage()
    await screen.findByRole("button", { name: /Save my seat/ })
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Details: ${local(S2).day}`) }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Second session")
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content")
    expect(radios().map((r) => r.checked)).toEqual([true, false]) // unchanged
    expect(document.body).toHaveTextContent(`Save my seat · ${local(S1).day}`)
  })

  it("is a button beside its tile, never nested inside the label or another control", async () => {
    network([ev(S1, { description: "x" })])
    renderPage()
    await screen.findAllByRole("radiogroup")
    const pill = screen.getByRole("button", { name: /Details/ })
    expect(pill.closest("label")).toBeNull()
    expect(pill.closest("button, a, input")).toBe(pill)
    expect(pill.parentElement?.querySelector("input[type=radio]")).not.toBeNull()
  })

  it("has no pill for a session with no description (nothing to open)", async () => {
    network([ev(S1)])
    renderPage()
    await screen.findAllByRole("radiogroup")
    expect(screen.queryByRole("button", { name: /Details/ })).not.toBeInTheDocument()
  })

  it("opens as a bottom sheet below 640px", async () => {
    window.matchMedia = ((q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    network([ev(S1, { description: "Small screens" })])
    renderPage()
    await screen.findAllByRole("radiogroup")
    await userEvent.click(screen.getByRole("button", { name: /Details/ }))
    const sheet = await screen.findByRole("dialog")
    expect(sheet.getAttribute("data-slot")).toBe("sheet-content")
    expect(sheet).toHaveTextContent("Small screens")
  })
})

describe("the call to action", () => {
  it("opens the existing registration dialog for the SELECTED session's option", async () => {
    network([ev(S1), ev(S2)], withOptions(opt("a", S1), opt("b", S2)))
    renderPage()
    await screen.findByRole("button", { name: /Save my seat/ })
    await userEvent.click(tiles()[1])
    await userEvent.click(screen.getByRole("button", { name: /Save my seat/ }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Thursday, March 5, 2099") // the second session, in the event's own zone (NZ)
  })

  it("says a full session is full, and offers no button for it", async () => {
    network([ev(S1), ev(S2)], withOptions(opt("a", S1, true), opt("b", S2)))
    renderPage()
    expect(await screen.findByText("This session is full.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Save my seat/ })).not.toBeInTheDocument()
    expect(tiles()[0].closest("div")).toHaveTextContent("Full")
    await userEvent.click(tiles()[1])
    expect(screen.getByRole("button", { name: /Save my seat/ })).toBeInTheDocument()
    expect(screen.queryByText("This session is full.")).not.toBeInTheDocument()
  })

  it.each([
    ["switch off (404)", { status: 404, data: { detail: "Not Found" } } as Reply],
    ["a server error", { status: 500 } as Reply],
    ["a network failure", { status: "network" } as Reply],
    ["a malformed body", { status: 200, data: { nope: true } } as Reply],
    ["an option for a different event", withOptions(opt("z", S1, false, "Other"))],
  ])("with options %s: no registration button, a link to register interest, and no alert", async (_n, options) => {
    network([ev(S1)], options)
    renderPage()
    await screen.findAllByRole("radiogroup")
    // the card's own call to action (the left panel and the page's link back are links to /join as well)
    await waitFor(() =>
      expect(within(screen.getByRole("region", { name: TITLE })).getByRole("link", { name: "Register your interest" })).toHaveAttribute(
        "href",
        "/join",
      ),
    )
    expect(screen.queryByRole("button", { name: /Save my seat/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("the list around the card", () => {
  it("sessions that have started are hidden; a title with none left has no card", async () => {
    network([ev("2001-01-01T10:00:00Z"), ev("2001-01-02T10:00:00Z", {}, "Old only")])
    renderPage()
    expect(await screen.findByText("No upcoming events right now")).toHaveAttribute("role", "status")
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
  })

  it("asks for registration options only once a card is on screen", async () => {
    const urls: string[] = []
    network([])
    const inner = publicIntakeClient.defaults.adapter as (c: InternalAxiosRequestConfig) => Promise<AxiosResponse>
    publicIntakeClient.defaults.adapter = async (c: InternalAxiosRequestConfig) => {
      urls.push(c.url ?? "")
      return inner(c)
    }
    renderPage()
    await screen.findByText("No upcoming events right now")
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(urls).not.toContain(EVENT_OPTIONS_PATH)
  })

  it("never renders HTML from data", () => {
    for (const f of ["EventHeroCard.tsx", "EventsPage.tsx"]) {
      const src = readFileSync(join(__dirname, "..", f), "utf8")
      expect(src).not.toMatch(/dangerouslySetInnerHTML|innerHTML/)
    }
  })

  it("carries no hard-coded colour in the component", () => {
    const src = readFileSync(join(__dirname, "..", "EventHeroCard.tsx"), "utf8")
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
