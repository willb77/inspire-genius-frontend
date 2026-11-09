import type { ClientInviteStatus } from "@/types/practitioner-invites"

/** S4 — said beside every freshly issued link. */
export const SHOWN_ONCE_NOTE =
  "This link is shown once. Copy it now — it cannot be shown again. It works once and expires in 14 days."

/** S5 — how each server status reads to the practitioner. */
export const STATUS_LABEL: Record<ClientInviteStatus, string> = {
  pending: "Open",
  claimed: "Claimed",
  claimed_by_other: "Claimed by another account",
  expired: "Expired",
  revoked: "Revoked",
}

/** A new link can be issued for any invite that has not been claimed. */
export function canRotate(status: ClientInviteStatus): boolean {
  return status === "pending" || status === "expired" || status === "revoked"
}

/** Only a still-open link can be revoked; the server refuses a claimed one. */
export function canRevoke(status: ClientInviteStatus): boolean {
  return status === "pending"
}

/** The full link from the server's `/signup#invite=…` path, on this site's origin. */
export function inviteUrl(invitePath: string): string {
  return `${window.location.origin}${invitePath}`
}
