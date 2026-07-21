import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { inviteFellowsBulk } from "@/services/honor/coach.service"
import { requestMagicLink } from "@/services/magic-auth/magic-auth.service"

/**
 * Bulk "Send invitations to selected" from My Fellows. Converts/links the
 * selected fellows in one request; when `sendEmail` is on, fires the magic-link
 * intake email to each fellow the server flagged as newly invited (the account
 * is created either way — off = create silently, send later).
 */
export function useHonorInvitations() {
  const qc = useQueryClient()
  return useMutation<
    { converted: number; emailed: number },
    Error,
    { fellowIds: string[]; sendEmail: boolean }
  >({
    mutationFn: async ({ fellowIds, sendEmail }) => {
      const resp = await inviteFellowsBulk(fellowIds, false, sendEmail)
      const results = resp.data?.results ?? []
      let emailed = 0
      if (sendEmail) {
        for (const r of results) {
          if (r.invitationSent && r.email) {
            try {
              await requestMagicLink({ email: r.email })
              emailed++
            } catch {
              /* SES-deferred / sandbox — account is still created */
            }
          }
        }
      }
      return { converted: resp.data?.converted ?? 0, emailed }
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["honor", "caseload"] })
      toast.success(
        vars.sendEmail
          ? `${res.converted} fellow(s) invited — ${res.emailed} email(s) sent.`
          : `${res.converted} fellow(s) linked — no invitations sent.`,
      )
    },
    onError: (e) => toast.error(e.message || "Bulk invite failed"),
  })
}
