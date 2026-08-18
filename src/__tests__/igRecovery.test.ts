/**
 * Tests for public/ig-recovery.js — the out-of-bundle asset-failure recovery.
 *
 * This script is the safety net for the 2026-08-17 blank-page class of failure:
 * when a hashed build asset fails to load, the app never boots, so nothing
 * inside the bundle (including checkForUpdate()) can recover. These tests pin
 * the two behaviours that matter — it fires for OUR build assets, and it stays
 * out of the way for everything else.
 *
 * The script is evaluated with its globals INJECTED rather than eval'd into
 * jsdom's window: jsdom makes `window.location` non-configurable, and a real
 * navigation is exactly what we need to assert on.
 */
import fs from "fs"
import path from "path"

const SCRIPT = fs.readFileSync(
  path.resolve(__dirname, "../../public/ig-recovery.js"),
  "utf-8",
)

const GUARD = "__ig_asset_recovery_attempted"
const ORIGIN = "https://stable.inspiresgenius.com"

type Handler = (event: unknown) => void

interface Harness {
  fire: (type: string, event: unknown) => void
  replace: jest.Mock
  unregister: jest.Mock
  cachesDelete: jest.Mock
  store: Record<string, string>
}

function load(opts: { storageThrows?: boolean } = {}): Harness {
  const handlers: Record<string, Handler> = {}
  const store: Record<string, string> = {}

  const replace = jest.fn()
  const unregister = jest.fn().mockResolvedValue(true)
  const cachesDelete = jest.fn().mockResolvedValue(true)

  const sessionStorage = {
    getItem: (k: string) => {
      if (opts.storageThrows) throw new Error("storage disabled")
      return k in store ? store[k] : null
    },
    setItem: (k: string, v: string) => {
      if (opts.storageThrows) throw new Error("storage disabled")
      store[k] = v
    },
  }

  const win = {
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn
    },
    location: { href: `${ORIGIN}/login`, origin: ORIGIN, replace },
    console: { warn: jest.fn() },
  }

  const navigator = {
    serviceWorker: { getRegistrations: jest.fn().mockResolvedValue([{ unregister }]) },
  }
  const caches = { keys: jest.fn().mockResolvedValue(["precache-v1"]), delete: cachesDelete }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(
    "window", "navigator", "caches", "sessionStorage", "console", SCRIPT,
  )
  run(win, navigator, caches, sessionStorage, win.console)

  return {
    fire: (type, event) => handlers[type]?.(event),
    replace,
    unregister,
    cachesDelete,
    store,
  }
}

/** A resource-load failure, shaped as the browser delivers it. */
function resourceError(tag: "SCRIPT" | "LINK", url: string) {
  return { target: tag === "SCRIPT" ? { tagName: tag, src: url } : { tagName: tag, href: url } }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("ig-recovery", () => {
  it("tears down the service worker and caches when a build asset fails", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/index-abc123.js`))
    await flush()

    expect(h.unregister).toHaveBeenCalled()
    expect(h.cachesDelete).toHaveBeenCalledWith("precache-v1")
    expect(h.replace).toHaveBeenCalled()
  })

  it("recovers from a failed stylesheet too", async () => {
    const h = load()
    h.fire("error", resourceError("LINK", `${ORIGIN}/assets/index-abc123.css`))
    await flush()
    expect(h.replace).toHaveBeenCalled()
  })

  it("recovers from a failed dynamic import (code-split route chunk)", async () => {
    const h = load()
    h.fire("unhandledrejection", {
      reason: new Error(
        `Failed to fetch dynamically imported module: ${ORIGIN}/assets/Settings-xyz.js`,
      ),
    })
    await flush()
    expect(h.replace).toHaveBeenCalled()
  })

  it("reloads with a cache-busting param so the broken document is not reused", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/index-abc123.js`))
    await flush()

    expect(h.replace).toHaveBeenCalledTimes(1)
    expect(String(h.replace.mock.calls[0][0])).toContain("__ig_r=")
  })

  // ── Restraint: recovery must NOT fire for unrelated failures ────────────

  it("ignores a third-party script failure", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", "https://cdn.example.com/tracker.js"))
    await flush()

    expect(h.unregister).not.toHaveBeenCalled()
    expect(h.replace).not.toHaveBeenCalled()
  })

  it("ignores a same-origin file outside /assets/ (e.g. a missing image)", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/images/avatar.png`))
    await flush()
    expect(h.replace).not.toHaveBeenCalled()
  })

  it("ignores a non-resource error event", async () => {
    const h = load()
    h.fire("error", { target: undefined })
    await flush()
    expect(h.replace).not.toHaveBeenCalled()
  })

  it("ignores an unrelated promise rejection", async () => {
    const h = load()
    h.fire("unhandledrejection", { reason: new Error("network request failed") })
    await flush()
    expect(h.replace).not.toHaveBeenCalled()
  })

  // ── Loop safety ─────────────────────────────────────────────────────────

  it("only recovers once per tab session", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/index-abc123.js`))
    await flush()
    expect(h.replace).toHaveBeenCalledTimes(1)

    // A second failure after recovery already ran is a real outage, not a
    // stale cache. Reloading again would loop forever and hide it.
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/vendor-def456.js`))
    await flush()
    expect(h.replace).toHaveBeenCalledTimes(1)
  })

  it("sets the guard that App.tsx clears on a successful boot", async () => {
    const h = load()
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/index-abc123.js`))
    await flush()
    expect(h.store[GUARD]).toBe("1")
  })

  it("refuses to act when sessionStorage is unavailable, rather than risk a loop", async () => {
    const h = load({ storageThrows: true })
    h.fire("error", resourceError("SCRIPT", `${ORIGIN}/assets/index-abc123.js`))
    await flush()
    expect(h.replace).not.toHaveBeenCalled()
  })
})
