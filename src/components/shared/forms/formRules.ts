/**
 * Rule factories for the organisation, issue, team, user and coach forms (A10-b3). Each takes the caller's `t`
 * (from useTranslation("formsUi")) and resolves the messages at call time; with no `t` it returns the English,
 * which is what the exported *_FORM_RULES constants in the sibling *.constants.ts files are built from.
 *
 * They live apart from the constants files so that a test which mocks a constants module does not take the
 * factories down with it. Behaviour of every rule other than its message text is unchanged.
 */
import { say, type FormsTranslate } from "./formsUiCopy"
import { validateEmail } from "./validateEmail"

export function getOrganizationFormRules(t?: FormsTranslate) {
  return {
    organization_name: { required: say(t, "org.nameRequired") },
    type: { required: say(t, "org.typeRequired") },
    email: {
      required: say(t, "org.emailRequired"),
      validate: (value: string) => validateEmail(value, say(t, "org.emailInvalid")),
    },
    contact: {
      required: say(t, "org.contactRequired"),
      pattern: {
        value: /^\d{10,15}$/,
        message: say(t, "org.contactInvalid"),
      },
    },
    website_url: {
      validate: (value: string) => {
        if (!value) return true
        try {
          new URL(value)
          return true
        } catch {
          return say(t, "org.urlInvalid")
        }
      },
    },
    address: { required: say(t, "org.addressRequired") },
    logo: {},

    coaches: {},

    license_type: { required: say(t, "org.licenseTypeRequired") },
    license_key: { required: say(t, "org.licenseKeyRequired") },
    license_start_date: { required: say(t, "org.startDateRequired") },
    license_end_date: { required: say(t, "org.endDateRequired") },
  }
}

/** The stored values. Kept here so the factory and IssueDetailPage.constants.ts share one list. */
export const ISSUE_STATUS_VALUES = ["open", "in-progress", "resolved", "closed"] as const

export function getIssueDetailRules(t?: FormsTranslate) {
  return {
    comment: {
      required: say(t, "issue.commentRequired"),
      minLength: {
        value: 5,
        message: say(t, "issue.commentMin"),
      },
      maxLength: {
        value: 300,
        message: say(t, "issue.commentMax"),
      },
      pattern: {
        value: /^[A-Za-z0-9\s.,!?'"-]+$/,
        message: say(t, "issue.commentChars"),
      },
    },
    status: {
      // Not required, but you can enable this if needed:
      // required: "Status is required",
      validate: (value: string) => {
        if (value && !(ISSUE_STATUS_VALUES as readonly string[]).includes(value)) {
          return say(t, "issue.statusInvalid")
        }
        return true
      },
    },
  }
}

export function getTeamFormRules(t?: FormsTranslate) {
  return {
    name: { required: say(t, "team.nameRequired") },
    email: {
      required: say(t, "team.emailRequired"),
      // Bounded, simple email pattern to avoid catastrophic backtracking
      // local-part up to 64, domain up to 253, simple TLD 2+
      validate: (value: string) => validateEmail(value, say(t, "team.emailInvalid")),
    },
    role: { required: say(t, "team.roleRequired") },
    status: {},
  }
}

export function getUserFormRules(t?: FormsTranslate) {
  return {
    first_name: { required: say(t, "user.firstNameRequired") },
    last_name: { required: say(t, "user.lastNameRequired") },
    email: {
      required: say(t, "user.emailRequired"),
      validate: (value: string) => {
        const bad = say(t, "user.emailInvalid")
        if (!value) return true
        if (/\s/.test(value)) return bad

        const atIndex = value.indexOf("@")
        if (atIndex <= 0) return bad
        if (value.indexOf("@", atIndex + 1) !== -1) return bad

        const domain = value.slice(atIndex + 1)
        const lastDot = domain.lastIndexOf(".")
        if (lastDot <= 0) return bad
        if (lastDot >= domain.length - 1) return bad

        return true
      },
    },
    role: { required: say(t, "user.roleRequired") },
    status: {},
    skip_onboarding: {},
    organization_id: {},
  }
}

export function getCoachFormRules(t?: FormsTranslate) {
  return {
    name: { required: say(t, "coach.nameRequired") },
    category: { required: say(t, "coach.categoryRequired") },
    voice_style: {},
    voice_description: {},
    persona: {},
    status: {},
  }
}
