import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SEGMENT_CONTEXT_LABELS, SEGMENT_STATUS_LABELS } from "@/constants/intake"
import { useCreateWebinar, useUpdateWebinar } from "@/hooks/super-admin/useIntake"
import { registryErrors, registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import type { RegistryError } from "@/types/practitioner-registry"
import { SEGMENT_CONTEXTS, SEGMENT_STATUSES, type Segment, type Webinar, type WebinarInput } from "@/types/intake"
import {
  PUBLIC_DESCRIPTION_MAX,
  publicFieldsForEdit,
  toWebinarInput,
  webinarFormSchema,
  type WebinarFormInput,
  type WebinarFormValues,
} from "./intake.schemas"
import { IntakeErrorList } from "./IntakeErrorList"
import { browserTimeZone, segmentKey, timeZoneOptions, toZonedInput } from "./intakeView"

const SELECT_CLASS = "border-input bg-background h-9 w-full rounded-md border px-2 text-sm"

function SegmentGrid({ value, onChange }: { value: Segment[]; onChange: (next: Segment[]) => void }) {
  const ticked = new Set(value.map(segmentKey))
  const toggle = (cell: Segment, on: boolean) => {
    const rest = value.filter((s) => segmentKey(s) !== segmentKey(cell))
    onChange(on ? [...rest, cell] : rest)
  }
  return (
    <table className="w-full text-sm" aria-label="Open to these segments">
      <thead>
        <tr>
          <th className="text-left font-normal text-muted-foreground" />
          {SEGMENT_CONTEXTS.map((c) => (
            <th key={c} scope="col" className="px-2 py-1 text-center font-medium">
              {SEGMENT_CONTEXT_LABELS[c]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SEGMENT_STATUSES.map((s) => (
          <tr key={s}>
            <th scope="row" className="py-1 pr-2 text-left font-medium">
              {SEGMENT_STATUS_LABELS[s]}
            </th>
            {SEGMENT_CONTEXTS.map((c) => {
              const cell: Segment = { segment_status: s, segment_context: c }
              return (
                <td key={c} className="px-2 py-1 text-center">
                  <Checkbox
                    aria-label={`${SEGMENT_STATUS_LABELS[s]} · ${SEGMENT_CONTEXT_LABELS[c]}`}
                    checked={ticked.has(segmentKey(cell))}
                    onCheckedChange={(on) => toggle(cell, on === true)}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function defaults(webinar: Webinar | null): WebinarFormInput {
  if (!webinar) {
    return {
      title: "",
      startsAt: "",
      timeZone: browserTimeZone(),
      capacity: "100",
      joinLink: "",
      segments: [],
      isPublic: false,
      publicDescription: "",
    }
  }
  return {
    title: webinar.title,
    startsAt: toZonedInput(webinar.starts_at, webinar.time_zone),
    timeZone: webinar.time_zone,
    capacity: String(webinar.capacity),
    joinLink: webinar.join_link ?? "",
    segments: webinar.segments,
    // Absent on an intake service that predates the public events list: read as not public.
    isPublic: webinar.is_public === true,
    publicDescription: webinar.public_description ?? "",
    // A cancelled session has no status control, and saving it must not quietly un-cancel it.
    status: webinar.status === "cancelled" ? undefined : webinar.status,
  }
}

/** New session (no `webinar`) or Edit session. */
export function WebinarFormDialog({ webinar, onClose }: { webinar: Webinar | null; onClose: () => void }) {
  const create = useCreateWebinar()
  const update = useUpdateWebinar()
  const pending = create.isPending || update.isPending
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])
  const zones = useMemo(() => {
    const all = timeZoneOptions()
    return webinar && !all.includes(webinar.time_zone) ? [webinar.time_zone, ...all] : all
  }, [webinar])
  const form = useForm<WebinarFormInput, unknown, WebinarFormValues>({
    resolver: zodResolver(webinarFormSchema),
    defaultValues: defaults(webinar),
  })
  const errs = form.formState.errors

  const onSubmit = form.handleSubmit((values) => {
    setServerErrors([])
    const input: Partial<WebinarInput> = toWebinarInput(values)
    // On an edit, an untouched time is not re-sent: a finished session keeps
    // its exact stored instant, which a minute-precision input cannot echo.
    if (webinar && !form.formState.dirtyFields.startsAt && !form.formState.dirtyFields.timeZone) {
      delete input.starts_at
      delete input.time_zone
    }
    // On an edit, the public fields go only when the admin changed them, so an
    // untouched edit still saves against an intake service without them.
    // Compared with the opening values rather than read from `dirtyFields`,
    // which this form does not subscribe to and so is never filled in.
    if (webinar) {
      const opened = defaults(webinar)
      delete input.is_public
      delete input.public_description
      Object.assign(
        input,
        publicFieldsForEdit(values, {
          isPublic: values.isPublic !== opened.isPublic,
          publicDescription: values.publicDescription !== (opened.publicDescription ?? "").trim(),
        }),
      )
    }
    const handlers = {
      onSuccess: () => {
        toast.success(webinar ? "Session saved" : "Session created")
        onClose()
      },
      onError: (err: unknown) => {
        const list = registryErrors(err)
        setServerErrors(list)
        if (list.length === 0) toast.error(registryErrorSummary(err, "Could not save the session"))
      },
    }
    if (webinar) update.mutate({ id: webinar.id, ...input }, handlers)
    else create.mutate(input as WebinarInput, handlers)
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{webinar ? `Edit ${webinar.title}` : "New session"}</DialogTitle>
          <DialogDescription>
            The public form shows a session only to people in a ticked segment, while it is scheduled, in the future
            and not full.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="webinar-title">Title</Label>
            <Input id="webinar-title" {...form.register("title")} />
            {errs.title?.message && <p className="text-xs text-destructive">{errs.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="webinar-startsAt">Date and time</Label>
            <Input id="webinar-startsAt" type="datetime-local" {...form.register("startsAt")} />
            {errs.startsAt?.message && <p className="text-xs text-destructive">{errs.startsAt.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="webinar-timeZone">Time zone</Label>
            <select id="webinar-timeZone" className={SELECT_CLASS} {...form.register("timeZone")}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            {errs.timeZone?.message && <p className="text-xs text-destructive">{errs.timeZone.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="webinar-capacity">Places</Label>
            <Input id="webinar-capacity" type="number" min={1} step={1} {...form.register("capacity")} />
            {errs.capacity?.message && <p className="text-xs text-destructive">{errs.capacity.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="webinar-joinLink">Join link</Label>
            <Input id="webinar-joinLink" type="url" placeholder="https://" {...form.register("joinLink")} />
            {errs.joinLink?.message && <p className="text-xs text-destructive">{errs.joinLink.message}</p>}
          </div>
          {webinar && webinar.status !== "cancelled" && (
            <div className="space-y-1">
              <Label htmlFor="webinar-status">Status</Label>
              <select id="webinar-status" className={SELECT_CLASS} {...form.register("status")}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
          <div className="space-y-1 sm:col-span-2">
            <Label>Open to these segments</Label>
            <Controller
              control={form.control}
              name="segments"
              render={({ field }) => <SegmentGrid value={field.value} onChange={field.onChange} />}
            />
            {errs.segments?.message && <p className="text-xs text-destructive">{errs.segments.message}</p>}
          </div>
          <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <Checkbox
                    id="webinar-isPublic"
                    checked={field.value}
                    onCheckedChange={(on) => field.onChange(on === true)}
                  />
                )}
              />
              <Label htmlFor="webinar-isPublic">Show on the public events page</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              The public page shows only the title, the date and time, and the public description below — never the
              places, the join link or who has registered. It lists a session while it is scheduled and in the future.
              Changes reach the public page within about 2 minutes.
            </p>
            <div className="space-y-1">
              <Label htmlFor="webinar-publicDescription">Public description</Label>
              <Textarea
                id="webinar-publicDescription"
                rows={4}
                placeholder={`Plain text, up to ${PUBLIC_DESCRIPTION_MAX.toLocaleString("en-US")} characters. Shown to anyone who visits the events page.`}
                {...form.register("publicDescription")}
              />
              {errs.publicDescription?.message && (
                <p className="text-xs text-destructive">{errs.publicDescription.message}</p>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <IntakeErrorList errors={serverErrors} label="Session errors" />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
