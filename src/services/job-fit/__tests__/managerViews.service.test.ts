/**
 * TS-4b: the member's notice read is self-scoped. It names no person: no id in
 * the path, no query and no body.
 */
const get = jest.fn()
jest.mock("@/lib/axios", () => ({ api: { get: (...args: unknown[]) => get(...args) } }))

// jest.setup.ts gives this module an empty default for every other suite; this
// one tests the real thing.
const { getManagerFitViews } = jest.requireActual<typeof import("../managerViews.service")>(
  "../managerViews.service",
)

it("asks for the caller's own notices and passes nothing else", async () => {
  get.mockResolvedValue({ data: { data: [] } })
  await getManagerFitViews()
  expect(get.mock.calls).toEqual([["/v1/blueprint/fit/manager-run/mine"]])
})
