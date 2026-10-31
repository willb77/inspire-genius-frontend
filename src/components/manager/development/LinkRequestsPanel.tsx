/**
 * "Requests to join your team" — the manager's side of member → manager link
 * requests (MMLR-6). Mounted on the Team Development page above the view
 * switch, so it shows on all three lenses.
 *
 * The list answers 200 `[]` both when nobody has asked and when the feature is
 * not on, and the two cannot be told apart — so the panel exists only while
 * there is a request to act on (or the answer to one just acted on). An empty
 * list, a 403/404 and a failed FIRST read all render nothing: an empty panel,
 * or an error note, would sit on every manager's page for a feature most of
 * them do not have. Once requests have shown, a failed refresh keeps them on
 * screen and says so, so a manager who has one is never shown a silent blank.
 *
 * Accept and Decline report what the server said, by its code, and never claim
 * success on a refusal. The practitioner mounts of this page make no call: the
 * server refuses every role but `manager` here.
 *
 * Its own error boundary: a fault in this panel blanks the panel, never the
 * roster under it.
 */
import { useContext, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthContext } from "@/context/auth-context"
import { ROLES } from "@/constants/routes"
import { cn } from "@/lib/utils"
import { useDevelopmentText } from "@/hooks/manager/development/useDevelopmentText"
import { useDecideLinkRequest, useIncomingLinkRequests } from "@/hooks/summit/useLinkRequests"
import type { IncomingLinkRequest } from "@/services/manager/development/growthService"
import { categoryLabels, codeOf, shortDate, statusOf } from "@/components/sharing/linkRequestCopy"
import { useDevSkin } from "./skin"

type Notice = { tone: "ok" | "error"; text: string }

function refusalKey(err: unknown): string {
  const status = statusOf(err)
  const code = codeOf(err)
  if (status === 409 && code === "already_on_a_team") return "dev.linkRequests.refused.alreadyOnTeam"
  if (status === 409 && code === "cross_org") return "dev.linkRequests.refused.crossOrg"
  if (status === 409 && code === "not_pending") return "dev.linkRequests.refused.notPending"
  if (status === 404) return "dev.linkRequests.refused.gone"
  return "dev.linkRequests.refused.other"
}

function RequestRow({
  row,
  busy,
  onDecide,
}: {
  row: IncomingLinkRequest
  busy: boolean
  onDecide: (row: IncomingLinkRequest, action: "approve" | "decline") => void
}) {
  const { t } = useDevelopmentText()
  const sk = useDevSkin()
  const [confirming, setConfirming] = useState(false)
  const shares = categoryLabels(row.categories)
  const asked = shortDate(row.createdAt)

  return (
    <li className={cn("flex flex-col gap-2 border-t py-3 first:border-t-0", sk.border200)} data-testid={`incoming-${row.id}`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn("text-sm font-semibold", sk.text700)}>{row.memberName || "A member"}</span>
        {asked && (
          <span className={cn("text-xs", sk.text500)}>
            {t("dev.linkRequests.asked")} {asked}
          </span>
        )}
      </div>
      {shares.length > 0 && (
        <p className={cn("text-xs", sk.text500)}>
          {t("dev.linkRequests.willShare")} {shares.join(", ")}
        </p>
      )}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-xs", sk.text700)}>{t("dev.linkRequests.declineConfirm")}</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onDecide(row, "decline")}>
            {t("dev.linkRequests.declineYes")}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            {t("dev.linkRequests.keep")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => onDecide(row, "approve")}>
            {t("dev.linkRequests.accept")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
            {t("dev.linkRequests.decline")}
          </Button>
        </div>
      )}
    </li>
  )
}

function PanelBody() {
  const { t } = useDevelopmentText()
  const sk = useDevSkin()
  const incoming = useIncomingLinkRequests(true)
  const decide = useDecideLinkRequest()
  const [notice, setNotice] = useState<Notice | null>(null)

  const onDecide = (row: IncomingLinkRequest, action: "approve" | "decline") => {
    setNotice(null)
    decide.mutate(
      { id: row.id, action },
      {
        onSuccess: () =>
          setNotice({ tone: "ok", text: t(action === "approve" ? "dev.linkRequests.added" : "dev.linkRequests.declined") }),
        onError: (err) => setNotice({ tone: "error", text: t(refusalKey(err)) }),
      },
    )
  }

  // 403 / 404: this caller has no requests to decide, whenever it arrives.
  const refusedOutright = incoming.isError && [403, 404].includes(statusOf(incoming.error) ?? 0)
  const rows = refusedOutright ? [] : (incoming.data ?? [])
  // Nothing to act on and nothing just done: no panel (see the header comment).
  if (rows.length === 0 && !notice) return null

  const refreshFailed = incoming.isError && !refusedOutright && rows.length > 0

  return (
    <section
      className={cn("border px-4 py-3", sk.radius, sk.border200)}
      aria-label={t("dev.linkRequests.title")}
      data-testid="link-requests-panel"
    >
      <div className="flex items-center gap-2">
        <UserPlus className={cn("h-4 w-4", sk.text500)} aria-hidden />
        <h2 className={cn("text-sm font-semibold", sk.heading)}>{t("dev.linkRequests.title")}</h2>
        {decide.isPending && <Loader2 className={cn("h-4 w-4 animate-spin", sk.text400)} aria-hidden />}
      </div>
      {rows.length > 0 && <p className={cn("mt-1 text-xs", sk.text500)}>{t("dev.linkRequests.intro")}</p>}
      {refreshFailed && (
        <p className="mt-2 text-xs text-amber-700" data-testid="link-requests-refresh-failed">
          {t("dev.linkRequests.refreshFailed")}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-1">
          {rows.map((r) => (
            <RequestRow key={r.id} row={r} busy={decide.isPending} onDecide={onDecide} />
          ))}
        </ul>
      )}
      {notice && (
        <p
          role={notice.tone === "ok" ? "status" : "alert"}
          className={cn("mt-2 text-xs", notice.tone === "ok" ? "text-emerald-700" : "text-red-700")}
        >
          {notice.text}
        </p>
      )}
    </section>
  )
}

function PanelGate({ audience }: { audience: "manager" | "practitioner" }) {
  const auth = useContext(AuthContext)
  // The server answers this list for `manager` only; a practitioner (or anyone
  // else) would be refused, so they make no call at all.
  if (audience !== "manager" || auth?.hasRole(ROLES.MANAGER) !== true) return null
  return <PanelBody />
}

export function LinkRequestsPanel({ audience }: { audience: "manager" | "practitioner" }) {
  return (
    <ErrorBoundary fallback={() => null}>
      <PanelGate audience={audience} />
    </ErrorBoundary>
  )
}
