import React from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Must match the page's menu label. */
  title: string
  /** One plain-English line saying what the page is for. */
  description?: string
  /** Optional "← Back to …" text link. */
  back?: { to: string; label: string }
  /** At most one main button, shown on the right. */
  action?: React.ReactNode
  className?: string
}

/**
 * House-style page header: back link, title, one-line purpose, one main action.
 * Theme tokens only, so it follows dark mode and the accessible themes.
 */
export function PageHeader({ title, description, back, action, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-2", className)}>
      {back && (
        <Link
          to={back.to}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
