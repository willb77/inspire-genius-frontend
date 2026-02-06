import type { OrganizationFormData } from "@/types/super-admin/organization/form-types";
import { validateEmail } from "./validateEmail";

export const LICENSE_TYPES = ["Basic", "Standard", "Premium", "Enterprise"] as const;

export const ORGANIZATION_FORM_DEFAULTS: OrganizationFormData = {
  // Step 1: Organization Info
  organization_name: "",
  type: "",
  email: "",
  contact: "",
  website_url: "",
  address: "",
  logo: null,

  // Step 2: Coaches Info
  coaches: [],

  // Step 3: License Info
  license_type: "",
  license_key: "",
  license_start_date: "",
  license_end_date: "",

  // Internal tracking
  organization_id: "",
};

export const ORGANIZATION_FORM_RULES = {
  organization_name: { required: "Organization name is required" },
  type: { required: "Organization type is required" },
  email: {
    required: "Organization email is required",
    validate: (value: string) => validateEmail(value, "Please enter a valid email address"),
  },
  contact: {
    required: "Contact number is required",
    pattern: {
      value: /^\d{10,15}$/,
      message: "Please enter a valid contact number",
    },
  },
  website_url: {
    validate: (value: string) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return "Please enter a valid URL";
      }
    },
  },
  address: { required: "Address is required" },
  logo: {},

  coaches: {},

  license_type: { required: "License type is required" },
  license_key: { required: "License key is required" },
  license_start_date: { required: "Start date is required" },
  license_end_date: { required: "End date is required" },
} as const;

export const ORGANIZATION_STEPS = [
  { label: "Organization Info" },
  { label: "Coaches Info" },
  { label: "License Info" },
];

export const getOrganizationStepFields = (
  step: number
): (keyof OrganizationFormData)[] => {
  switch (step) {
    case 0:
      return ["organization_name", "type", "email", "contact", "website_url", "address"];
    case 1:
      return ["coaches"];
    case 2:
      return [
        "license_type",
        "license_key",
        "license_start_date",
        "license_end_date",
      ];
    default:
      return [];
  }
};