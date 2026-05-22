/**
 * @jest-environment jsdom
 */
import { requestMagicLink, verifyMagicLink } from "../magic-auth.service"
import { api } from "@/lib/axios"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("magic-auth.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("requestMagicLink POSTs to auth-service /v1/magic-link/request", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        message: "If an account with this email exists, a sign-in link has been sent.",
        status: true,
        data: { email: "a@b.com" },
      },
    })
    const result = await requestMagicLink({ email: "a@b.com" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/magic-link/request", { email: "a@b.com" })
    expect(result.status).toBe(true)
    expect(result.data?.email).toBe("a@b.com")
  })

  it("verifyMagicLink POSTs to auth-service /v1/magic-link/verify and unwraps the LoginDataPayload", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        message: "Signed in successfully",
        status: true,
        data: {
          access_token: "at",
          refresh_token: "rt",
          token_type: "Bearer",
          user_id: "u1",
          email: "a@b.com",
          full_name: "A B",
          role: "user",
          is_onboarded: true,
          organization_id: null,
          business_id: null,
          next_step: "dashboard",
        },
      },
    })
    const result = await verifyMagicLink({ token: "tok" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/magic-link/verify", { token: "tok" })
    expect(result.data?.access_token).toBe("at")
    expect(result.data?.email).toBe("a@b.com")
    expect(result.data?.next_step).toBe("dashboard")
  })
})
