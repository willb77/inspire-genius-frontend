import { VerticalShell } from "@/verticals/core"

/**
 * Entitlement gate + shell for the GRANT vertical.
 *
 * The gate, the AppShell wrapping and the role plumbing now live in Core's
 * `VerticalShell` — GRANT declares which vertical it is and nothing more.
 * Behavior is unchanged: unentitled users still redirect to `/home`.
 */
export default function GrantLayout() {
  return <VerticalShell vertical="grant" />
}
