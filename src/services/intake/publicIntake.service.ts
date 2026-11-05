import axios from "axios"
import type {
  IntakeFieldProblem,
  PublicRegistrationFailure,
  PublicRegistrationPayload,
  PublicRegistrationReceived,
} from "@/types/intake"

/**
 * IN-2c — the request client for the public `/join` form.
 *
 * It is a DEDICATED axios instance, created here and never passed to
 * `attachInterceptors`. That is the point of it: the shared `api` / `agentApi`
 * instances inject the signed-in user's token and, on a 401 with no refresh
 * token, send the visitor to `/login`. An anonymous visitor on a public page
 * must never be bounced to the login screen because a public route answered
 * 401 or 404, and must never send a token they happen to hold.
 *
 * The base URL is the API Gateway, the same env var `agentApi` reads; the
 * monolith toggle is irrelevant because the intake service is not in the
 * monolith.
 */
export const publicIntakeClient = axios.create({
  baseURL:
    import.meta.env.VITE_AGENT_ENGINE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
  timeout: 20_000,
})

export const PUBLIC_REGISTRATIONS_PATH = "/v1/intake/public/registrations"

export async function submitPublicRegistration(
  payload: PublicRegistrationPayload,
): Promise<PublicRegistrationReceived> {
  const { data } = await publicIntakeClient.post<PublicRegistrationReceived>(PUBLIC_REGISTRATIONS_PATH, payload)
  return data
}

function isProblem(v: unknown): v is IntakeFieldProblem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { field?: unknown }).field === "string" &&
    typeof (v as { message?: unknown }).message === "string"
  )
}

/** Map anything the submit can throw to one of the states the page renders. */
export function classifyRegistrationError(err: unknown): PublicRegistrationFailure {
  if (!axios.isAxiosError(err)) return { kind: "server" }
  const status = err.response?.status
  if (status === undefined) return { kind: "network" }
  if (status === 404) return { kind: "not_open" }
  if (status === 429) return { kind: "rate_limited" }
  if (status === 413) return { kind: "too_large" }
  if (status === 422) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail
    const problems = Array.isArray(detail) ? detail.filter(isProblem) : []
    return { kind: "invalid", problems }
  }
  return { kind: "server" }
}
