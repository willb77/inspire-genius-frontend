import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Building2, Clock, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateJoinRequest, useMyJoinRequest } from "@/hooks/org/useOrgMembership"

/**
 * Lets a user say which organisation they belong to.
 *
 * The declaration grants nothing. Membership is written only when a manager or
 * company-admin of that organisation approves, so this component is careful
 * never to imply otherwise — "Request sent", not "You've joined".
 *
 * Until then the user's token carries no tenant key and every org-scoped
 * surface is legitimately empty. That is worth SAYING rather than leaving them
 * to infer it from blank pages.
 */
export function DeclareOrganisation({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation("orgUi")
  const [orgId, setOrgId] = useState("")
  const [note, setNote] = useState("")
  const { data: existing, isLoading } = useMyJoinRequest()
  const create = useCreateJoinRequest()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("checking", { defaultValue: "Checking your organisation…" })}</p>
  }

  if (existing?.status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-medium text-amber-900">{t("pending.title", { defaultValue: "Waiting for approval" })}</p>
          <p className="mt-1 text-sm text-amber-800">
            {t("pending.body", { defaultValue: "You asked to join this organisation. A manager has to approve it before you can see your team's data — until then, those pages will be empty." })}
          </p>
        </div>
      </div>
    )
  }

  if (existing?.status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">{t("approved.title", { defaultValue: "You're in" })}</p>
          <p className="mt-1 text-sm text-emerald-800">
            {t("approved.body", { defaultValue: "Your membership was approved. Sign out and back in if your pages still look empty — your access is refreshed when you next sign in." })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {existing?.status === "rejected" && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-medium text-rose-900">{t("rejected.title", { defaultValue: "That request wasn't approved" })}</p>
            {existing.decision_reason && (
              <p className="mt-1 text-sm text-rose-800">{existing.decision_reason}</p>
            )}
            <p className="mt-1 text-sm text-rose-800">{t("rejected.askAgain", { defaultValue: "You can ask again below." })}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Building2 className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor="org-id" className="text-sm font-medium">
              {t("form.label", { defaultValue: "Which organisation are you with?" })}
            </label>
            <p className="text-sm text-muted-foreground">
              {t("form.help", { defaultValue: "Your manager will confirm this before it takes effect." })}
            </p>
          </div>
          <Input
            id="org-id"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder={t("form.orgIdPlaceholder", { defaultValue: "Organisation ID from your invitation" })}
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("form.notePlaceholder", { defaultValue: "Anything that helps them recognise you — your team, your start date (optional)" })}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              disabled={!orgId.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  { org_id: orgId.trim(), note: note.trim() || undefined },
                  { onSuccess: () => onDone?.() },
                )
              }
            >
              {create.isPending
                ? t("form.sending", { defaultValue: "Sending…" })
                : t("form.send", { defaultValue: "Send request" })}
            </Button>
            {onDone && (
              <Button variant="ghost" onClick={onDone}>
                {t("form.skip", { defaultValue: "Skip for now" })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeclareOrganisation
