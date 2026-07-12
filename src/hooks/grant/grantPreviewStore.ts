/**
 * Reactive store for the GRANT vertical preview override.
 *
 * Backed by a single localStorage key with three states:
 *   "true"   → force the GRANT view ON  (show, overriding entitlement)
 *   "false"  → force the GRANT view OFF (hide, overriding entitlement)
 *   (absent) → follow the real server entitlement
 *
 * The toggle in the super-admin console writes "true"/"false"; a normal user
 * who never touches it stays on `absent` and follows entitlement. Exposed as an
 * external store so useVerticalAccess re-renders live when the toggle flips
 * (no reload), and so it stays in sync across tabs via the `storage` event.
 */
export const GRANT_PREVIEW_KEY = "grant_dev_access"

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function subscribeGrantPreview(cb: () => void): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    if (typeof window !== "undefined") window.removeEventListener("storage", cb)
  }
}

/** Current override: "true" | "false" | null (null = follow entitlement). */
export function getGrantPreviewOverride(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(GRANT_PREVIEW_KEY)
  } catch {
    return null
  }
}

/** Explicitly force the preview on or off (writes "true"/"false"). */
export function setGrantPreviewOverride(on: boolean): void {
  try {
    window.localStorage.setItem(GRANT_PREVIEW_KEY, on ? "true" : "false")
  } catch {
    /* ignore */
  }
  emit()
}

/** Clear the override so access follows real entitlement again. */
export function clearGrantPreviewOverride(): void {
  try {
    window.localStorage.removeItem(GRANT_PREVIEW_KEY)
  } catch {
    /* ignore */
  }
  emit()
}
