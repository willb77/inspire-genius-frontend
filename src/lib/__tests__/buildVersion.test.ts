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

describe("refreshServiceWorkerOnLogin", () => {
  const realCaches = (globalThis as any).caches
  const realSW = (navigator as any).serviceWorker

  afterEach(() => {
    ;(globalThis as any).caches = realCaches
    Object.defineProperty(navigator, "serviceWorker", {
      value: realSW,
      configurable: true,
    })
    jest.restoreAllMocks()
  })

  function stubCaches(keys: string[]) {
    const deleted: string[] = []
    ;(globalThis as any).caches = {
      keys: jest.fn().mockResolvedValue(keys),
      delete: jest.fn(async (k: string) => {
        deleted.push(k)
        return true
      }),
    }
    return deleted
  }

  it("clears NO cache — that half of the request was withdrawn", async () => {
    // Clearing on every login would wipe the content-addressed build-asset
    // cache and re-fetch the whole entry graph per sign-in, which measurably
    // slows the app. Genuine staleness is handled by checkForUpdate(), which
    // clears only on a real version change.
    const deleted = stubCaches(["ig-build-assets", "ig-static", "api-cache"])
    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistrations: jest.fn().mockResolvedValue([]) },
      configurable: true,
    })

    const { refreshServiceWorkerOnLogin } = await import("@/lib/buildVersion")
    await refreshServiceWorkerOnLogin()

    expect(deleted).toEqual([])
  })

  it("asks each registration to check for a new worker", async () => {
    stubCaches([])
    const update = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistrations: jest.fn().mockResolvedValue([{ update, waiting: null }]),
      },
      configurable: true,
    })

    const { refreshServiceWorkerOnLogin } = await import("@/lib/buildVersion")
    const res = await refreshServiceWorkerOnLogin()

    expect(update).toHaveBeenCalledTimes(1)
    expect(res.updated).toBe(true)
  })

  it("never throws when the service worker is unavailable", async () => {
    // A blocked or unsupported SW must not be able to block sign-in.
    stubCaches(["ig-static"])
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistrations: jest.fn().mockRejectedValue(new Error("blocked")),
      },
      configurable: true,
    })

    const { refreshServiceWorkerOnLogin } = await import("@/lib/buildVersion")
    await expect(refreshServiceWorkerOnLogin()).resolves.toEqual({
      updated: false,
    })
  })
})
