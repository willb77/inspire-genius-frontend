/**
 * Types for the Broadcast Alert system (super-admin platform alerts +
 * per-user in-app notifications). Mirrors the broadcast-service schemas.
 */

export type Severity = "info" | "success" | "warning" | "critical"

export const SEVERITIES: Severity[] = ["info", "success", "warning", "critical"]

/** The six platform role groups a broadcast can target. */
export type BroadcastRole =
  | "user"
  | "manager"
  | "company-admin"
  | "practitioner"
  | "distributor"
  | "super-admin"

export const BROADCAST_ROLES: { value: BroadcastRole; label: string }[] = [
  { value: "user", label: "Users (employees)" },
  { value: "manager", label: "Managers" },
  { value: "company-admin", label: "Company Admins" },
  { value: "practitioner", label: "Practitioners" },
  { value: "distributor", label: "Distributors" },
  { value: "super-admin", label: "Super Admins" },
]

/** Precise recipient control. Exclusion always wins over inclusion. */
export type AudienceSpec = {
  all: boolean
  include_roles: BroadcastRole[]
  exclude_roles: BroadcastRole[]
  include_emails: string[]
  exclude_emails: string[]
}

export const EMPTY_AUDIENCE: AudienceSpec = {
  all: false,
  include_roles: [],
  exclude_roles: [],
  include_emails: [],
  exclude_emails: [],
}

export type BroadcastCreatePayload = {
  title: string
  severity: Severity
  html_body: string
  audience: AudienceSpec
  /** Opt-in: also email the branded message to each recipient via SES. */
  send_email: boolean
}

export type Broadcast = {
  id: string
  title: string
  severity: Severity
  html_body: string
  created_by: string
  recipient_count: number
  email_requested?: boolean
  email_sent_count?: number
  email_failed_count?: number
  created_at: string
}

export type RecipientSample = { email: string; role: string }

export type AudiencePreview = {
  count: number
  sample: RecipientSample[]
}

export type AccessInfo = {
  authorized: boolean
  is_owner: boolean
  email: string
}

export type AdminEntry = {
  email: string
  granted_by: string
  granted_at: string
  is_owner: boolean
}

export type NotificationItem = {
  id: string
  broadcast_id: string
  severity: Severity
  title: string
  html_body: string
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}
