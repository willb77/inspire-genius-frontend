import React from "react"
import UserLayout from "@/layouts/UserLayout"
import UnifiedLayout from "@/layouts/UnifiedLayout"
import { useAuth } from "@/context/useAuth"
import { isUserRole } from "@/types/roles"

/**
 * House style (interview area): the practice page in the signed-in role's OWN
 * chrome.
 *
 * The practice page is open to every role, but it always rendered UserLayout,
 * so a manager or practitioner who opened it from their own menu landed in the
 * user menu. This mirrors the chrome resolution Goals Studio and My
 * development already use: a user and a super-admin keep UserLayout (which
 * already renders the super-admin's sections); every other role gets
 * UnifiedLayout with its own menu, where the same menu item lights up.
 *
 * Display only. The route, its guard and every data call are unchanged.
 */
export default function RolePracticeChrome({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const role = isUserRole(user?.role) ? user?.role : undefined
  if (!role || role === "user" || role === "super-admin") {
    return <UserLayout>{children}</UserLayout>
  }
  return <UnifiedLayout role={role}>{children}</UnifiedLayout>
}
