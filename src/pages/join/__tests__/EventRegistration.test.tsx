/**
 * @jest-environment jsdom
 *
 * Public event registration on `/events` (monorepo CSA 2026-11-16, R4), through the
 * real hooks and services; only the network (an adapter on `publicIntakeClient`) and
 * the Turnstile widget (a stub that hands over a token on click) are faked.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import type { ReactNode } from "react"
import EventsPage from "../EventsPage"
import { optionFor, splitName } from "../eventRegistration"
import { AuthContext } from "@/context/auth-context"
import { publicIntakeClient } from "@/services/intake/publicIntake.service"
import {
  fetchEventOptions,
  EVENT_OPTIONS_PATH,
  EVENT_REGISTRATIONS_PATH,
  classifyEventRegistrationError,
  parseEventOptions,
} from "@/services/intake/eventRegistration.service"

const resets: number[] = []
let turnstileUnavailable = false
jest.mock("@/components/shared/TurnstileWidget", () => ({
  TurnstileWidget: ({
    onToken,
    onUnavailable,
    resetKey = 0,
  }: {
    onToken: (t: string | null) => void
    onUnavailable: () => void
    resetKey?: number
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react")
    React.useEffect(() => {
      resets.push(resetKey)
      onToken(null)
      if (turnstileUnavailable) onUnavailable()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey])
    return (
      <button type="button" onClick={() => onToken("tok-" + resetKey)}>
        Solve the check
      </button>
    )
  },
}))

const START = "2030-01-15T15:00:00Z"
const LISTED = { title: "Intro to PRISM", starts_at: START, time_zone: "America/New_York", description: null }
const OPTION = { id: "11111111-1111-4111-8111-111111111111", title: "Intro to PRISM", starts_at: START, time_zone: "America/New_York", full: false }

type Reply = { status: number | "network"; data?: unknown }
const posts: { url?: string; body: Record<string, unknown> }[] = []
function network(opts: { options?: Reply; register?: Reply; events?: Reply }) {
  publicIntakeClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? ""
    let r: Reply
    if (url === EVENT_OPTIONS_PATH) r = opts.options ?? { status: 404, data: { detail: "Not Found" } }
    else if (url === EVENT_REGISTRATIONS_PATH) {
      posts.push({ url, body: JSON.parse(String(config.data)) })
      r = opts.register ?? { status: 200, data: { status: "received" } }
    } else r = opts.events ?? { status: 200, data: { events: [LISTED] } }
    if (r.status === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config, {})
    const response = { data: r.data, status: r.status, statusText: String(r.status), headers: {}, config } as AxiosResponse
    if (r.status >= 200 && r.status < 300) return response
    throw new AxiosError(`status ${r.status}`, "ERR_BAD_RESPONSE", config, {}, response)
  }
}

function renderPage(user: { id: string; email: string; fullName?: string } | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const wrap = (children: ReactNode) =>
    user ? (
      <AuthContext.Provider value={{ user } as never}>{children}</AuthContext.Provider>
    ) : (
      <>{children}</>
    )
  return render(<QueryClientProvider client={client}>{wrap(<EventsPage />)}</QueryClientProvider>)
}

const original = publicIntakeClient.defaults.adapter
beforeEach(() => {
  posts.length = 0
  resets.length = 0
  turnstileUnavailable = false
})
afterEach(() => {
  publicIntakeClient.defaults.adapter = original
})

async function fillManually(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText("First name"), "Ada")
  await u.type(screen.getByLabelText("Last name"), "Lovelace")
  await u.type(screen.getByLabelText("Email"), "ada@example.org")
  await u.selectOptions(screen.getByLabelText("Which best describes you?"), "practitioner")
  await u.selectOptions(screen.getByLabelText("Are you PRISM accredited?"), "yes")
  await u.selectOptions(screen.getByLabelText("Where would you use Inspires Genius?"), "individual")
  await u.type(screen.getByLabelText("State, province or region"), "England")
  await u.type(screen.getByLabelText("Country"), "UK")
}

describe("the Register button", () => {
  it("appears on a listed event that has an option, and a full one says so instead", async () => {
    network({ options: { status: 200, data: { events: [OPTION] } } })
    renderPage()
    expect(await screen.findByRole("button", { name: "Register for Intro to PRISM" })).toBeInTheDocument()
  })

  it("says the event is full and offers no button", async () => {
    network({ options: { status: 200, data: { events: [{ ...OPTION, full: true }] } } })
    renderPage()
    expect(await screen.findByText("This event is full.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Register for Intro to PRISM" })).not.toBeInTheDocument()
  })

  it.each([
    ["switch off (404)", { status: 404, data: { detail: "Not Found" } } as Reply],
    ["a server error", { status: 500 } as Reply],
    ["a network failure", { status: "network" } as Reply],
    ["a malformed body", { status: 200, data: { nope: true } } as Reply],
    ["an option for a different event", { status: 200, data: { events: [{ ...OPTION, title: "Other" }] } } as Reply],
  ])("offers nothing when the options are %s, and the list is unchanged", async (_n, options) => {
    network({ options })
    renderPage()
    expect(await screen.findByRole("heading", { name: "Intro to PRISM" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("list", { name: "Upcoming events" })).toBeInTheDocument())
    expect(screen.queryByRole("button", { name: "Register for Intro to PRISM" })).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("matches by title and instant, not by position", () => {
    expect(optionFor(LISTED, [OPTION])).toBe(OPTION)
    expect(optionFor(LISTED, [{ ...OPTION, starts_at: "2030-01-15T16:00:00Z" }])).toBeUndefined()
    expect(optionFor(LISTED, undefined)).toBeUndefined()
  })
})

describe("the registration dialog", () => {
  async function open(user: Parameters<typeof renderPage>[0] = null) {
    network({ options: { status: 200, data: { events: [OPTION] } }, ...overrides })
    renderPage(user)
    await userEvent.click(await screen.findByRole("button", { name: "Register for Intro to PRISM" }))
    return screen.getByRole("dialog")
  }
  let overrides: Parameters<typeof network>[0] = {}
  beforeEach(() => {
    overrides = {}
  })

  it("starts empty for a visitor who is not signed in", async () => {
    const dialog = await open()
    expect(within(dialog).getByLabelText("First name")).toHaveValue("")
    expect(within(dialog).getByLabelText("Email")).toHaveValue("")
    expect(within(dialog).queryByText(/Signed in as/)).not.toBeInTheDocument()
  })

  it("is filled from a signed-in account, and every value can be changed", async () => {
    const dialog = await open({ id: "u1", email: "grace@example.org", fullName: "Grace Brewster Hopper" })
    expect(within(dialog).getByText(/Signed in as grace@example.org/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Grace")
    expect(within(dialog).getByLabelText("Last name")).toHaveValue("Brewster Hopper")
    expect(within(dialog).getByLabelText("Email")).toHaveValue("grace@example.org")
    const email = within(dialog).getByLabelText("Email")
    await userEvent.clear(email)
    await userEvent.type(email, "other@example.org")
    expect(email).toHaveValue("other@example.org")
  })

  it("splits names sensibly", () => {
    expect(splitName("Ada Lovelace")).toEqual(["Ada", "Lovelace"])
    expect(splitName("Cher")).toEqual(["Cher", ""])
    expect(splitName("  ")).toEqual(["", ""])
    expect(splitName(null)).toEqual(["", ""])
  })

  it("cannot be submitted until the security check hands over a token", async () => {
    const dialog = await open()
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeEnabled()
  })

  it("a form submitted without a token (Enter key, a script) posts nothing", async () => {
    const u = userEvent.setup()
    const dialog = await open()
    await fillManually(u)
    fireEvent.submit(within(dialog).getByRole("form", { name: "Register for Intro to PRISM" }))
    // handleSubmit is async: give it time to (wrongly) post before asserting it did not.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(posts).toHaveLength(0)
    expect(within(dialog).queryByText("You're registered")).not.toBeInTheDocument()
  })

  it("sends the event, the token and the whole /join field set, and never a client_ip", async () => {
    const u = userEvent.setup()
    const dialog = await open()
    await fillManually(u)
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    await u.click(within(dialog).getByRole("button", { name: "Register for this event" }))
    expect(await screen.findByText("You're registered")).toBeInTheDocument()
    expect(posts).toHaveLength(1)
    const b = posts[0].body
    expect(b.webinar_id).toBe(OPTION.id)
    expect(b.turnstile_token).toBe("tok-0")
    expect(b).toMatchObject({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.org", role: "practitioner", prism_accredited: "yes", context: "individual", region: "England", country: "UK" })
    expect(b).not.toHaveProperty("client_ip")
    expect(Array.isArray(b.consents) && b.consents).toHaveLength(2)
  })

  it("validates before sending: a missing field posts nothing and keeps the token", async () => {
    const u = userEvent.setup()
    const dialog = await open()
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    await u.click(within(dialog).getByRole("button", { name: "Register for this event" }))
    expect(await within(dialog).findByText("First name is required")).toBeInTheDocument()
    expect(posts).toHaveLength(0)
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeEnabled()
  })

  it.each([
    [409, "Sorry, this event has just filled up."],
    [403, "The security check did not pass. Please try again."],
    [503, "The security check is unavailable right now. Please try again in a few minutes."],
    [429, "There have been too many submissions from your connection. Please try again later."],
    [500, "Something went wrong on our side. Please try again in a few minutes."],
  ])("a %i is shown plainly, and the spent token forces a fresh check", async (status, message) => {
    overrides = { register: { status } }
    const u = userEvent.setup()
    const dialog = await open()
    await fillManually(u)
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    const before = resets.length
    await u.click(within(dialog).getByRole("button", { name: "Register for this event" }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    await waitFor(() => expect(resets.length).toBeGreaterThan(before))
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeDisabled()
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeEnabled()
  })

  it("maps a server 422 onto the field and also resets the check", async () => {
    overrides = { register: { status: 422, data: { detail: [{ field: "email", message: "email is not valid" }] } } }
    const u = userEvent.setup()
    const dialog = await open()
    await fillManually(u)
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    await u.click(within(dialog).getByRole("button", { name: "Register for this event" }))
    expect(await within(dialog).findByText("email is not valid")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Register for this event" })).toBeDisabled()
  })

  it("a 404 on submit is the plain 'not open' notice", async () => {
    overrides = { register: { status: 404, data: { detail: "Not Found" } } }
    const u = userEvent.setup()
    const dialog = await open()
    await fillManually(u)
    await u.click(within(dialog).getByRole("button", { name: "Solve the check" }))
    await u.click(within(dialog).getByRole("button", { name: "Register for this event" }))
    expect(await within(dialog).findByText("Registration for events isn't open right now.")).toBeInTheDocument()
  })

  it("says registration is unavailable when the security check cannot load", async () => {
    turnstileUnavailable = true
    const dialog = await open()
    expect(await within(dialog).findByText("Registration is not available right now.")).toBeInTheDocument()
    expect(within(dialog).queryByLabelText("First name")).not.toBeInTheDocument()
  })

  it("the honeypot is hidden from assistive tech and empty by default", async () => {
    const dialog = await open()
    const hp = dialog.querySelector("#evreg-website") as HTMLInputElement
    expect(hp.closest("[aria-hidden='true']")).not.toBeNull()
    expect(hp.value).toBe("")
    expect(hp.tabIndex).toBe(-1)
    fireEvent.change(hp, { target: { value: "" } })
  })
})

describe("the service", () => {
  // Pins the swallow itself: the page ignores a thrown error too, so only a direct
  // call can tell "returns []" from "throws" (an equivalent mutant at page level).
  it.each([[404], [500], ["network"]])("fetchEventOptions never throws (%s) and offers nothing", async (status) => {
    network({ options: { status: status as number | "network" } })
    await expect(fetchEventOptions()).resolves.toEqual([])
  })

  it("reads an allowlist of five keys and drops malformed rows", () => {
    const rows = parseEventOptions({
      events: [
        { ...OPTION, capacity: 99, join_link: "https://zoom.example/x" },
        { id: "", title: "x", starts_at: START, time_zone: "UTC", full: false },
        { ...OPTION, id: "2", starts_at: "not a date" },
        null,
        { ...OPTION, id: "3", full: "yes" },
      ],
    })
    expect(rows).toHaveLength(2)
    expect(Object.keys(rows[0]).sort()).toEqual(["full", "id", "starts_at", "time_zone", "title"])
    expect(rows[1].full).toBe(false) // only literal true counts
    expect(parseEventOptions(undefined)).toEqual([])
    expect(parseEventOptions({ events: "no" })).toEqual([])
  })

  it("classifies every status the route can answer", () => {
    const err = (status?: number, data?: unknown) =>
      new AxiosError("x", "E", undefined, {}, status === undefined ? undefined : ({ status, data } as AxiosResponse))
    expect(classifyEventRegistrationError(err(404)).kind).toBe("not_open")
    expect(classifyEventRegistrationError(err(409)).kind).toBe("full")
    expect(classifyEventRegistrationError(err(403)).kind).toBe("bot_failed")
    expect(classifyEventRegistrationError(err(503)).kind).toBe("bot_unavailable")
    expect(classifyEventRegistrationError(err(429)).kind).toBe("rate_limited")
    expect(classifyEventRegistrationError(err(413)).kind).toBe("too_large")
    expect(classifyEventRegistrationError(err(500)).kind).toBe("server")
    expect(classifyEventRegistrationError(err(undefined)).kind).toBe("network")
    expect(classifyEventRegistrationError(new Error("x")).kind).toBe("server")
    expect(classifyEventRegistrationError(err(422, { detail: [{ field: "a", message: "b" }, 7] }))).toEqual({
      kind: "invalid",
      problems: [{ field: "a", message: "b" }],
    })
  })
})
