import { validateEmail } from "./validateEmail";

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

export const TEAM_FORM_RULES = {
  name: { required: "Name is required" },
  email: {
    required: "Email is required",
    // Bounded, simple email pattern to avoid catastrophic backtracking
    // local-part up to 64, domain up to 253, simple TLD 2+
    validate: (value: string) => validateEmail(value, "Enter a valid email"),
  },
  role: { required: "Role is required" },
  status: {},
} as const;
