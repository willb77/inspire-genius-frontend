/**
 * Gaps — what the person is working on closing, in their own view.
 *
 * The same rows the coach-side Gap Analysis tab shows about them, read through
 * `/v1/growth/me/gaps`, plus the two writes the self routes allow: declare one
 * ("I need to get better at X") and close one.
 *
 * Two things the server does that this component has to render rather than
 * assume away:
 *
 *  - **A closed gap keeps coming back.** `list_gaps` selects on member and
 *    target only, so closing a gap does not remove it from the list. The row
 *    shows its status; it does not vanish, and the close control is offered
 *    only while the gap is open.
 *  - **A self-declared gap is a SKILL gap.** The server refuses `source` from
 *    this path and always writes `skill`, which is what makes it survive a
 *    dossier recompute (that deletes and rebuilds only the `behavioral` rows).
 *    So the two kinds are labelled: one is measured, one is the person's own.
 */
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { Loader2, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GAP_SEVERITY_LABEL } from "@/constants/development"
import apiErrorMessage from "@/lib/apiErrorMessage"
import { useCloseMyGap, useCreateMyGap, useMyGaps } from "@/hooks/me/useMyDevelopment"
import { classifyGap, type GapKind } from "@/lib/developmentGaps"
import type { DevelopmentGap } from "@/types/development"
import SelfSection from "./SelfSection"
import { selfGapSchema } from "./myDevelopment.schema"

type GapInput = z.input<typeof selfGapSchema>
type GapOutput = z.output<typeof selfGapSchema>

/** TDS-8: "From your assessment" is said only of a row the fit engine measured. */
const SOURCE_LABEL: Record<GapKind, string> = {
  skill: "You added this",
  measured: "Measured against your target role",
  indicative: "Suggested by coaching",
  unclassified: "From your assessment",
}

const STATUS_LABEL: Record<DevelopmentGap["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
}

function GapRow({
  gap,
  onClose,
  closing,
}: {
  gap: DevelopmentGap
  onClose: (gapId: string) => void
  closing: boolean
}) {
  // TDS-8: an indicative (coaching) row carries no real levels, so none are
  // shown; an older backend's rows ("unclassified") render as they always did.
  const kind = classifyGap(gap)
  const showLevels = kind !== "indicative"
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{gap.competency}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {STATUS_LABEL[gap.status]} · {GAP_SEVERITY_LABEL[gap.severity]} · {SOURCE_LABEL[kind]}
          {showLevels && gap.targetLevel > 0 ? ` · now ${gap.currentLevel} of ${gap.targetLevel}` : ""}
        </p>
      </div>
      {gap.status !== "closed" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={closing}
          onClick={() => onClose(gap.gapId)}
        >
          {closing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />}
          Mark as closed
        </Button>
      )}
    </li>
  )
}

export default function MyGapsSection() {
  const gaps = useMyGaps()
  const createGap = useCreateMyGap()
  const closeGap = useCloseMyGap()

  const form = useForm<GapInput, unknown, GapOutput>({
    resolver: zodResolver(selfGapSchema),
    defaultValues: { competency: "", severity: "moderate" },
  })

  const onSubmit = form.handleSubmit((values) => {
    createGap.mutate(
      { competency: values.competency, severity: values.severity },
      { onSuccess: () => form.reset({ competency: "", severity: "moderate" }) },
    )
  })

  const fieldError = form.formState.errors.competency?.message
  const rows = gaps.data ?? []

  return (
    <SelfSection
      id="my-gaps"
      title="Gaps"
      icon={Target}
      lead="The things you are working on closing — the ones your assessment surfaced, and the ones you named yourself."
      isLoading={gaps.isLoading}
      isError={gaps.isError}
      errorMessage={
        gaps.isError ? apiErrorMessage(gaps.error, "Please try again in a moment.") : undefined
      }
      onRetry={() => void gaps.refetch()}
      isEmpty={!gaps.isError && rows.length === 0}
      emptyHeadline="No gaps on file yet."
      emptyBody="Two things put one here: completing a PRISM assessment, which surfaces behavioural gaps automatically, or adding one yourself below. Your coach can also add one from the Team Development Studio."
      always={
        <form onSubmit={onSubmit} className="space-y-2 border-t border-border pt-4" noValidate>
          <p className="text-sm font-medium">Add something you want to get better at</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="my-gap-competency">What is it?</Label>
              <Input
                id="my-gap-competency"
                placeholder="Presenting to a room I don't know"
                aria-invalid={!!fieldError}
                {...form.register("competency")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="my-gap-severity">How much does it matter?</Label>
              <Select
                value={form.watch("severity")}
                onValueChange={(v) =>
                  form.setValue("severity", v as GapOutput["severity"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="my-gap-severity" className="sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["critical", "moderate", "minor"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {GAP_SEVERITY_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createGap.isPending}>
              {createGap.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              Add
            </Button>
          </div>
          {fieldError && (
            <p role="alert" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
          {/* The consequence first and unconditionally, then the server's own
              sentence. `apiErrorMessage` prefers the server's, which on its own
              never says which of the two writes failed. */}
          {createGap.error && !fieldError && (
            <p role="alert" className="text-sm text-destructive">
              That gap was not added.{" "}
              {apiErrorMessage(createGap.error, "Please try again in a moment.")}
            </p>
          )}
          {closeGap.error && (
            <p role="alert" className="text-sm text-destructive">
              That gap was not closed, so it is still open.{" "}
              {apiErrorMessage(closeGap.error, "Please try again in a moment.")}
            </p>
          )}
        </form>
      }
    >
      <ul className="space-y-2">
        {rows.map((gap) => (
          <GapRow
            key={gap.gapId}
            gap={gap}
            closing={closeGap.isPending && closeGap.variables === gap.gapId}
            onClose={(id) => closeGap.mutate(id)}
          />
        ))}
      </ul>
      <Badge variant="secondary">
        {rows.filter((g) => g.status !== "closed").length} still open
      </Badge>
    </SelfSection>
  )
}
