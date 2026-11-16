import { useState } from "react"
import { Check, Inbox, X } from "lucide-react"

import ManagerLayout from "@/layouts/ManagerLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/useAuth"
import {
  useDecideJoinRequest,
  useJoinRequestQueue,
} from "@/hooks/org/useOrgMembership"
import { useTranslation } from "react-i18next"

/**
 * The approval queue.
 *
 * Approving here is what writes a user's tenant key — it grants them sight of
 * this organisation's data. The screen says so plainly rather than presenting
 * a bare accept/reject pair, because the consequence is not obvious from the
 * verb.
 *
 * There is no notification when a request arrives; the queue is pull-only. So
 * the empty state has to distinguish "nothing waiting" from "not loaded",
 * which is the failure this project keeps meeting.
 */
export default function JoinRequests() {
  const { t } = useTranslation("managerPages")
  const { user } = useAuth()
  const orgId = (user as { org_id?: string } | null)?.org_id
  const { data, isLoading, isError } = useJoinRequestQueue(orgId)
  const decide = useDecideJoinRequest(orgId)
  const [reasons, setReasons] = useState<Record<string, string>>({})

  return (
    <ManagerLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold">{t("joinRequests.joinRequests", { defaultValue: "Join requests" })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("joinRequests.peopleWhoSayTheyBelong", { defaultValue: "People who say they belong to your organisation. Approving one gives them access to your team's data, so check you recognise them first." })}</p>
        </header>

        {!orgId && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("joinRequests.yourAccountIsnTLinked", { defaultValue: "Your account isn't linked to an organisation yet, so there's no queue to show. A company administrator needs to add you before you can approve anyone." })}</p>
        )}

        {orgId && isLoading && (
          <p className="text-sm text-muted-foreground">{t("joinRequests.loadingRequests", { defaultValue: "Loading requests…" })}</p>
        )}

        {orgId && isError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{t("joinRequests.theQueueCouldnTBe", { defaultValue: "The queue couldn't be loaded. This is a failure to fetch, not an empty queue — try again, and tell an administrator if it keeps happening." })}</p>
        )}

        {orgId && !isLoading && !isError && data?.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border p-6 text-muted-foreground">
            <Inbox className="h-5 w-5" />
            <p className="text-sm">{t("joinRequests.nothingWaitingRequestsAppearHere", { defaultValue: "Nothing waiting. Requests appear here when someone declares your organisation at sign-up — there's no email, so it's worth checking back." })}</p>
          </div>
        )}

        {data?.map((req) => (
          <div key={req.id} className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">{req.email}</p>
              <p className="text-sm text-muted-foreground">{t("joinRequests.requested", { defaultValue: "Requested {{value}}", value: new Date(req.created_at).toLocaleDateString() })}</p>
              {req.note && <p className="mt-2 text-sm italic">"{req.note}"</p>}
            </div>
            <Input
              value={reasons[req.id] ?? ""}
              onChange={(e) =>
                setReasons((r) => ({ ...r, [req.id]: e.target.value }))
              }
              placeholder={t("joinRequests.reasonRecordedEitherWayAnd", { defaultValue: "Reason (recorded either way, and shown to them if you reject)" })}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    id: req.id,
                    approve: true,
                    reason: reasons[req.id] || undefined,
                  })
                }
              >
                <Check className="mr-1 h-4 w-4" />{t("joinRequests.approve", { defaultValue: "Approve" })}</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    id: req.id,
                    approve: false,
                    reason: reasons[req.id] || undefined,
                  })
                }
              >
                <X className="mr-1 h-4 w-4" />{t("joinRequests.reject", { defaultValue: "Reject" })}</Button>
            </div>
          </div>
        ))}
      </div>
    </ManagerLayout>
  )
}
