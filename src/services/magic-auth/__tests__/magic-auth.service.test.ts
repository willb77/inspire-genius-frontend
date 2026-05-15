/**
 * @jest-environment jsdom
 */
import {
  requestMagicLink,
  verifyMagicLink,
  requestMagicOtp,
  verifyMagicOtp,
  getMagicAuthMe,
  magicAuthLogout,
  magicAuthRefreshToken,
} from "../magic-auth.service"
import { magicAuthApi } from "@/lib/magicAuthAxios"

jest.mock("@/lib/magicAuthAxios", () => ({
  magicAuthApi: { post: jest.fn(), get: jest.fn() },
}))

const mockApi = magicAuthApi as jest.Mocked<typeof magicAuthApi>

describe("magic-auth.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("requestMagicLink posts to /api/auth/request-magic-link", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } })
    const result = await requestMagicLink({ email: "a@b.com" })
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/request-magic-link", { email: "a@b.com" })
    expect(result.success).toBe(true)
  })

  it("verifyMagicLink posts to /api/auth/verify-magic-link", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "u1" } } })
    await verifyMagicLink({ token: "tok" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/verify-magic-link", { token: "tok" })
  })

  it("requestMagicOtp posts to /api/auth/request-otp", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } })
    await requestMagicOtp({ email: "a@b.com" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/request-otp", { email: "a@b.com" })
  })

  it("verifyMagicOtp posts to /api/auth/verify-otp", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "u1" } } })
    await verifyMagicOtp({ email: "a@b.com", otp: "123456" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/verify-otp", { email: "a@b.com", otp: "123456" })
  })

  it("getMagicAuthMe sends Bearer token", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { id: "u1" } } })
    await getMagicAuthMe("my-token")
    expect(mockApi.get).toHaveBeenCalledWith("/api/auth/me", { headers: { Authorization: "Bearer my-token" } })
  })

  it("magicAuthLogout posts with Bearer token", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } })
    await magicAuthLogout("my-token")
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/logout", null, { headers: { Authorization: "Bearer my-token" } })
  })

  it("magicAuthRefreshToken posts refresh_token", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { access_token: "new" } } })
    await magicAuthRefreshToken("rt")
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth/refresh-token", { refresh_token: "rt" })
  })
})
