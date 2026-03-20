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
  const accessToken = `mock-access-${userId}-${Date.now()}`
  const refreshToken = `mock-refresh-${userId}-${Date.now()}`
  return { accessToken, refreshToken }
}

export const authHandlers = [
  /** POST /api/auth/login */
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    const user = MOCK_USERS.find(
      (u) => u.email === body.email && u.password === body.password
    )
    if (!user) {
      return HttpResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }
    const tokens = makeTokens(user.id)
    sessions.set(tokens.accessToken, user)
    return HttpResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tokens,
      },
    })
  }),

  /** GET /api/auth/me */
  http.get("/api/auth/me", ({ request }) => {
    const authHeader = request.headers.get("access-token") ?? ""
    const user = sessions.get(authHeader)
    if (!user) {
      return HttpResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
    })
  }),

  /** POST /api/auth/refresh-token */
  http.post("/api/auth/refresh-token", async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string }
    // For mock purposes, find any session and re-issue tokens
    const existingUser = Array.from(sessions.values())[0]
    if (!existingUser || !body.refreshToken) {
      return HttpResponse.json(
        { success: false, message: "Invalid refresh token" },
        { status: 401 }
      )
    }
    const tokens = makeTokens(existingUser.id)
    sessions.set(tokens.accessToken, existingUser)
    return HttpResponse.json({
      success: true,
      data: { tokens },
    })
  }),
]
