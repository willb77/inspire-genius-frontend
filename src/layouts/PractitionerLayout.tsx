import React from "react"
import AppShell from "./AppShell"

export type PractitionerLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function PractitionerLayout({ children, className }: PractitionerLayoutProps) {
  return (
    <AppShell role="practitioner" className={className}>
      {children}
    </AppShell>
  )
}
