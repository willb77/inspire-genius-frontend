import { Activity, Download } from "lucide-react"
import { useCoachActivity } from "@/hooks/honor/useCoachData"
import { HonorCard, HonorEmptyState, HonorPageHeader } from "./_shared"
import { HONOR_BTN_OUTLINE } from "./_format"

/**
 * Honor Coach Workbench — Activity feed.
 *
 * Wiring target: the existing audit-service (`GET /v1/audit/logs`), JWT-scoped
 * to the coach's assigned members. Each row carries an Event / Conversation ID
 * for traceability (e.g. the 403 access-denial demo). Mock-backed via
 * {@link useCoachActivity}.
 */
export default function HonorActivity() {
  const { data: rows = [], isLoading } = useCoachActivity()

  return (
    <div>
      <HonorPageHeader
        icon={Activity}
        title="Activity"
        description="Audit trail of coach and member actions, scoped to your caseload. Every row is traceable by Event / Conversation ID."
        action={
          <button type="button" className={HONOR_BTN_OUTLINE}>
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {isLoading ? (
        <HonorEmptyState>Loading activity…</HonorEmptyState>
      ) : rows.length === 0 ? (
        <HonorEmptyState>No activity in the last 7 days.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event / Conversation ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#f1f3f7] last:border-0 align-top">
                    <td className="px-4 py-3 font-medium text-[#18202f]">{r.actor}</td>
                    <td className="px-4 py-3 text-[#5b6678]">{r.email}</td>
                    <td className="px-4 py-3 text-[#374151]">{r.event}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#5b6678]">{r.when}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-[#f1f3f7] px-1.5 py-0.5 font-mono text-[11px] text-[#5b6678]">
                        {r.eventId}·{r.conversationId}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}
    </div>
  )
}
