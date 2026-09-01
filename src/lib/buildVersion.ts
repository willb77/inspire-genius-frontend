/**
 * Stale-bundle detection.
 *
 * `VITE_APP_VERSION` is the build-time git SHA (CI injects it from
 * `github.sha`). At build, a Vite plugin writes the same value to
 * `/version.json`. `checkForUpdate()` compares the bundle's compiled
 * value to a live fetch of that file. On mismatch it tears down the
 * service worker + caches and reloads, so the user sees the deployed
 * code without a manual hard refresh.
 *
 * Called on app boot (long-lived stale tab) and immediately after
 * login (the case users actually report).
 *
 * End-to-end verified live on dev 2026-05-13 (CloudFront E3EFVMBYYVF012
 * CACHING_DISABLED behaviors + S3 no-cache metadata).
 */

export const BUILD_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev"

const RELOAD_FLAG = "__ig_reload_in_progress"

async function unregisterServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map((r) => r.unregister()))
}

async function clearAllCaches(): Promise<void> {
  if (typeof caches === "undefined") return
  const keys = await caches.keys()
  await Promise.all(keys.map((k) => caches.delete(k)))
}

/**
 * Returns true if a reload was triggered (caller should bail out of
 * further work since the page is about to navigate away).
 */
export async function checkForUpdate(): Promise<boolean> {
  // Prevent reload loops: if we just reloaded for this reason, skip
  // the next check. The flag is consumed once and the contract holds
  // regardless of build mode, so check it before the dev short-circuit.
  if (sessionStorage.getItem(RELOAD_FLAG) === "1") {
    sessionStorage.removeItem(RELOAD_FLAG)
    return false
  }

  // No version stamp in dev builds — nothing to compare against.
  if (BUILD_VERSION === "dev") return false

  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
    })
    if (!res.ok) return false
    const body = (await res.json()) as { version?: string }
    const live = body?.version
    if (typeof live !== "string" || !live) return false
    if (live === BUILD_VERSION) return false

    sessionStorage.setItem(RELOAD_FLAG, "1")
    await unregisterServiceWorkers().catch(() => undefined)
    await clearAllCaches().catch(() => undefined)
    window.location.reload()
    return true
  } catch {
    // Offline / DNS / parse error — fail open. Worst case the user keeps
    // running the old bundle until next navigation; that's no worse than
    // today.
    return false
  }
}

/**
 * Force the service worker to re-check for a new build. Called on every
 * successful login.
 *
 * Scope note: this deliberately does NOT clear any cache. Clearing on every
 * login was in the original request and was withdrawn once measured — the
 * build-asset cache is content-addressed (the hash is in the filename), so an
 * entry can never be stale for its URL, and since the 2026-08-17 precache
 * reduction the app shell is the only thing precached. Wiping it per sign-in
 * would re-fetch the whole ~1.39 MB entry graph over the network and make the
 * app measurably slower, which is the opposite of the intent. See
 * docs/analysis/2026-09-01-latency-investigation.md.
 *
 * Genuinely stale bundles are still handled — by `checkForUpdate()` above,
 * which tears down caches only when /version.json reports a DIFFERENT build.
 * That is a real staleness signal; "the user logged in" is not.
 *
 * Why not `unregisterServiceWorkers()`: unregistering on every login leaves
 * the next page load with no worker at all, losing the offline fallback and
 * the runtime cache until a fresh install completes. `registration.update()`
 * gets the same freshness guarantee while keeping the worker alive.
 *
 * Returns a short report so callers/tests can assert what happened rather
 * than trusting a void promise.
 */
export async function refreshServiceWorkerOnLogin(): Promise<{
  updated: boolean
}> {
  let updated = false

  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        regs.map(async (r) => {
          // update() re-fetches the SW script bypassing the HTTP cache; if the
          // bytes differ the new worker installs and (skipWaiting/clientsClaim
          // are both set in vite.config.ts) takes over without a prompt.
          await r.update()
          updated = true
          if (r.waiting) r.waiting.postMessage({ type: "SKIP_WAITING" })
        }),
      )
    } catch {
      // A blocked/unsupported SW must never block sign-in.
    }
  }

  return { updated }
}
