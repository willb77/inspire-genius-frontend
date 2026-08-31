// The Honor Foundation — Administration console: shared presentational bits.
//
// Kept component-only (no non-component exports here) so the react-refresh
// only-export-components rule stays satisfied. Style-constant helpers live in
// _adminStyles.ts alongside it.

import { AlertTriangle } from "lucide-react"

/**
 * Read-safe fallback shown when an Administration list query errors — most often
 * because the admin API isn't deployed in this environment yet. Never a crash.
 */
export function AdminUnavailable({ what = "Administration data" }: { what?: string }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-dashed border-[#f0c39a] bg-[#fdf7f1] p-8 text-center"
    >
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-[#c9631a]" />
      <p className="text-sm font-semibold text-[#a2531a]">Administration backend not available in this environment yet</p>
      <p className="mt-1 text-sm text-[#8a6a4a]">
        {what} will load here once the Honor admin API is deployed. Nothing is broken — this surface is
        built to the API contract and will populate automatically.
      </p>
    </div>
  )
}

/** Simple centered "loading…" row. */
export function AdminLoading() {
  return <div className="rounded-[10px] border border-[#dfe4ec] bg-white p-8 text-center text-sm text-[#9299a6]">Loading…</div>
}
