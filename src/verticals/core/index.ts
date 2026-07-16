/**
 * IG Vertical Core — the interface a vertical plugs into (frontend).
 *
 * Import from `@/verticals/core` and nowhere deeper. If a vertical needs
 * something Core doesn't export, that is a gap in the contract worth reporting
 * rather than reaching around.
 *
 * The contract, in one screen:
 *
 *     // src/verticals/acme/manifest.ts
 *     import { registerVertical } from "@/verticals/core"
 *     export const ACME = registerVertical({
 *       key: "acme", title: "ACME",
 *       routePrefix: "/vertical/acme", homePath: "/vertical/acme/dashboard",
 *     })
 *
 *     // routes.tsx
 *     { path: "/vertical/acme", element: <VerticalShell vertical="acme" />,
 *       children: [ ... ] }
 *
 *     // any acme service
 *     const { data } = await agentApi.get<VerticalApiResponse<Thing[]>>(
 *       "/v1/agents/acme/things"          // /v1/agents/* — the only reachable prefix
 *     )
 *
 * What Core gives a vertical: the entitlement read + gate (`useVerticalAccess`,
 * `RequireVertical`), the shell (`VerticalShell`), the response envelope type,
 * the preview override store, and the registry that shared surfaces list from.
 *
 * See `.claude/rules/verticals.md` and `Verticals/IG_Vertical_Core_Framework.docx`.
 */
export { default as RequireVertical } from "./RequireVertical"
export { default as VerticalShell } from "./VerticalShell"
export { getEnabledVerticals } from "./entitlements.service"
export {
  clearPreviewOverride,
  getPreviewOverride,
  previewKey,
  setPreviewOverride,
  subscribePreview,
} from "./previewStore"
export {
  __resetRegistry,
  getVertical,
  listEntitledVerticals,
  listVerticals,
  registerVertical,
  type VerticalDefinition,
} from "./registry"
export type {
  MeProfile,
  UserPreferences,
  VerticalApiResponse,
  VerticalKey,
} from "./types"
export { useEnabledVerticals } from "./useEnabledVerticals"
export {
  DEV_ACCESS_KEY,
  useVerticalAccess,
  type VerticalAccess,
} from "./useVerticalAccess"
