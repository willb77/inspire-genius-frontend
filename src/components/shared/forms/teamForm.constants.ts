import { getTeamFormRules } from "./formRules";

export type TeamFormValues = {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
};

export const TEAM_ROLES = [
  "Admin",
  "Manager",
  "Employee",
  "Human Resource",
  "Lead",
] as const;

export const TEAM_FORM_DEFAULTS: TeamFormValues = {
  name: "",
  email: "",
  role: "",
  status: "Active",
};

/** English-identity. Components use getTeamFormRules(t). */
export const TEAM_FORM_RULES = getTeamFormRules();
