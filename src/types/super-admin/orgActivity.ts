/**
 * Organization activity report (agent-engine, super-admin only).
 *
 * Contract: GET /v1/agents/admin/org-activity/{member-counts | report | report.docx}.
 * The on-screen `report` carries capped long tables (`members`, `prism`);
 * `members_total` / `prism_total` say how many exist and the .docx has its own cap.
 */
export type OrgActivityMember = {
  uid: string
  name: string
  email: string
  role: string
  joined: string | null
  internal: boolean
  login_events: number
  login_days: number
  first_login: string | null
  last_login: string | null
  chat_msgs: number
  goals: number
  active_days: number
  ever_active: boolean
}

export type OrgActivityEmpty = "no_members" | "no_customer_members" | "no_activity" | null

export type OrgActivityReport = {
  org: { id: string; name: string }
  include_internal: boolean
  as_of: string | null
  generated_on: string
  timezone: "Eastern" | "UTC"
  empty: OrgActivityEmpty
  counts: {
    profiles_total: number
    customers: number
    internal: number
    included: number
    included_ever_active: number
    included_never_active: number
    customers_ever_active: number
  }
  roles: Record<string, number>
  members: OrgActivityMember[]
  members_total: number
  members_preview_cap: number
  internal_emails: string[]
  chat_total: number
  last_login: string | null
  chat_by_agent: { agent_name: string; n: number; answered: number }[]
  prism: { name: string; questionnaire: string; requested: string | null; completed: string | null; status: string }[]
  prism_total: number
  prism_preview_cap: number
  prism_completed: number
  goals_total: number
  goal_cats: { category: string; n: number }[]
  goal_status: Record<string, number>
  weekly: { wk: string; users: number; logins: number; chats: number }[]
  peak: { wk: string; users: number; logins: number; chats: number; created_in_week: number } | null
  dow: number[]
  hour: number[]
  frequency: {
    active_members: number
    median_active_days: number | null
    max_active_days: number | null
    single_day_members: number
  }
  never_active: string[]
  lumen_excluded: number
  truncated: { roster?: boolean; events?: boolean; prism?: boolean; goals?: boolean }
  caps: { roster: number; events: number; prism: number; goals: number }
}

export type OrgActivityOrg = { id: string; name: string; memberCount: number }

export type OrgActivityDocx = { blob: Blob; filename: string }
