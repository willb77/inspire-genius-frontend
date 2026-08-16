import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { UserPlus } from "lucide-react"

import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useManagerTeam } from "@/hooks/manager/useManagerTeam"
import type { ManagerTeamMember, PrismColor } from "@/types/manager/team"

/**
 * Team Roster (Client) — the manager's direct reports, from the live relation.
 *
 * ## Why this page changed on 2026-08-16
 *
 * It used to fall back to six hardcoded people (`FALLBACK_MEMBERS`: "Alex
 * Thompson", "Maria Garcia", …) whenever the API returned nothing — which was
 * always, because `GET /api/manager/team` read a table nothing writes to. So
 * the page looked healthy in every environment while showing fiction, and the
 * broken query underneath was invisible.
 *
 * The fallback is gone. An empty roster now says it is empty and says what to
 * do about it. The stat tiles are computed from the rows rather than typed in.
 */

/** PRISM brain-map colours. Deliberately literal hexes rather than the
 *  `--color-prism-*` tokens: those tokens do not currently match the map (the
 *  "gold" token renders red), so reusing them here would mislabel people. */
const PRISM_SWATCH: Record<PrismColor, { bg: string; label: string }> = {
  gold: { bg: "#C8A02B", label: "Gold" },
  green: { bg: "#2F9E63", label: "Green" },
  blue: { bg: "#3B6FD4", label: "Blue" },
  orange: { bg: "#D97828", label: "Orange" },
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

/** Stable per-person avatar tint — derived from the name so a member keeps the
 *  same colour between renders and between sessions. */
const AVATAR_TINTS = ["#3B82F6", "#8B5CF6", "#E53E3E", "#2DD4BF", "#6B7280", "#10B981"]
function tintFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]
}

export default function ManagerTeam() {
  const { t } = useTranslation(["admin", "common"])
  const { data, isLoading, error, refetch } = useManagerTeam()

  const members: ManagerTeamMember[] = data?.members ?? []
  const assessed = members.filter((m) => !!m.prism_color).length
  const departments = new Set(members.map((m) => m.department).filter(Boolean)).size

  return (
    <ManagerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Team Roster (Client)</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">{t("admin:manager.manageDescription")}</p>

      {/* Summary stats — computed, not typed in. A hardcoded "14 members" above
          a table of 3 is the same class of bug as the fallback roster. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Direct Reports", value: isLoading ? "—" : String(members.length) },
          { label: "PRISM Assessed", value: isLoading ? "—" : `${assessed}/${members.length}` },
          { label: "Departments", value: isLoading ? "—" : String(departments) },
          {
            label: "Awaiting PRISM",
            value: isLoading ? "—" : String(members.length - assessed),
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      <DataCard title={t("admin:manager.directReports")}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load your team.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#466BC4]">
              Retry
            </button>
          </div>
        )}

        {/* The honest empty state. `empty_reason: "no_assignments"` means the
            query ran and this manager genuinely owns nobody — which is a
            different thing from a failed load, and the backend is the only
            layer that can tell them apart. */}
        {!isLoading && !error && members.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-[#111827]">
              Nobody reports to you yet.
            </p>
            <p className="text-[13px] text-[#6b7280] mt-1 max-w-md mx-auto">
              A person appears here once their record names you as their manager. Import your team
              with a <span className="font-mono text-xs">Manager</span> column containing your email
              address, and they land on this roster.
            </p>
            <Button asChild className="mt-4 bg-[#466BC4] hover:bg-[#3A59A6] text-white gap-2">
              <Link to={ROUTES.MANAGER.BULK_IMPORT}>
                <UserPlus className="h-4 w-4" />
                Team Import
              </Link>
            </Button>
          </div>
        )}

        {(isLoading || members.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                  {["Member", "Position", "Department", "PRISM", "Role", ""].map((h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-3 py-3">
                            <Skeleton className="h-8 w-full" />
                          </td>
                        </tr>
                      ))
                  : members.map((m) => {
                      const swatch = m.prism_color ? PRISM_SWATCH[m.prism_color] : null
                      return (
                        <tr key={m.user_id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0"
                                style={{ backgroundColor: tintFor(m.user_id) }}
                              >
                                {initials(m.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#1f2937] truncate">
                                  {m.name}
                                </div>
                                <div className="text-[11px] text-[#6b7280] truncate">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[13px] text-[#374151]">
                            {m.position || <span className="text-[#9ca3af]">—</span>}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-[#374151]">
                            {m.department || <span className="text-[#9ca3af]">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            {swatch ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#374151]">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: swatch.bg }}
                                />
                                {swatch.label}
                              </span>
                            ) : (
                              <span className="text-xs text-[#9ca3af]">Not assessed</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-[#6b7280]">{m.role}</td>
                          <td className="px-3 py-3 text-right">
                            {/* The member workspace IS the client detail page —
                                six tabs over one dossier. Linking here rather
                                than building a second profile view. */}
                            <Link
                              to={`${ROUTES.MANAGER.DEVELOPMENT}/${m.user_id}`}
                              className="text-xs font-medium text-[#466BC4] underline whitespace-nowrap"
                            >
                              Open profile
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </ManagerLayout>
  )
}
