/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  loginApi,
  resendVerificationApi,
  signupApi,
  verifySignupApi,
  getMeWithToken,
  getSocialAuthLoginUrl,
} from "../auth.service"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("auth.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("loginApi posts to /v1/login", async () => {
    const envelope = { status: true, data: { access_token: "t" } }
    mockApi.post.mockResolvedValueOnce({ data: envelope })
    const result = await loginApi({ email: "a@b.com", password: "pw", verification: false })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/login", { email: "a@b.com", password: "pw", verification: false })
    expect(result).toEqual(envelope)
  })

  it("resendVerificationApi posts with encoded email", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { status: true } })
    await resendVerificationApi("a@b.com")
    expect(mockApi.post).toHaveBeenCalledWith(expect.stringContaining("/v1/resend-verification?email=a%40b.com"))
  })

  it("signupApi posts to /v1/signup", async () => {
    const payload = { email: "a@b.com", password: "pw", confirm_password: "pw" }
    mockApi.post.mockResolvedValueOnce({ data: { status: true } })
    await signupApi(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/signup", payload)
  })

  it("verifySignupApi posts with email and code", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { status: true } })
    await verifySignupApi("a@b.com", "123456")
    expect(mockApi.post).toHaveBeenCalledWith(expect.stringContaining("email=a%40b.com"))
    expect(mockApi.post).toHaveBeenCalledWith(expect.stringContaining("confirmation_code=123456"))
  })

  it("getMeWithToken sends custom access-token header", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { status: true, data: { id: "u1" } } })
    await getMeWithToken("my-token")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/me", { headers: { "access-token": "my-token" } })
  })

  it("getSocialAuthLoginUrl gets provider URL", async () => {
    const envelope = { status: true, data: { login_url: "https://google.com/auth" } }
    mockApi.get.mockResolvedValueOnce({ data: envelope })
    const result = await getSocialAuthLoginUrl("google")
    expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining("provider=google"))
    expect(result).toEqual(envelope)
  })
})
