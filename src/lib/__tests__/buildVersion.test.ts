/** @jest-environment jsdom */
import { checkForUpdate } from "@/lib/buildVersion"

const RELOAD_FLAG = "__ig_reload_in_progress"

// In the Jest env VITE_APP_VERSION is unset, so BUILD_VERSION resolves to
// "dev" and checkForUpdate short-circuits before ever calling fetch or
// window.location.reload. That keeps these tests free of brittle window
// mocks — the cases we exercise are exactly the no-fetch branches.
describe("checkForUpdate", () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    sessionStorage.clear()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("no-ops in dev (no VITE_APP_VERSION at build time)", async () => {
    const triggered = await checkForUpdate()
    expect(triggered).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("consumes the loop-prevention flag without fetching", async () => {
    sessionStorage.setItem(RELOAD_FLAG, "1")
    const triggered = await checkForUpdate()
    expect(triggered).toBe(false)
    expect(sessionStorage.getItem(RELOAD_FLAG)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
