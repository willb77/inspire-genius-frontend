import type { OrganizationFormData } from "@/types/super-admin/organization/form-types";
import { getOrganizationFormRules } from "./formRules";

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

/** English-identity: the same rules the form always had. Components use getOrganizationFormRules(t). */
export const ORGANIZATION_FORM_RULES = getOrganizationFormRules();

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