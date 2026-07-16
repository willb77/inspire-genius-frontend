import { RequireVertical } from "@/verticals/core"
import HonorShell from "./HonorShell"

/**
 * Entitlement gate + shell for the Honor Foundation Coach Workbench.
 *
 * The gate is Core's `RequireVertical` (not a hand-rolled copy) — unentitled
 * users redirect to `/home`. The chrome is Honor's own `HonorShell` (navy/orange
 * THF identity) rather than Core's `VerticalShell`, which hardcodes the shared
 * `AppShell`. This is the documented Core theming gap: verticals can't yet supply
 * custom chrome through `VerticalShell`, so Honor wraps the gate + supplies its
 * shell. If/when Core's theme contract grows to accept a shell, collapse this to
 * `<VerticalShell vertical="honor" shell={<HonorShell/>} />`. See #185.
 */
export default function HonorLayout() {
  return (
    <RequireVertical vertical="honor" redirectTo="/home">
      <HonorShell />
    </RequireVertical>
  )
}
