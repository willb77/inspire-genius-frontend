import { getUserFormRules } from "./formRules";

export type UserFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
  // Add-mode only. When true, the invited user skips the onboarding process
  // and is emailed a one-click magic sign-in link instead of a password-setup
  // invitation (maps to the auth-service `demo_account` flag; honored on
  // Dev/Staging-B, rejected in production). Default false = normal onboarding.
  skip_onboarding: boolean;
  // Super-admin only. "" = no organisation. Written through org-service, not
  // the user edit route (membership is user_profiles.org_id).
  organization_id: string;
};

export const User_FORM_DEFAULTS: UserFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  role: "",
  status: "Active",
  skip_onboarding: false,
  organization_id: "",
};

/** English-identity. Components use getUserFormRules(t). */
export const User_FORM_RULES = getUserFormRules();
/** Radix Select cannot use "" as an item value; this stands for "no organisation". */
export const NO_ORG_VALUE = "__no_org__";
