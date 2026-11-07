import React from "react"
import { AlertTriangle, Inbox, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BUTTON_WORDS } from "@/lib/house/glossary"
import { cn } from "@/lib/utils"

/**
 * House-style loading / empty / error / not-available states — one pattern.
 *
 * The rule this exists to enforce: an error is never disguised as "empty".
 * A failed load and a genuinely empty list look different and say different
 * things, so a broken page cannot pass for a quiet one. Error text is always
 * our own plain sentence; raw server messages are never shown.
 */

export type PageStateProps =
  | { kind: "loading"; rows?: number; className?: string }
  | {
      kind: "empty"
      /** e.g. "No clients yet" */
      title: string
      /** Why it is empty, in one sentence. */
      message?: string
      /** One button. */
      action?: React.ReactNode
      className?: string
    }
  | {
      kind: "error"
      /** e.g. "We couldn't load your team." */
      message: string
      onRetry?: () => void
      /** Where "Get help" goes; omit to hide it. */
      helpHref?: string
      className?: string
    }
  | {
      kind: "unavailable"
      /** e.g. "Job matches are switched off for now." */
      message: string
      /** A way back or onward. */
      action?: React.ReactNode
      className?: string
    }

export function PageState(props: PageStateProps) {
  if (props.kind === "loading") {
    return (
      <div className={cn("space-y-3", props.className)} role="status" aria-label="Loading">
        {Array.from({ length: props.rows ?? 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-muted" />
        ))}
      </div>
    )
  }

  if (props.kind === "error") {
    return (
      <div
        role="alert"
        className={cn("flex flex-col items-center justify-center py-12 text-center", props.className)}
      >
        <AlertTriangle className="mb-3 h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="mb-4 max-w-sm text-base text-foreground">{props.message}</p>
        <div className="flex gap-2">
          {props.onRetry && (
            <Button variant="outline" size="sm" onClick={props.onRetry}>
              {BUTTON_WORDS.tryAgain}
            </Button>
          )}
          {props.helpHref && (
            <Button variant="ghost" size="sm" asChild>
              <a href={props.helpHref}>Get help</a>
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (props.kind === "unavailable") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-start gap-3 rounded-md border border-border bg-muted p-4",
          props.className,
        )}
      >
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-foreground">{props.message}</p>
        </div>
        {props.action}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", props.className)}>
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mb-1 text-base font-semibold text-foreground">{props.title}</h2>
      {props.message && <p className="mb-4 max-w-sm text-sm text-muted-foreground">{props.message}</p>}
      {props.action}
    </div>
  )
}

/** One shared banner for any page still showing sample data (demo builds only). */
export function SampleDataBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-100",
        className,
      )}
    >
      Sample data — not your organization's.
    </div>
  )
}
