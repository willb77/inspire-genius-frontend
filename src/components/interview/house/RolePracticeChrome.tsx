import React from "react"
import UserLayout from "@/layouts/UserLayout"

/**
 * House style (interview area): the practice page in the signed-in role's OWN
 * chrome.
 *
 * The practice page is open to every role. `UserLayout` resolves the chrome by
 * role (RM-1/RM-2): a manager, company admin, practitioner or distributor gets
 * their own menu, where the same menu item lights up; a super-admin the
 * super-admin menu; a user the user menu. Until RM-9a this component chose the
 * layout itself, the same way (CSA docs/analysis/2026-11-26-rm-9-csa.md,
 * monorepo); it stays so the interview page keeps one import.
 *
 * Display only. The route, its guard and every data call are unchanged.
 */
export default function RolePracticeChrome({ children }: { children: React.ReactNode }) {
  return <UserLayout>{children}</UserLayout>
}
