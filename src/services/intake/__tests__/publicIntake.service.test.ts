/**
 * @jest-environment jsdom
 */
import { readFileSync } from "fs"
import { join } from "path"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import {
  PUBLIC_REGISTRATIONS_PATH,
  classifyRegistrationError,
  publicIntakeClient,
  submitPublicRegistration,
} from "../publicIntake.service"
import type { PublicRegistrationPayload } from "@/types/intake"

const PAYLOAD: PublicRegistrationPayload = {
  first_name: "Ada",
  last_name: "Example",
  email: "ada@example.org",
  phone: null,
  organisation: null,
  role: "mentor",
  role_other: null,
  prism_accredited: "no",
  site_id: null,
  context: "individual",
  context_other: null,
  region: "Region",
  country: "Country",
  heard_from: null,
  webinar_id: null,
  consents: [],
  website: null,
}

type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>

function respond(status: number, data: unknown): Adapter {
  return async (config) => {
    const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
    if (status >= 200 && status < 300) return response
    throw new AxiosError(`status ${status}`, "ERR_BAD_RESPONSE", config, {}, response)
  }
}

function axiosError(status?: number, data?: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response =
    status === undefined ? undefined : ({ data, status, statusText: "", headers: {}, config } as AxiosResponse)
  return new AxiosError("failed", status === undefined ? "ERR_NETWORK" : "ERR_BAD_RESPONSE", config, {}, response)
}

describe("publicIntakeClient", () => {
  const original = publicIntakeClient.defaults.adapter
  afterEach(() => {
    publicIntakeClient.defaults.adapter = original
  })

  it("has no request or response interceptors (no token, no 401 → /login)", () => {
    // axios keeps registered interceptors in `handlers`; ejected ones become null.
    type WithHandlers = { handlers: unknown[] }
    const req = (publicIntakeClient.interceptors.request as unknown as WithHandlers).handlers.filter(Boolean)
    const res = (publicIntakeClient.interceptors.response as unknown as WithHandlers).handlers.filter(Boolean)
    expect(req).toHaveLength(0)
    expect(res).toHaveLength(0)
  })

  it("the service module never imports the shared, intercepted clients", () => {
    const src = readFileSync(join(__dirname, "..", "publicIntake.service.ts"), "utf8")
    expect(src).not.toMatch(/@\/lib\/axios/)
    expect(src).not.toMatch(/@\/lib\/agentApi/)
    expect(src).not.toMatch(/attachInterceptors\s*\(/)
    expect(src).not.toMatch(/interceptors\.(request|response)\.use/)
  })

  it("posts the payload to the public registrations path with no auth header", async () => {
    let seen: InternalAxiosRequestConfig | undefined
    publicIntakeClient.defaults.adapter = async (config) => {
      seen = config
      return respond(200, { status: "received" })(config)
    }
    await expect(submitPublicRegistration(PAYLOAD)).resolves.toEqual({ status: "received" })
    expect(seen?.url).toBe(PUBLIC_REGISTRATIONS_PATH)
    expect(seen?.method).toBe("post")
    expect(seen?.withCredentials).toBe(false)
    const headers = (seen?.headers ?? {}) as Record<string, unknown>
    expect(headers["access-token"]).toBeUndefined()
    expect(headers["Authorization"]).toBeUndefined()
    const body = JSON.parse(String(seen?.data))
    expect(body.webinar_id).toBeNull()
    expect("client_ip" in body).toBe(false)
  })

  it("a 401 rejects to the caller and does not navigate", async () => {
    const before = window.location.href
    publicIntakeClient.defaults.adapter = respond(401, { detail: "Not authenticated" })
    const err = await submitPublicRegistration(PAYLOAD).catch((e: unknown) => e)
    expect(classifyRegistrationError(err)).toEqual({ kind: "server" })
    expect(window.location.href).toBe(before)
  })
})

describe("classifyRegistrationError", () => {
  it("404 is 'not open yet'", () => {
    expect(classifyRegistrationError(axiosError(404, { detail: "Not Found" }))).toEqual({ kind: "not_open" })
  })

  it("429 is rate limited", () => {
    expect(classifyRegistrationError(axiosError(429, {}))).toEqual({ kind: "rate_limited" })
  })

  it("413 is too large", () => {
    expect(classifyRegistrationError(axiosError(413, {}))).toEqual({ kind: "too_large" })
  })

  it("no response is a network error", () => {
    expect(classifyRegistrationError(axiosError())).toEqual({ kind: "network" })
  })

  it("500 and non-axios errors are server errors", () => {
    expect(classifyRegistrationError(axiosError(500, {}))).toEqual({ kind: "server" })
    expect(classifyRegistrationError(new Error("boom"))).toEqual({ kind: "server" })
  })

  it("422 keeps only well-formed {field, message} problems", () => {
    const f = classifyRegistrationError(
      axiosError(422, {
        detail: [{ field: "email", message: "bad email" }, { loc: ["x"], msg: "pydantic shape" }, "junk"],
      }),
    )
    expect(f).toEqual({ kind: "invalid", problems: [{ field: "email", message: "bad email" }] })
  })

  it("422 with no list is invalid with no problems", () => {
    expect(classifyRegistrationError(axiosError(422, { detail: "nope" }))).toEqual({ kind: "invalid", problems: [] })
  })
})
