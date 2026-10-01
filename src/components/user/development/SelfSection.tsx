/**
 * One section of My development, and the state machine every section shares.
 *
 * ## Why the ORDER of the branches is the whole point
 *
 * Resolution is strictly `loading → error → empty → content`, and the error
 * branch comes BEFORE the empty branch. For a member who has just joined, the
 * correct answer to most of these sections is "nothing yet" — so a failed read
 * that fell through to the empty state would be indistinguishable from the
 * right answer. Nobody reports that: the page looks considered, the tests pass,
 * and the person concludes they have no development plan when in fact the
 * request 500'd. TDS-10 was caught doing exactly this two days before this
 * file was written.
 *
 * Hence: `isError` wins over emptiness, always, and the error branch names
 * itself as a loading failure rather than as an absence.
 *
 * ## Why the empty state has two sentences
 *
 * "Nothing here" is not an empty state, it is a shrug. The empty state has to
 * say what would put something here and who can do it — the person themselves,
 * or their coach — otherwise a section that is working correctly still tells
 * the reader nothing they can act on.
 */
import type { ReactNode } from "react"
import { AlertCircle, RefreshCw, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type SelfSectionProps = {
  /** Anchors the heading for the in-page section links. */
  id: string
  title: string
  icon: LucideIcon
  /** One second-person sentence: what this section is. */
  lead: string
  isLoading: boolean
  /** A failed READ. Never conflated with an empty result — see the note above. */
  isError: boolean
  /** The message from the failed read, already reduced to a string. */
  errorMessage?: string
  onRetry?: () => void
  /** True only when the read SUCCEEDED and returned nothing. */
  isEmpty: boolean
  /** What would put something here. */
  emptyHeadline: string
  /** Who can do it, in second person. */
  emptyBody: string
  /** Rendered beside the title (a count, an "Add" control). */
  actions?: ReactNode
  /** Always rendered, whatever the state — the self-declare forms live here so
   *  a person with an empty section can still put the first thing in it. */
  always?: ReactNode
  children?: ReactNode
}

export default function SelfSection({
  id,
  title,
  icon: Icon,
  lead,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isEmpty,
  emptyHeadline,
  emptyBody,
  actions,
  always,
  children,
}: SelfSectionProps) {
  return (
    <Card id={id} className="shadow-sm scroll-mt-20">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 text-left">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        {isLoading ? (
          <div className="space-y-2" data-testid={`${id}-loading`}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          // Deliberately worded as a failure to LOAD, not as "you have
          // nothing". The two are different facts and the person is entitled
          // to know which one they are looking at.
          <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-2">
              <p>
                We couldn&apos;t load this section, so we can&apos;t tell you what is in it.
                {errorMessage ? ` ${errorMessage}` : ""}
              </p>
              {onRetry && (
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm">
            <p className="font-medium">{emptyHeadline}</p>
            <p className="mt-1 text-muted-foreground">{emptyBody}</p>
          </div>
        ) : (
          children
        )}
        {always}
      </CardContent>
    </Card>
  )
}
