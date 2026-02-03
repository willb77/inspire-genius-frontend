import type { OrganizationFormData } from "@/types/super-admin/organization/form-types";

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
    validate: (value: string) => {
      if (!value) return true;

      const msg = "Please enter a valid email address";
      const atIndex = value.indexOf("@");
      if (atIndex <= 0) return msg;
      if (value.indexOf("@", atIndex + 1) !== -1) return msg;

      const local = value.slice(0, atIndex);
      const domain = value.slice(atIndex + 1);
      if (!local || !domain) return msg;

      for (let i = 0; i < local.length; i += 1) {
        const ch = local[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isDigit = code >= 48 && code <= 57;
        const isAllowedSymbol = ch === "." || ch === "_" || ch === "%" || ch === "+" || ch === "-";
        if (!(isUpper || isLower || isDigit || isAllowedSymbol)) return msg;
      }

      const lastDot = domain.lastIndexOf(".");
      if (lastDot <= 0 || lastDot >= domain.length - 1) return msg;

      const host = domain.slice(0, lastDot);
      const tld = domain.slice(lastDot + 1);
      if (tld.length < 2) return msg;

      for (let i = 0; i < host.length; i += 1) {
        const ch = host[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isDigit = code >= 48 && code <= 57;
        const isAllowedSymbol = ch === "." || ch === "-";
        if (!(isUpper || isLower || isDigit || isAllowedSymbol)) return msg;
      }

      for (let i = 0; i < tld.length; i += 1) {
        const ch = tld[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        if (!(isUpper || isLower)) return msg;
      }

      return true;
    },
  },
  contact: {
    required: "Contact number is required",
    pattern: {
      value: /^[0-9]{10,15}$/,
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