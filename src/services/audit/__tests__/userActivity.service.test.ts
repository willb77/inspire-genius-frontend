/**
 * The service must THROW on failure, not degrade to an empty shape.
 *
 * `{ lastLogin: null, activity: [] }` is indistinguishable from a real user who
 * has never signed in — so a failed request that returned it would assert this
 * account has never been used. That is a fabricated claim, and a much more
 * alarming one than an error message.
 */
import { getUserActivity } from "../userActivity.service"
import { api } from "@/lib/axios"

jest.mock("@/lib/axios", () => ({ api: { get: jest.fn() } }))
const mockGet = api.get as jest.Mock

beforeEach(() => jest.clearAllMocks())

it("requests the url-encoded user id with a limit", async () => {
  mockGet.mockResolvedValue({ data: { data: { userId: "u1", lastLogin: null, loginCount: 0, locationRecorded: false, activity: [] } } })
  await getUserActivity("a/b", 5)
  expect(mockGet).toHaveBeenCalledWith("/v1/audit/users/a%2Fb/activity", { params: { limit: 5 } })
})

it("THROWS on failure instead of returning an empty activity record", async () => {
  mockGet.mockRejectedValue(new Error("403"))
  await expect(getUserActivity("u1")).rejects.toThrow()
})

it("passes the payload through unchanged, including a null lastLogin", async () => {
  mockGet.mockResolvedValue({
    data: { data: { userId: "u1", lastLogin: null, loginCount: 0, locationRecorded: false, activity: [] } },
  })
  const r = await getUserActivity("u1")
  expect(r.lastLogin).toBeNull()
  expect(r.locationRecorded).toBe(false)
})
