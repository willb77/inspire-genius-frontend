/**
 * U7: the one-line "people are waiting to join your team" notice on the
 * Studio page. The requests themselves are answered in the "Add people"
 * dialog's Requests tab; this line is what keeps a waiting request visible on
 * the page, because a request hidden inside a dialog is one nobody sees, and
 * it expires on its own after 14 days.
 *
 * Shown only to the manager audience held by a manager, and only while at
 * least one request waits — the same rules the old inline panel used (an
 * empty list, a 403 / 404 and a failed first read show nothing). Its own error
 * boundary: a fault here blanks the line, never the roster.
 */
import { UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { cn } from "@/lib/utils"
import {
  useCanSeeLinkRequests,
  useWaitingLinkRequestCount,
  type StudioAudience,
} from "@/hooks/manager/development/useWaitingLinkRequests"
import { useDevSkin } from "./skin"

function NoticeBody({ onReview }: { onReview: () => void }) {
  const { t } = useTranslation("managerPages")
  const sk = useDevSkin()
  const count = useWaitingLinkRequestCount()
  if (count === 0) return null
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 border px-4 py-2", sk.radius, sk.border200)}
      data-testid="link-requests-notice"
    >
      <UserPlus className={cn("h-4 w-4", sk.text500)} aria-hidden />
      <p role="status" className={cn("text-sm", sk.text700)}>
        {t("addMemberDialog.requestsWaiting", { defaultValue: "People waiting to join your team: {{n}}", n: count })}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onReview}>
        {t("addMemberDialog.review", { defaultValue: "Review" })}
      </Button>
    </div>
  )
}

function NoticeGate({ audience, onReview }: { audience: StudioAudience; onReview: () => void }) {
  if (!useCanSeeLinkRequests(audience)) return null
  return <NoticeBody onReview={onReview} />
}

export function LinkRequestsNotice({ audience, onReview }: { audience: StudioAudience; onReview: () => void }) {
  return (
    <ErrorBoundary fallback={() => null}>
      <NoticeGate audience={audience} onReview={onReview} />
    </ErrorBoundary>
  )
}
