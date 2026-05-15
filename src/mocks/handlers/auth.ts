import { http, HttpResponse } from "msw"
import type { UserRole } from "@/types/roles"

/** Mock user accounts — one per role for testing */
export type MockUser = {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  avatarUrl: string | null
}

export const MOCK_USERS: MockUser[] = [
  { id: "u-user-1", email: "user@test.com", password: "password123", name: "Test User", role: "user", avatarUrl: null },
  { id: "u-mgr-1", email: "manager@test.com", password: "password123", name: "Test Manager", role: "manager", avatarUrl: null },
  { id: "u-ca-1", email: "companyadmin@test.com", password: "password123", name: "Company Admin", role: "company-admin", avatarUrl: null },
  { id: "u-prac-1", email: "practitioner@test.com", password: "password123", name: "Test Practitioner", role: "practitioner", avatarUrl: null },
  { id: "u-dist-1", email: "distributor@test.com", password: "password123", name: "Test Distributor", role: "distributor", avatarUrl: null },
  { id: "u-sa-1", email: "admin@test.com", password: "password123", name: "Super Admin", role: "super-admin", avatarUrl: null },
]

/** In-memory session store: accessToken → MockUser */
const sessions = new Map<string, MockUser>()

function makeTokens(userId: string) {
  const access_token = `mock-access-${userId}-${Date.now()}`
  const refresh_token = `mock-refresh-${userId}-${Date.now()}`
  return { access_token, refresh_token }
}

export const authHandlers = [
  /** POST /v1/login — matches real backend endpoint */
  http.post("*/v1/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string; verification?: boolean }
    const user = MOCK_USERS.find(
      (u) => u.email === body.email && u.password === body.password
    )
    if (!user) {
      return HttpResponse.json(
        { status: false, message: "Invalid email or password", data: {} },
        { status: 401 }
      )
    }
    const tokens = makeTokens(user.id)
    sessions.set(tokens.access_token, user)
    return HttpResponse.json({
      status: true,
      message: "Login successful",
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: "Bearer",
        user_id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        has_profile: true,
        is_onboarded: true,
        organization_id: null,
        business_id: null,
        mfa_required: false,
        next_step: null,
      },
    })
  }),

  /** GET /v1/me — matches real backend endpoint */
  http.get("*/v1/me", ({ request }) => {
    const authHeader = request.headers.get("access-token") ?? ""
    const user = sessions.get(authHeader)
    if (!user) {
      return HttpResponse.json(
        { status: false, message: "Unauthorized", data: {} },
        { status: 401 }
      )
    }
    return HttpResponse.json({
      status: true,
      data: {
        user_id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        has_profile: true,
        is_onboarded: true,
        avatarUrl: user.avatarUrl,
      },
    })
  }),

  /** POST /v1/refresh-token — matches real backend endpoint */
  http.post("*/v1/refresh-token", async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string }
    const existingUser = Array.from(sessions.values())[0]
    if (!existingUser || !body.refresh_token) {
      return HttpResponse.json(
        { status: false, message: "Invalid refresh token", data: {} },
        { status: 401 }
      )
    }
    const tokens = makeTokens(existingUser.id)
    sessions.set(tokens.access_token, existingUser)
    return HttpResponse.json({
      status: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: "Bearer",
      },
    })
  }),
]
