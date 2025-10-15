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
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Enter a valid email",
    },
  },
  role: { required: "Role is required" },
  status: {},
} as const;
