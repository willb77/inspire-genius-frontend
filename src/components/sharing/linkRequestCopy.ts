/** MMLR-5: the member card's fixed copy and status wording, shared with its tests. */

export const SENT_MESSAGE = "Sent. If that person can accept requests, they'll see it."
export const NO_SHARE_FOUND = "We couldn't find a share to stop — check the list above."
export const REFRESH_FAILED = "We couldn't refresh your requests just now."

/**
 * What the member sees for a status. Their own actions read as themselves;
 * everything else — declined, cancelled, expired, the server's `closed`, and
 * any status this card does not know — reads "Closed", with no detail.
 */
export function memberStatusLabel(status: string): string {
  if (status === "pending") return "Waiting for a reply"
  if (status === "approved") return "Added"
  if (status === "withdrawn") return "Withdrawn"
  if (status === "left") return "Left the team"
  return "Closed"
}
