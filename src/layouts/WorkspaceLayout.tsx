import React from "react"
import ManagerLayout from "./ManagerLayout"
import PractitionerLayout from "./PractitionerLayout"

/** The two roles that share the workspace screens (ROLE-C). */
export type WorkspaceAudience = "manager" | "practitioner"

export type WorkspaceLayoutProps = {
  /** Which chrome to render. Set by the ROUTE, never read from the signed-in
   *  user: a super-admin on /practitioner/* must keep the practitioner chrome. */
  audience: WorkspaceAudience
  children: React.ReactNode
}

/**
 * The chrome for a screen that managers and practitioners share (ROLE-C).
 *
 * Each shared screen is one component mounted at both /manager/* and
 * /practitioner/*; routes.tsx passes the `audience` for the prefix. The prop
 * is required on purpose — a default would quietly put a forgotten route in
 * the manager sidebar. Same pattern as DevelopmentStudio's `audience`.
 */
export default function WorkspaceLayout({ audience, children }: WorkspaceLayoutProps) {
  return audience === "practitioner" ? (
    <PractitionerLayout>{children}</PractitionerLayout>
  ) : (
    <ManagerLayout>{children}</ManagerLayout>
  )
}
