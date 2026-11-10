/**
 * @jest-environment jsdom
 */
import { readFileSync } from "fs"
import { join } from "path"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { PUBLIC_EVENTS_PATH, fetchPublicEvents, parsePublicEvents } from "../publicEvents.service"
import { publicIntakeClient } from "../publicIntake.service"

type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>

const seen: InternalAxiosRequestConfig[] = []

function respond(status: number | "network", data?: unknown): Adapter {
  return async (config) => {
    seen.push(config)
    if (status === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config, {})
    const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
    if (status >= 200 && status < 300) return response
    throw new AxiosError(`status ${status}`, "ERR_BAD_RESPONSE", config, {}, response)
  }
}

describe("fetchPublicEvents", () => {
  const original = publicIntakeClient.defaults.adapter
  beforeEach(() => {
    seen.length = 0
  })
  afterEach(() => {
    publicIntakeClient.defaults.adapter = original
  })

  it("GETs the public events route through publicIntakeClient, with no token header", async () => {
    // The adapter is installed on publicIntakeClient only: a request made on
    // any other axios instance would not reach it and the test would fail.
    publicIntakeClient.defaults.adapter = respond(200, { events: [] })
    await expect(fetchPublicEvents()).resolves.toEqual({ kind: "list", events: [] })
    expect(seen).toHaveLength(1)
    expect(seen[0].method).toBe("get")
    expect(seen[0].url).toBe(PUBLIC_EVENTS_PATH)
    expect(PUBLIC_EVENTS_PATH).toBe("/v1/intake/public/events")
    const headers = JSON.stringify(seen[0].headers ?? {}).toLowerCase()
    expect(headers).not.toContain("access-token")
    expect(headers).not.toContain("authorization")
  })

  it("reads 404 (switch off) as not_open, not as an error", async () => {
    publicIntakeClient.defaults.adapter = respond(404, { detail: "Not Found" })
    await expect(fetchPublicEvents()).resolves.toEqual({ kind: "not_open" })
  })

  it.each([500, 502, 429, 403])("throws on %s", async (status) => {
    publicIntakeClient.defaults.adapter = respond(status, {})
    await expect(fetchPublicEvents()).rejects.toBeInstanceOf(AxiosError)
  })

  it("throws on a network failure", async () => {
    publicIntakeClient.defaults.adapter = respond("network")
    await expect(fetchPublicEvents()).rejects.toBeInstanceOf(AxiosError)
  })

  it("throws on a 200 whose body is not { events: [...] }", async () => {
    publicIntakeClient.defaults.adapter = respond(200, "<html>CloudFront</html>")
    await expect(fetchPublicEvents()).rejects.toThrow(/Unexpected response/)
  })

  it("the service module never imports the shared, intercepted clients", () => {
    const src = readFileSync(join(__dirname, "..", "publicEvents.service.ts"), "utf8")
    expect(src).toMatch(/from "\.\/publicIntake\.service"/)
    expect(src).toMatch(/publicIntakeClient\.get/)
    expect(src).not.toMatch(/@\/lib\/axios/)
    expect(src).not.toMatch(/@\/lib\/agentApi/)
    expect(src).not.toMatch(/\baxios\.(get|create|request)\b/)
  })
})

describe("parsePublicEvents", () => {
  it("keeps exactly the four allowlisted keys, whatever else the server sends", () => {
    const events = parsePublicEvents({
      events: [
        {
          title: "Intro",
          starts_at: "2099-03-03T14:00:00+00:00",
          time_zone: "America/New_York",
          description: "Hello",
          capacity: 40,
          join_link: "https://meet.example/abc",
          id: "w1",
          created_by: "an-admin-identifier",
          registered_count: 3,
        },
      ],
    })
    expect(events).toEqual([
      { title: "Intro", starts_at: "2099-03-03T14:00:00+00:00", time_zone: "America/New_York", description: "Hello" },
    ])
    expect(Object.keys(events[0]).sort()).toEqual(["description", "starts_at", "time_zone", "title"])
  })

  it("drops rows without a title, a valid start or a zone, and reads a blank description as null", () => {
    const events = parsePublicEvents({
      events: [
        { title: "", starts_at: "2099-01-01T00:00:00Z", time_zone: "UTC" },
        { title: "No start", time_zone: "UTC" },
        { title: "Bad start", starts_at: "soon", time_zone: "UTC" },
        { title: "No zone", starts_at: "2099-01-01T00:00:00Z" },
        null,
        "x",
        { title: "Kept", starts_at: "2099-01-01T00:00:00Z", time_zone: "UTC", description: "" },
      ],
    })
    expect(events).toEqual([{ title: "Kept", starts_at: "2099-01-01T00:00:00Z", time_zone: "UTC", description: null }])
  })

  it.each([null, {}, { events: "nope" }, []])("refuses a malformed body %p", (body) => {
    expect(() => parsePublicEvents(body)).toThrow(/Unexpected response/)
  })
})
