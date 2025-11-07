export type UserFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
};

export const User_FORM_DEFAULTS: UserFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  role: "",
  status: "Active",
};

export const User_FORM_RULES = {
  first_name: { required: "First name is required" },
  last_name: { required: "Last name is required" },
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