import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { inviteFellowsBulk, setFellowStatus } from "@/services/honor/coach.service"
import type { FellowStatus, HonorFellow } from "@/types/honor"

/** Input for the bulk "Send invitations" mutation. */
export type HonorBulkInviteInput = {
  fellowIds: string[]
  sendEmail: boolean
  /** The coach's composed acknowledgement message body (HTML). Folded into the
   *  confirmation email server-side; only meaningful when `sendEmail` is true. */
  messageHtml?: string
}

/**
 * Bulk "Send invitations to selected" from My Fellows.
 *
 * Fellows are NOT IG login users — the invite is a confirmation /
 * acknowledgement email that the BACKEND composes and sends. The coach's
 * formatted message body (`messageHtml`) is threaded to the server, which folds
 * it into that email. The FE no longer fires a magic link. When `sendEmail` is
 * off the fellows are linked silently and no email goes out.
 */
export function useHonorInvitations() {
  const qc = useQueryClient()
  return useMutation<{ converted: number }, Error, HonorBulkInviteInput>({
    mutationFn: async ({ fellowIds, sendEmail, messageHtml }) => {
      // keepCoachAccess=true — inviting a fellow must NOT remove them from the
      // coach's roster (the coach mentors them throughout). false soft-deletes
      // the coach↔fellow link and the fellow vanishes from My Fellows.
      const resp = await inviteFellowsBulk(fellowIds, true, sendEmail, messageHtml)
      return { converted: resp.data?.converted ?? 0 }
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["honor", "caseload"] })
      toast.success(
        vars.sendEmail
          ? `${res.converted} fellow(s) invited — confirmation email sent.`
          : `${res.converted} fellow(s) linked — no email sent.`,
      )
    },
    onError: (e) => toast.error(e.message || "Bulk invite failed"),
  })
}

/**
 * Set a fellow's coaching status from My Fellows (Intake pending / Assessed /
 * Invited). Optimistically reflects the change on the cached caseload, then
 * invalidates on settle so the roster reconciles with the server.
 */
export function useSetFellowStatus() {
  const qc = useQueryClient()
  return useMutation<
    { fellowId: string; status: FellowStatus },
    Error,
    { fellowId: string; status: FellowStatus },
    { previous?: HonorFellow[] }
  >({
    mutationFn: async ({ fellowId, status }) => {
      const resp = await setFellowStatus(fellowId, status)
      return resp.data ?? { fellowId, status }
    },
    onMutate: async ({ fellowId, status }) => {
      await qc.cancelQueries({ queryKey: ["honor", "caseload"] })
      const previous = qc.getQueryData<HonorFellow[]>(["honor", "caseload"])
      qc.setQueryData<HonorFellow[]>(["honor", "caseload"], (old) =>
        (old ?? []).map((f) => (f.id === fellowId ? { ...f, status } : f)),
      )
      return { previous }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["honor", "caseload"], ctx.previous)
      toast.error(e.message || "Could not update status")
    },
    onSuccess: () => toast.success("Status updated."),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["honor", "caseload"] })
    },
  })
}
