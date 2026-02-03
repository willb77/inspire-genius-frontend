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
    validate: (value: string) => {
      if (!value) return true;
      if (/\s/.test(value)) return "Enter a valid email";

      const atIndex = value.indexOf("@");
      if (atIndex <= 0) return "Enter a valid email";
      if (value.indexOf("@", atIndex + 1) !== -1) return "Enter a valid email";

      const domain = value.slice(atIndex + 1);
      const lastDot = domain.lastIndexOf(".");
      if (lastDot <= 0) return "Enter a valid email";
      if (lastDot >= domain.length - 1) return "Enter a valid email";

      return true;
    },
  },
  role: { required: "Role is required" },
  status: {},
} as const;