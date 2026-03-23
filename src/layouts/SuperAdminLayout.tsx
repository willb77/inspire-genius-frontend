import React from "react"
import AppShell from "./AppShell"

export type SuperAdminLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  return (
    <AppShell role="super-admin" className={className}>
      {children}
    </AppShell>
  )
}
