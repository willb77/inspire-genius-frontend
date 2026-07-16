import { useSyncExternalStore } from "react"
import type { VerticalKey } from "./types"
import { useEnabledVerticals } from "./useEnabledVerticals"
import { getPreviewOverride, previewKey, subscribePreview } from "./previewStore"

export type VerticalAccess = {
  /** True when the vertical is enabled (server entitlement) or the preview override forces it on. */
  hasAccess: boolean
  /** True while the entitlement read is still loading (and no override decides it). */
  isLoading: boolean
  /** The raw enabled-verticals list from the server entitlement read. */
  enabledVerticals: string[]
}

/** localStorage key for GRANT's preview override. Kept as an alias for callers/tests. */
export const DEV_ACCESS_KEY = previewKey("grant")

/**
 * Entitlement gate for a vertical.
 *
 * Reads the current user's enabled verticals from the server
 * (`GET /v1/agents/me/verticals`, via {@link useEnabledVerticals}). The preview
 * override (`{vertical}_dev_access`, driven by the super-admin toggle) can force
 * the vertical on ("true") or off ("false"); absent, access follows the real
 * entitlement. The override is read via an external store so a toggle flip
 * re-renders every consumer (sidebar, layout) live — no reload.
 *
 * Simplified vertical model: entitlement is a plain server-read list — no Pack
 * SDK / Cognito PTG.
 */
export function useVerticalAccess(vertical: VerticalKey): VerticalAccess {
  const { data, isLoading } = useEnabledVerticals()
  const enabledVerticals = data ?? []
  const override = useSyncExternalStore(
    subscribePreview,
    () => getPreviewOverride(vertical),
    () => null
  )

  if (override === "true") {
    return { hasAccess: true, isLoading: false, enabledVerticals }
  }
  if (override === "false") {
    return { hasAccess: false, isLoading: false, enabledVerticals }
  }
  return {
    hasAccess: enabledVerticals.includes(vertical),
    isLoading,
    enabledVerticals,
  }
}
