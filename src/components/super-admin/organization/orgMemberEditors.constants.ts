/** Sentinel for "no manager" / "remove from organization" (Select needs a non-empty value). */
export const NONE_VALUE = "__none__";

/** The six platform roles, in the order the role route accepts them. */
export const EDITABLE_ROLES = [
  "user",
  "manager",
  "company-admin",
  "practitioner",
  "distributor",
  "super-admin",
] as const;

export type PersonOption = { id: string; name: string };
