/**
 * /manager/interviews — the interviews a manager has actually run.
 *
 * Package IS-C Lane C, finding IS-F5. This page previously rendered EIGHT
 * hard-coded candidates — Sarah Chen, Marcus Johnson, David Kim and five more,
 * none of whom exist — behind a PlaceholderBanner, with `completedCount = 12`
 * as a literal and a `// TODO: wire to real endpoint`. It was live on stable.
 *
 * A manager-visible list of people who do not exist is worse than an empty
 * page: it looks like a working product, so nobody reports it, and a manager
 * could reasonably believe those interviews are scheduled.
 *
 * It now reads `GET /v1/agents/interview/live/sessions`. Every number on the
 * page is counted from that response — there are no literals left.
 */
import { useMemo } from "react"
import { Link } from "react-router-dom"

import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES } from "@/constants/routes"
import { useLiveSessions } from "@/hooks/interview/useLiveSessions"
import type { LiveSessionSummary } from "@/services/interview/live.service"

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"

const fmtScore = (v?: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(2)} / 5` : "—"

/** What the interviewer typed for the candidate, or the PII-free hash. */
const candidateLabel = (s: LiveSessionSummary) =>
  s.candidate_ref?.display_name?.trim() ||
  (s.candidate_ref?.candidate_hash ? `#${s.candidate_ref.candidate_hash.slice(0, 8)}` : "—")

const modeLabel = (s: LiveSessionSummary) =>
  (s.frame?.mode ?? "star") === "custom" ? "Studio" : "Live scored"

export default function ManagerInterviews() {
  const { data, isLoading, error, refetch } = useLiveSessions({ limit: 100 })

  const sessions = useMemo(() => data?.sessions ?? [], [data])
  const inProgress = useMemo(() => sessions.filter((s) => s.status === "in_progress"), [sessions])
  const finalized = useMemo(() => sessions.filter((s) => s.status === "finalized"), [sessions])
  const abandoned = useMemo(() => sessions.filter((s) => s.status === "abandoned"), [sessions])

  // Every one of these is counted. The old page had `completedCount = 12` as a
  // literal beside three derived numbers, which made all four look equally real.
  const STATS = [
    { label: "In progress", value: String(inProgress.length), color: "#3B5BFF" },
    { label: "Completed", value: String(finalized.length), color: "#10B981" },
    { label: "Abandoned", value: String(abandoned.length), color: "#6b7280" },
    { label: "Total", value: String(data?.total ?? sessions.length), color: "#0D9488" },
  ]

  const groups: { title: string; rows: LiveSessionSummary[] }[] = [
    { title: "In progress", rows: inProgress },
    { title: "Completed", rows: finalized },
    { title: "Abandoned", rows: abandoned },
  ]

  return (
    <ManagerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Interviews</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">
        Interviews you have run. Start a new one from{" "}
        <Link to={ROUTES.MANAGER.INTERVIEW_STUDIO} className="text-[#3B5BFF] underline">
          Interview Studio
        </Link>
        .
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444] mb-4" role="alert">
          Could not load your interviews.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
            Retry
          </button>
        </div>
      )}

      {/* An honest empty state. It says WHY there is nothing, which the old
          page could not do because it always had eight rows. */}
      {!isLoading && !error && sessions.length === 0 && (
        <DataCard title="No interviews yet">
          <p className="text-[13px] text-[#6b7280]">
            Interviews you run appear here — in progress ones you can return to, and completed
            ones with their scores.
            {data && !data.org_scope_applied && (
              <>
                {" "}
                This list shows interviews <span className="font-medium">you</span> ran; it is not
                organisation-wide.
              </>
            )}
          </p>
        </DataCard>
      )}

      {groups.map(({ title, rows }) => {
        if (!isLoading && rows.length === 0) return null
        return (
          <DataCard key={title} title={title} badge={rows.length}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Candidate</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">Opening</th>
                      <th className="pb-2 font-medium">Kind</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors"
                      >
                        <td className="py-2.5 font-medium text-[#111827]">
                          {fmtDate(s.finalized_at ?? s.created_at)}
                        </td>
                        <td className="py-2.5 text-[#111827]">{candidateLabel(s)}</td>
                        <td className="py-2.5 text-[#6b7280]">{s.frame?.roleTitle || "—"}</td>
                        <td className="py-2.5 text-[#6b7280]">{s.requisition_label || "—"}</td>
                        <td className="py-2.5 text-[#6b7280]">{modeLabel(s)}</td>
                        <td className="py-2.5 text-[#6b7280] tabular-nums">
                          {s.status === "finalized" ? fmtScore(s.overall_score) : "—"}
                        </td>
                        <td className="py-2.5"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        )
      })}
    </ManagerLayout>
  )
}
