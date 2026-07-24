import { VerticalShell } from "@/verticals/core"

/**
 * Entitlement gate + shell for the Lumen vertical.
 *
 * The gate, the AppShell wrapping, and the role plumbing live in Core's
 * `VerticalShell` — Lumen declares which vertical it is and nothing more.
 * Unentitled users are redirected to `/home`.
 *
 * Lumen reuses Core's chrome deliberately (no `shell` prop): it is the B2C face
 * of the platform's own diagnostics, not a third-party reskin like Honor.
 */
export default function LumenLayout() {
  return <VerticalShell vertical="lumen" />
}
