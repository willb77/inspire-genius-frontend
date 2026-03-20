import React from "react"
import AppShell from "./AppShell"

export type CompanyAdminLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function CompanyAdminLayout({ children, className }: CompanyAdminLayoutProps) {
  return (
    <AppShell role="company-admin" className={className}>
      {children}
    </AppShell>
  )
}
