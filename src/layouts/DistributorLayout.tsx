import React from "react"
import AppShell from "./AppShell"

export type DistributorLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function DistributorLayout({ children, className }: DistributorLayoutProps) {
  return (
    <AppShell role="distributor" className={className}>
      {children}
    </AppShell>
  )
}
