import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"

/** All supported user roles */
export type UserRole = "user" | "manager" | "company-admin" | "practitioner" | "distributor" | "super-admin"

/** Numeric hierarchy — higher number = more privileges */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  manager: 1,
  "company-admin": 2,
  practitioner: 3,
  distributor: 4,
  "super-admin": 5,
}

/** Returns true if the given string is a valid UserRole */
export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && value in ROLE_HIERARCHY
}

/** Configuration bundle for a single role */
export type RoleConfig = {
  role: UserRole
  label: string
  description: string
  homeRoute: string
  navItems: NavItemDef[]
}

/** Role label mapping (allows string index for backward compat with legacy roles) */
export const ROLE_LABELS: Record<string, string> = {
  user: "User",
  manager: "Manager",
  "company-admin": "Company Admin",
  practitioner: "Practitioner",
  distributor: "Distributor",
  "super-admin": "Super Admin",
  // Legacy role names (backward compatibility)
  admin: "Admin",
  "manager-admin": "Manager Admin",
}

/** Path prefixes each role is allowed to access */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  "super-admin": [
    "/super-admin",
    "/manager",
    "/company-admin",
    "/practitioner",
    "/distributor",
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
    "/feedback",
    "/analytics",
    "/prism-assessment",
  ],
  distributor: [
    "/distributor",
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
    "/feedback",
    "/analytics",
  ],
  practitioner: [
    "/practitioner",
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
    "/feedback",
    "/analytics",
  ],
  "company-admin": [
    "/company-admin",
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
    "/feedback",
    "/analytics",
  ],
  manager: [
    "/manager",
    "/home",
    "/dashboard",
    "/coaches",
    "/documents",
    "/settings",
    "/help",
    "/feedback",
    "/analytics",
  ],
  user: ["/home", "/dashboard", "/coaches", "/documents", "/settings", "/help", "/feedback", "/analytics", "/prism-assessment"],
}

/** Check whether a role (string) has access to a given path */
export function hasAccess(role: string | null | undefined, path: string): boolean {
  const normalizedRole = (role ?? "").toLowerCase()
  const allowedPrefixes = ROLE_PERMISSIONS[normalizedRole as UserRole]
  if (!allowedPrefixes) return false
  return allowedPrefixes.some((prefix) => path.startsWith(prefix))
}
