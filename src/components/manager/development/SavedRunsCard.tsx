import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SavedRun } from "@/lib/savedAnalysis"

/**
 * A list of kept runs, with Open and Delete.
 *
 * Presentational only: it takes the rows and two callbacks and reaches nothing
 * — same contract as the panels in this folder, and for the same reason. The
 * store behind it is per-caller.
 *
 * Four states, kept distinct on purpose. `loading` and `empty` and `error` are
 * three different claims, and collapsing `error` into `empty` is how a failed
 * read comes to tell a manager their saved work is gone.
 */
export default function SavedRunsCard({
  heading,
  blurb,
  runs,
  isLoading,
  isError,
  errorLabel,
  emptyLabel,
  openLabel,
  onOpen,
  onDelete,
  deletePending,
}: {
  heading: string
  blurb: string
  runs: SavedRun[] | undefined
  isLoading: boolean
  isError: boolean
  errorLabel: string
  emptyLabel: string
  openLabel: string
  onOpen: (run: SavedRun) => void
  onDelete: (run: SavedRun) => void
  deletePending?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{heading}</CardTitle>
        <p className="text-xs text-muted-foreground">{blurb}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground" role="status">
            {errorLabel}
          </p>
        ) : !runs?.length ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{run.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {run.subjectNames.join(", ")}
                    {run.subjectNames.length && run.createdAt ? " · " : ""}
                    {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`${openLabel}: ${run.title}`}
                    onClick={() => onOpen(run)}
                  >
                    {openLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${run.title}`}
                    disabled={deletePending}
                    onClick={() => onDelete(run)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
