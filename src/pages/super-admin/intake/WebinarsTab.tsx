import { useState } from "react"
import { toast } from "sonner"
import { Ban, CalendarPlus, Download, ListChecks, Loader2, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  useCancelWebinar,
  useDownloadSessionCsv,
  useIntakeWebinars,
  useMarkAttendance,
  useSessionList,
} from "@/hooks/super-admin/useIntake"
import { registryErrors, registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import type { RegistryError } from "@/types/practitioner-registry"
import type { AttendanceStatus, Webinar } from "@/types/intake"
import { IntakeErrorList } from "./IntakeErrorList"
import { formatInZone, roleLabel, saveBlob, segmentLabel, segmentSummary } from "./intakeView"
import { WebinarFormDialog } from "./WebinarForm"

const STATUS_BADGE: Record<Webinar["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
}
const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  registered: "Registered",
  attended: "Attended",
  no_show: "No-show",
}

const isPast = (w: Webinar, now = Date.now()) => new Date(w.starts_at).getTime() <= now

function FillBar({ webinar }: { webinar: Webinar }) {
  const pct = Math.min(100, Math.round((webinar.registered_count / webinar.capacity) * 100))
  return (
    <div className="min-w-[8rem] space-y-1">
      <div className="text-sm">
        {webinar.registered_count} / {webinar.capacity}
      </div>
      <Progress value={pct} aria-label={`${webinar.registered_count} of ${webinar.capacity} places taken`} />
    </div>
  )
}

