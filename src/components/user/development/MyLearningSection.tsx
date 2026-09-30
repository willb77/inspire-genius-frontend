/**
 * Learning — what the person is working through, and their own progress on it.
 *
 * Reads `/v1/growth/me/learning-items`; writes through the two self routes:
 * POST to add something, PATCH to record progress. The PATCH is the one write
 * on this page that already existed before it (`updateMyLearningItem`) and had
 * no caller — the coach surface could see a progress number nothing on a
 * member-facing surface could write. This is the surface that writes it.
 *
 * The status control sends `status` AND `progress` together, because the two
 * disagreeing is worse than either being wrong: a row reading "Complete, 40%"
 * is not a state anyone can act on. Marking complete sets 100, marking
 * not-started sets 0, and "In progress" leaves the number alone for the
 * person's own slider to own.
 */
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { BookOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LEARNING_STATUS_LABEL } from "@/constants/development"
import apiErrorMessage from "@/lib/apiErrorMessage"
import {
  useCreateMyLearningItem,
  useMyLearningItems,
  useUpdateMyLearningItem,
} from "@/hooks/me/useMyDevelopment"
import type { LearningItem, LearningItemStatus } from "@/types/development"
import SelfSection from "./SelfSection"
import { selfLearningSchema } from "./myDevelopment.schema"

type LearningInput = z.input<typeof selfLearningSchema>
type LearningOutput = z.output<typeof selfLearningSchema>

/**
 * Status and percentage are written together — see the file note. `in_progress`
 * returns no progress so the existing number survives the save.
 */
function progressFor(status: LearningItemStatus): number | undefined {
  if (status === "complete") return 100
  if (status === "not_started") return 0
  return undefined
}

function LearningRow({
  item,
  onStatus,
  saving,
}: {
  item: LearningItem
  onStatus: (itemId: string, status: LearningItemStatus) => void
  saving: boolean
}) {
  const pct = typeof item.progress === "number" ? item.progress : 0
  return (
    <li className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.provider ? item.provider : "No provider recorded"}
            {typeof item.estHours === "number" ? ` · about ${item.estHours}h` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          <Select
            value={item.status}
            onValueChange={(v) => onStatus(item.itemId, v as LearningItemStatus)}
          >
            <SelectTrigger
              className="w-[150px]"
              aria-label={`Your progress on ${item.title}`}
              disabled={saving}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["not_started", "in_progress", "complete"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {LEARNING_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* The number the server holds, not a derived one: a bar that disagreed
          with the stored value would be a second source of truth. */}
      <Progress value={pct} aria-label={`${pct}% complete`} />
    </li>
  )
}

export default function MyLearningSection() {
  const items = useMyLearningItems()
  const createItem = useCreateMyLearningItem()
  const updateItem = useUpdateMyLearningItem()

  const form = useForm<LearningInput, unknown, LearningOutput>({
    resolver: zodResolver(selfLearningSchema),
    defaultValues: { title: "", provider: "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    createItem.mutate(
      {
        title: values.title,
        // An empty provider is omitted rather than sent blank, so the row does
        // not claim a provider called "".
        ...(values.provider ? { provider: values.provider } : {}),
      },
      { onSuccess: () => form.reset({ title: "", provider: "" }) },
    )
  })

  const titleError = form.formState.errors.title?.message
  const rows = items.data ?? []

  return (
    <SelfSection
      id="my-learning"
      title="Learning"
      icon={BookOpen}
      lead="What you are working through, and how far you have got. You record your own progress here."
      isLoading={items.isLoading}
      isError={items.isError}
      errorMessage={
        items.isError ? apiErrorMessage(items.error, "Please try again in a moment.") : undefined
      }
      onRetry={() => void items.refetch()}
      isEmpty={!items.isError && rows.length === 0}
      emptyHeadline="Nothing in your learning plan yet."
      emptyBody="Add a course, book or module below, or your coach can add one against a gap from the Team Development Studio. Either way it appears here and the progress is yours to set."
      always={
        <form onSubmit={onSubmit} className="space-y-2 border-t border-border pt-4" noValidate>
          <p className="text-sm font-medium">Add something you are working through</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="my-learning-title">What is it?</Label>
              <Input
                id="my-learning-title"
                placeholder="Negotiation fundamentals"
                aria-invalid={!!titleError}
                {...form.register("title")}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="my-learning-provider">Where is it from? (optional)</Label>
              <Input
                id="my-learning-provider"
                placeholder="Internal L&amp;D"
                {...form.register("provider")}
              />
            </div>
            <Button type="submit" disabled={createItem.isPending}>
              {createItem.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              Add
            </Button>
          </div>
          {titleError && (
            <p role="alert" className="text-sm text-destructive">
              {titleError}
            </p>
          )}
          {createItem.error && !titleError && (
            <p role="alert" className="text-sm text-destructive">
              That was not added to your plan.{" "}
              {apiErrorMessage(createItem.error, "Please try again in a moment.")}
            </p>
          )}
          {updateItem.error && (
            // The CONSEQUENCE first and unconditionally, then whatever the
            // server said. `apiErrorMessage` prefers the server's own sentence,
            // and on its own that sentence never tells the person the number
            // they are looking at is stale.
            <p role="alert" className="text-sm text-destructive">
              Your progress was not saved, so the number above is still the old one.{" "}
              {apiErrorMessage(updateItem.error, "Please try again in a moment.")}
            </p>
          )}
        </form>
      }
    >
      <ul className="space-y-2">
        {rows.map((item) => (
          <LearningRow
            key={item.itemId}
            item={item}
            saving={updateItem.isPending && updateItem.variables?.itemId === item.itemId}
            onStatus={(itemId, status) => {
              const progress = progressFor(status)
              updateItem.mutate({
                itemId,
                input: { status, ...(progress === undefined ? {} : { progress }) },
              })
            }}
          />
        ))}
      </ul>
    </SelfSection>
  )
}
