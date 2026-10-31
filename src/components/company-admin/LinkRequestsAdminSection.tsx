/**
 * "Requests to join a team" — the company-admin's view of member → manager
 * link requests in their organisation (MMLR-6, decision D7: see and cancel).
 *
 * Same rule as the manager's panel: the list reads 200 `[]` when nothing is
 * pending AND when the feature is off, so the section exists only while there
 * is something to oversee (or the answer to a cancel just made). `[]`, 403,
 * 404 and a failed FIRST read render nothing; a failed refresh after requests
 * have shown keeps them and says so.
 *
 * What a member offered to share is between them and the manager, so no
 * categories are shown here. The manager's name arrives from growth for a
 * company-admin only; without it the row reads "a manager's team".
 *
 * Its own error boundary: a fault here never blanks the users table.
 */
import { useContext, useState } from "react"
import { Loader2 } from "lucide-react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthContext } from "@/context/auth-context"
import { ROLES } from "@/constants/routes"
import { useDecideLinkRequest, useIncomingLinkRequests } from "@/hooks/summit/useLinkRequests"
import type { IncomingLinkRequest } from "@/services/manager/development/growthService"
import {
  ADMIN_COPY,
  adminCancelErrorText,
  adminRequestLine,
  shortDate,
  statusOf,
} from "@/components/sharing/linkRequestCopy"

type Notice = { tone: "ok" | "error"; text: string }

function AdminRow({
  row,
  busy,
  onCancel,
}: {
  row: IncomingLinkRequest
  busy: boolean
  onCancel: (row: IncomingLinkRequest) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const asked = shortDate(row.createdAt)
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-[#f3f4f6] py-2.5 first:border-t-0" data-testid={`admin-request-${row.id}`}>
      <span className="min-w-0 flex-1 text-[13px] text-[#1f2937]">
        {adminRequestLine(row.memberName, row.managerName)}
        {asked && <span className="ml-2 text-xs text-[#6b7280]">asked {asked}</span>}
      </span>
      {confirming ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(row)}
            className="rounded-lg border border-[#EF4444] px-3 py-1 text-[12px] font-semibold text-[#EF4444] disabled:opacity-50"
          >
            {ADMIN_COPY.confirm}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="px-2 py-1 text-[12px] text-[#6b7280] disabled:opacity-50"
          >
            {ADMIN_COPY.keep}
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-[#e5e7eb] px-3 py-1 text-[12px] font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
        >
          {ADMIN_COPY.cancel}
        </button>
      )}
    </li>
  )
}

function SectionBody() {
  const incoming = useIncomingLinkRequests(true)
  const decide = useDecideLinkRequest()
  const [notice, setNotice] = useState<Notice | null>(null)

  const onCancel = (row: IncomingLinkRequest) => {
    setNotice(null)
    decide.mutate(
      { id: row.id, action: "cancel" },
      {
        onSuccess: () => setNotice({ tone: "ok", text: ADMIN_COPY.cancelled }),
        onError: (err) => setNotice({ tone: "error", text: adminCancelErrorText(err) }),
      },
    )
  }

  const refusedOutright = incoming.isError && [403, 404].includes(statusOf(incoming.error) ?? 0)
  const rows = refusedOutright ? [] : (incoming.data ?? [])
  if (rows.length === 0 && !notice) return null
  const refreshFailed = incoming.isError && !refusedOutright && rows.length > 0

  return (
    <section
      className="mb-5 rounded-lg border border-[#e5e7eb] bg-white p-4"
      aria-label={ADMIN_COPY.title}
      data-testid="admin-link-requests"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-[#111827]">{ADMIN_COPY.title}</h2>
        {decide.isPending && <Loader2 className="h-4 w-4 animate-spin text-[#6b7280]" aria-hidden />}
      </div>
      {rows.length > 0 && <p className="mt-1 text-[13px] text-[#6b7280]">{ADMIN_COPY.intro}</p>}
      {refreshFailed && (
        <p className="mt-2 text-[12.5px] text-amber-700" data-testid="admin-link-requests-refresh-failed">
          {ADMIN_COPY.refreshFailed}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-2">
          {rows.map((r) => (
            <AdminRow key={r.id} row={r} busy={decide.isPending} onCancel={onCancel} />
          ))}
        </ul>
      )}
      {notice && (
        <p
          role={notice.tone === "ok" ? "status" : "alert"}
          className={notice.tone === "ok" ? "mt-2 text-[12.5px] text-emerald-700" : "mt-2 text-[12.5px] text-[#EF4444]"}
        >
          {notice.text}
        </p>
      )}
    </section>
  )
}

function SectionGate() {
  const auth = useContext(AuthContext)
  if (auth?.hasRole(ROLES.COMPANY_ADMIN) !== true) return null
  return <SectionBody />
}

export function LinkRequestsAdminSection() {
  return (
    <ErrorBoundary fallback={() => null}>
      <SectionGate />
    </ErrorBoundary>
  )
}
