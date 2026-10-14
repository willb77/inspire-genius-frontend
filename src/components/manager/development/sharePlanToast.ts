import { toast } from "sonner"
import type { SharePlanResult } from "@/services/manager/development/growthService"

/**
 * Tell the manager what "Share with member" actually did.
 *
 * The share used to toast "Development plan shared with …" while the member
 * received nothing. The server now writes the member an in-app notice and says
 * whether it did (`notified`), or that this manager already did so today
 * (`alreadySent`). A response with no `notified` field comes from a server
 * that predates that change, so it keeps the old wording rather than claiming
 * a failure that may not have happened.
 */
export function sharePlanToast(result: SharePlanResult | undefined, name?: string): void {
  const who = name || "the member"
  if (!result || typeof result.notified !== "boolean") {
    toast.success(`Development plan shared with ${who}.`)
    return
  }
  if (result.notified) {
    toast.success(`Sent to ${who}'s notifications.`)
    return
  }
  if (result.alreadySent) {
    toast.success(`Already sent to ${who} today.`)
    return
  }
  toast.warning(`Couldn't notify ${who}; their plan is still on their My Development page.`)
}

export const SHARE_PLAN_ERROR = "Couldn't share the plan. Try again."
