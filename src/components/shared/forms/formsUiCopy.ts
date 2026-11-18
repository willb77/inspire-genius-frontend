/**
 * Form rules and their messages (A10-b3): the validation text for the organisation, issue, team, user and coach
 * forms, plus the display labels for issue statuses and team roles.
 *
 * Translation: these were module-level constants, so nothing here calls t() at import. FORMS_UI_DEFAULTS is the
 * English text and doubles as the i18next `defaultValue`; every `getXRules(t)` factory resolves at render time.
 * Without a `t` a factory returns the English, so the exported constants (ORGANIZATION_FORM_RULES, ...) built
 * from it are identical to what they were. The keys live in public/locales/en/formsUi.json.
 *
 * What is NOT here, on purpose: ISSUE_STATUSES and TEAM_ROLES VALUES (they are stored and sent to the API, so
 * they stay English; only the DISPLAY label is a key) and ORGANIZATION_STEPS (the super-admin wizard branches
 * control flow on those English labels, so they are held).
 */

export const FORMS_UI_NS = "formsUi"

/** The shape of i18next's `t` this file needs (the real one is assignable). */
export type FormsTranslate = (key: string, options: { defaultValue: string; [k: string]: unknown }) => unknown

export const FORMS_UI_DEFAULTS = {
  "org.nameRequired": "Organization name is required",
  "org.typeRequired": "Organization type is required",
  "org.emailRequired": "Organization email is required",
  "org.emailInvalid": "Please enter a valid email address",
  "org.contactRequired": "Contact number is required",
  "org.contactInvalid": "Please enter a valid contact number",
  "org.urlInvalid": "Please enter a valid URL",
  "org.addressRequired": "Address is required",
  "org.licenseTypeRequired": "License type is required",
  "org.licenseKeyRequired": "License key is required",
  "org.startDateRequired": "Start date is required",
  "org.endDateRequired": "End date is required",

  "issue.commentRequired": "Comment is required",
  "issue.commentMin": "Comment must be at least 5 characters long",
  "issue.commentMax": "Comment cannot exceed 300 characters",
  "issue.commentChars": "Comment contains invalid characters",
  "issue.statusInvalid": "Invalid status selected",
  "issueStatus.open": "Open",
  "issueStatus.inProgress": "In progress",
  "issueStatus.resolved": "Resolved",
  "issueStatus.closed": "Closed",

  "team.nameRequired": "Name is required",
  "team.emailRequired": "Email is required",
  "team.emailInvalid": "Enter a valid email",
  "team.roleRequired": "Role is required",
  "teamRole.admin": "Admin",
  "teamRole.manager": "Manager",
  "teamRole.employee": "Employee",
  "teamRole.humanResource": "Human Resource",
  "teamRole.lead": "Lead",

  "user.firstNameRequired": "First name is required",
  "user.lastNameRequired": "Last name is required",
  "user.emailRequired": "Email is required",
  "user.emailInvalid": "Enter a valid email",
  "user.roleRequired": "Role is required",

  "coach.nameRequired": "Coach name is required",
  "coach.categoryRequired": "Category is required",
} as const

export type FormsUiKey = keyof typeof FORMS_UI_DEFAULTS

/** Resolve `key` with its English default. Without a `t` (or when t returns a non-string) the English. */
export function say(t: FormsTranslate | undefined, key: FormsUiKey): string {
  const defaultValue: string = FORMS_UI_DEFAULTS[key]
  if (!t) return defaultValue
  const out = t(key, { defaultValue })
  return typeof out === "string" ? out : defaultValue
}

/** Display label for a stored issue status. The value stays English; an unknown value is shown as it came. */
export function issueStatusLabel(status: string, t?: FormsTranslate): string {
  switch (status) {
    case "open":
      return say(t, "issueStatus.open")
    case "in-progress":
      return say(t, "issueStatus.inProgress")
    case "resolved":
      return say(t, "issueStatus.resolved")
    case "closed":
      return say(t, "issueStatus.closed")
    default:
      return status
  }
}

/** Display label for a stored team role. The value stays English; an unknown value is shown as it came. */
export function teamRoleLabel(role: string, t?: FormsTranslate): string {
  switch (role) {
    case "Admin":
      return say(t, "teamRole.admin")
    case "Manager":
      return say(t, "teamRole.manager")
    case "Employee":
      return say(t, "teamRole.employee")
    case "Human Resource":
      return say(t, "teamRole.humanResource")
    case "Lead":
      return say(t, "teamRole.lead")
    default:
      return role
  }
}
