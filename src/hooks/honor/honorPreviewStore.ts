/**
 * Reactive store for the Honor-Foundation vertical preview override.
 *
 * Mirrors the GRANT preview store ({@link ../grant/grantPreviewStore}). Backed by
 * a single localStorage key with three states:
 *   "true"   → force the Honor Workbench ON  (show, overriding entitlement)
 *   "false"  → force it OFF (hide, overriding entitlement)
 *   (absent) → follow the real server entitlement (enabled_verticals)
 *
 * Dev preview: in the browser console run
 *   localStorage.setItem("honor_dev_access","true"); location.reload()
 * to preview the reskinned Coach Workbench without a seeded entitlement row.
 * Exposed as an external store so useHonorAccess re-renders live when the flag
 * flips, and stays in sync across tabs via the `storage` event.
 */
export const HONOR_PREVIEW_KEY = "honor_dev_access"

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function subscribeHonorPreview(cb: () => void): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    if (typeof window !== "undefined") window.removeEventListener("storage", cb)
  }
}

/** Current override: "true" | "false" | null (null = follow entitlement). */
export function getHonorPreviewOverride(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(HONOR_PREVIEW_KEY)
  } catch {
    return null
  }
}

/** Explicitly force the preview on or off (writes "true"/"false"). */
export function setHonorPreviewOverride(on: boolean): void {
  try {
    window.localStorage.setItem(HONOR_PREVIEW_KEY, on ? "true" : "false")
  } catch {
    /* ignore */
  }
  emit()
}

/** Clear the override so access follows real entitlement again. */
export function clearHonorPreviewOverride(): void {
  try {
    window.localStorage.removeItem(HONOR_PREVIEW_KEY)
  } catch {
    /* ignore */
  }
  emit()
}
