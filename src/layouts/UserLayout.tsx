import React from "react"
import AppShell from "./AppShell"

export type UserLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function UserLayout({ children, className }: UserLayoutProps) {
  return (
    <AppShell role="user" className={className}>
      {children}
    </AppShell>
  )
}
