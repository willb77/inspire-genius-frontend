/**
 * Reactive store for per-vertical preview overrides.
 *
 * Generalized from GRANT's `grantPreviewStore`. Each vertical gets its own
 * localStorage key with three states:
 *   "true"   → force the vertical ON  (show, overriding entitlement)
 *   "false"  → force the vertical OFF (hide, overriding entitlement)
 *   (absent) → follow the real server entitlement
 *
 * The super-admin toggle writes "true"/"false"; a normal user who never touches
 * it stays on `absent` and follows entitlement. Exposed as an external store so
 * `useVerticalAccess` re-renders every consumer live when the toggle flips (no
 * reload), and so it stays in sync across tabs via the `storage` event.
 *
 * The override is a CLIENT-SIDE demo affordance, not a security control: it only
 * decides what the UI offers. The API still authorizes every request on its own
 * (see `authorize_student_access` in GRANT). Never treat it as a permission.
 */
import type { VerticalKey } from "./types"

/** localStorage key for a vertical's preview override. GRANT's is `grant_dev_access`. */
export function previewKey(vertical: VerticalKey): string {
  return `${vertical}_dev_access`
}

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** Subscribe to override changes (external-store contract for useSyncExternalStore). */
export function subscribePreview(cb: () => void): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    if (typeof window !== "undefined") window.removeEventListener("storage", cb)
  }
}

/** Current override: "true" | "false" | null (null = follow entitlement). */
export function getPreviewOverride(vertical: VerticalKey): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(previewKey(vertical))
  } catch {
    return null
  }
}

/** Explicitly force the preview on or off (writes "true"/"false"). */
export function setPreviewOverride(vertical: VerticalKey, on: boolean): void {
  try {
    window.localStorage.setItem(previewKey(vertical), on ? "true" : "false")
  } catch {
    /* ignore */
  }
  emit()
}

/** Clear the override so access follows real entitlement again. */
export function clearPreviewOverride(vertical: VerticalKey): void {
  try {
    window.localStorage.removeItem(previewKey(vertical))
  } catch {
    /* ignore */
  }
  emit()
}
