import React from "react"
import AppShell from "./AppShell"

export type ManagerLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function ManagerLayout({ children, className }: ManagerLayoutProps) {
  return (
    <AppShell role="manager" className={className}>
      {children}
    </AppShell>
  )
}
