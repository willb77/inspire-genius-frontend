/**
 * The service is the enforcement point for the fixed PRISM-request metadata:
 * role="user" and organization="The Honor Foundation" are injected here, never
 * taken from the caller.
 */
const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { post: (...a: unknown[]) => post(...a) } }))
jest.mock("@/lib/axios", () => ({ api: { post: jest.fn(), get: jest.fn() } }))

import { requestPrismReport } from "@/services/honor/coach.service"

beforeEach(() => jest.clearAllMocks())

test("posts to /coach/prism-request with role=user + org injected", async () => {
  post.mockResolvedValue({ data: { data: { requestId: "r1" } } })
  await requestPrismReport({ firstName: "Gary", lastName: "Burnette", email: "gary@x.org" })
  expect(post).toHaveBeenCalledWith("/v1/agents/honor/coach/prism-request", {
    firstName: "Gary",
    lastName: "Burnette",
    email: "gary@x.org",
    role: "user",
    organization: "The Honor Foundation",
  })
})
