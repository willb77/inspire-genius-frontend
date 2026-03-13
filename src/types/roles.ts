import { ROLES } from "@/constants/routes"

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.COMPANY_ADMIN]: "Company Admin",
  [ROLES.MANAGER_ADMIN]: "Manager Admin",
  [ROLES.USER]: "User",
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ["/super-admin", "/home", "/dashboard", "/coaches", "/documents", "/settings", "/help"],
  [ROLES.ADMIN]: ["/super-admin", "/home", "/dashboard", "/coaches", "/documents", "/settings", "/help"],
  [ROLES.COMPANY_ADMIN]: ["/super-admin/dashboard", "/super-admin/users", "/super-admin/coaches", "/super-admin/settings", "/home", "/dashboard", "/coaches", "/documents", "/settings", "/help"],
  [ROLES.MANAGER_ADMIN]: ["/super-admin/dashboard", "/super-admin/users", "/home", "/dashboard", "/coaches", "/documents", "/settings", "/help"],
  [ROLES.USER]: ["/home", "/dashboard", "/coaches", "/documents", "/settings", "/help"],
}

export function hasAccess(role: string | null | undefined, path: string): boolean {
  const normalizedRole = (role ?? "").toLowerCase()
  const allowedPrefixes = ROLE_PERMISSIONS[normalizedRole]
  if (!allowedPrefixes) return false
  return allowedPrefixes.some((prefix) => path.startsWith(prefix))
}