function SessionListCard({ webinarId, onClose }: { webinarId: string; onClose: () => void }) {
  const list = useSessionList(webinarId)
  const mark = useMarkAttendance()
  const csv = useDownloadSessionCsv()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])
  const data = list.data
  const canMark = !!data && data.webinar.status !== "cancelled" && isPast(data.webinar)

  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const allIds = data?.items.map((i) => i.id) ?? []
  const allPicked = allIds.length > 0 && allIds.every((id) => picked.has(id))

  const markAs = (status: "attended" | "no_show") => {
    setServerErrors([])
    mark.mutate(
      { webinarId, registrationIds: [...picked], status },
      {
        onSuccess: (r) => {
          toast.success(`${r.updated} marked ${status === "attended" ? "attended" : "no-show"}`)
          setPicked(new Set())
        },
        onError: (err) => {
          const errors = registryErrors(err)
          setServerErrors(errors)
          if (errors.length === 0) toast.error(registryErrorSummary(err, "Could not mark attendance"))
        },
      },
    )
  }

  const download = () =>
    csv.mutate(webinarId, {
      onSuccess: (blob) => saveBlob(blob, `webinar_${webinarId}.csv`),
      onError: (err) => toast.error(registryErrorSummary(err, "Could not download the list")),
    })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{data ? data.webinar.title : "Session list"}</CardTitle>
          {data && (
            <CardDescription>
              {formatInZone(data.webinar.starts_at, data.webinar.time_zone)} · {data.counts.registered} registered ·{" "}
              {data.counts.attended} attended · {data.counts.no_show} no-show
            </CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={download} disabled={csv.isPending || !data}>
            {csv.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close list">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the list…
          </p>
        ) : list.error ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load this session's list — {registryErrorSummary(list.error, "the intake service did not answer")}
          </p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has registered for this session yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={!canMark || picked.size === 0 || mark.isPending} onClick={() => markAs("attended")}>
                <ListChecks className="mr-2 h-4 w-4" /> Mark attended
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canMark || picked.size === 0 || mark.isPending}
                onClick={() => markAs("no_show")}
              >
                Mark no-show
              </Button>
              {!canMark && (
                <span className="text-xs text-muted-foreground">
                  {data.webinar.status === "cancelled"
                    ? "Attendance cannot be marked on a cancelled session."
                    : "Attendance can be marked once the session has started."}
                </span>
              )}
            </div>
            <IntakeErrorList errors={serverErrors} label="Attendance errors" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        aria-label="Select everyone"
                        checked={allPicked}
                        disabled={!canMark}
                        onCheckedChange={(on) => setPicked(on === true ? new Set(allIds) : new Set())}
                      />
                    </TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${i.first_name} ${i.last_name}`}
                          checked={picked.has(i.id)}
                          disabled={!canMark}
                          onCheckedChange={(on) => toggle(i.id, on === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {i.first_name} {i.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{i.email}</div>
                      </TableCell>
                      <TableCell>{segmentLabel(i.segment_status, i.segment_context)}</TableCell>
                      <TableCell>{roleLabel(i.role)}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "registered" ? "secondary" : "default"}>
                          {ATTENDANCE_LABELS[i.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CancelDialog({ webinar, onClose }: { webinar: Webinar; onClose: () => void }) {
  const cancel = useCancelWebinar()
  const confirm = () =>
    cancel.mutate(webinar.id, {
      onSuccess: () => {
        toast.success("Session cancelled")
        onClose()
      },
    })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {webinar.title}?</DialogTitle>
          <DialogDescription>
            The session leaves the public form at once. Its {webinar.registered_count} registration
            {webinar.registered_count === 1 ? " is" : "s are"} kept, and nobody is emailed — tell them yourself.
          </DialogDescription>
        </DialogHeader>
        {cancel.error && (
          <p role="alert" className="text-sm text-destructive">
            {registryErrorSummary(cancel.error, "Could not cancel the session")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={cancel.isPending}>
            {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WebinarsTab() {
  const webinars = useIntakeWebinars()
  const [editing, setEditing] = useState<Webinar | "new" | null>(null)
  const [cancelling, setCancelling] = useState<Webinar | null>(null)
  const [openList, setOpenList] = useState<string | null>(null)
  const items = webinars.data?.items ?? []
  const upcoming = items.filter((w) => !isPast(w)).length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Sessions</CardTitle>
            {webinars.data && (
              <CardDescription>
                {upcoming} upcoming · {items.length - upcoming} past · {webinars.data.none_of_these_times_count} said
                none of the times work
              </CardDescription>
            )}
          </div>
          <Button size="sm" onClick={() => setEditing("new")}>
            <CalendarPlus className="mr-2 h-4 w-4" /> New session
          </Button>
        </CardHeader>
        <CardContent>
          {webinars.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
            </p>
          ) : webinars.error ? (
            <p role="alert" className="text-sm text-destructive">
              Could not load sessions — {registryErrorSummary(webinars.error, "the intake service did not answer")}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet. Create one with New session.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>For</TableHead>
                    <TableHead>Places</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((w) => (
                    <TableRow key={w.id} data-state={openList === w.id ? "selected" : undefined}>
                      <TableCell>
                        <div className="font-medium">{w.title}</div>
                        <div className="text-xs text-muted-foreground">{formatInZone(w.starts_at, w.time_zone)}</div>
                      </TableCell>
                      <TableCell>
                        <ul className="text-xs">
                          {segmentSummary(w.segments).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <FillBar webinar={w} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={STATUS_BADGE[w.status].variant}>{STATUS_BADGE[w.status].label}</Badge>
                          {w.is_public === true && (
                            <Badge variant="outline" title="Shown on the public events page while scheduled and upcoming">
                              Public
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="space-x-1 whitespace-nowrap text-right">
                        <Button size="sm" variant="outline" onClick={() => setOpenList(w.id)}>
                          Open list
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(w)} aria-label={`Edit ${w.title}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {w.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelling(w)}
                            aria-label={`Cancel ${w.title}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {openList && <SessionListCard key={openList} webinarId={openList} onClose={() => setOpenList(null)} />}
      {editing && (
        <WebinarFormDialog webinar={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
      {cancelling && <CancelDialog webinar={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  )
}
