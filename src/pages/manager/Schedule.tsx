import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarClock, Users } from "lucide-react"

import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCoachSchedule, useCreateSessionsBulk } from "@/hooks/practitioner/useCoachClient"
import { useManagerTeam } from "@/hooks/manager/useManagerTeam"
import type { BulkScheduleInput } from "@/types/practitioner/coachClient"

const DURATION_OPTIONS = [30, 45, 60, 90] as const
const SPACING_OPTIONS = [0, 5, 10, 15, 30] as const

/**
 * Manager Schedule — batch-schedule sessions across the manager's own roster.
 *
 * ## Two seams, deliberately different
 *
 * The SCHEDULE itself reuses the coach endpoints wholesale (`GET
 * /v1/agents/coach/schedule`, `POST /v1/agents/coach/schedule/sessions` via
 * `useCoachSchedule` / `useCreateSessionsBulk`). Bill's call, 2026-08-16:
 * reuse rather than build a manager-scoped twin. A second scheduling backend
 * would be a second place for a session to exist, and sessions that exist in
 * one place are sessions somebody does not turn up to.
 *
 * The COHORT does not come from there. `/v1/agents/coach/clients` is the
 * practitioner's paying client list; a manager's cohort is their direct
 * reports (`employee_profiles.manager_id`), which is what `useManagerTeam`
 * now returns. Same scheduler, different roster — that distinction is the
 * whole reason this page exists rather than a role check on the practitioner
 * one.
 *
 * Modelled on `pages/practitioner/Schedule.tsx`: a BULK creator — cohort, one
 * start time, duration, spacing — laying sessions back to back, not a
 * per-person booking dialog.
 */
export default function ManagerSchedule() {
  const teamQuery = useManagerTeam()
  const scheduleQuery = useCoachSchedule()
  const createSessions = useCreateSessionsBulk()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [startsAt, setStartsAt] = useState("")
  const [durationMin, setDurationMin] = useState<number>(60)
  const [spacingMin, setSpacingMin] = useState<number>(10)
  const [topic, setTopic] = useState("")
  const [message, setMessage] = useState("")
  const [sendInvites, setSendInvites] = useState(true)

  const members = teamQuery.data?.members ?? []
  const entries = scheduleQuery.data ?? []

  const toggleMember = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(members.map((m) => m.user_id)))
  const clearAll = () => setSelectedIds(new Set())

  const resetForm = () => {
    setSelectedIds(new Set())
    setStartsAt("")
    setDurationMin(60)
    setSpacingMin(10)
    setTopic("")
    setMessage("")
    setSendInvites(true)
  }

  const canSubmit =
    selectedIds.size > 0 &&
    startsAt.trim().length > 0 &&
    topic.trim().length > 0 &&
    !createSessions.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const input: BulkScheduleInput = {
      clientIds: [...selectedIds],
      startsAt,
      durationMin,
      spacingMin,
      topic: topic.trim(),
      message: message.trim(),
      sendInvites,
    }
    createSessions.mutate(input, {
      onSuccess: (result) => {
        toast.success(`${result.created} sessions created, ${result.emailed} invites emailed`)
        resetForm()
      },
      onError: () => toast.error("Could not create sessions. Please try again."),
    })
  }

  return (
    <ManagerLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-[#111827] flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-[#466BC4]" />
            Schedule
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Batch-schedule sessions across your team and review what&apos;s coming up.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DataCard title="Create sessions with your team">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[#111827] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#6b7280]" />
                    Select team members
                  </Label>
                  {members.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={selectAll} className="text-[#466BC4] underline">
                        Select all
                      </button>
                      <button type="button" onClick={clearAll} className="text-[#6b7280] underline">
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-[#e5e7eb] rounded-md max-h-56 overflow-y-auto divide-y divide-[#e5e7eb]">
                  {teamQuery.isLoading ? (
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : teamQuery.error ? (
                    <div className="p-3 text-sm text-[#EF4444]">
                      Could not load your team.{" "}
                      <button onClick={() => void teamQuery.refetch()} className="underline">
                        Retry
                      </button>
                    </div>
                  ) : members.length === 0 ? (
                    // The honest empty state. Nobody reports to this manager
                    // yet, and saying so — with the fix — beats an empty box
                    // that reads identically to a failed request.
                    <div className="p-3 text-sm text-[#6b7280]">
                      Nobody reports to you yet. Add your team under{" "}
                      <span className="font-medium text-[#111827]">Team Import</span> with a{" "}
                      <span className="font-mono text-xs">Manager</span> column naming your email
                      address.
                    </div>
                  ) : (
                    members.map((member) => {
                      const checked = selectedIds.has(member.user_id)
                      return (
                        <label
                          key={member.user_id}
                          htmlFor={`member-${member.user_id}`}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#f9fafb]"
                        >
                          <Checkbox
                            id={`member-${member.user_id}`}
                            checked={checked}
                            onCheckedChange={(v) => toggleMember(member.user_id, v === true)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-[#111827] truncate">
                              {member.name}
                            </span>
                            <span className="block text-xs text-[#6b7280] truncate">
                              {member.position || member.email}
                            </span>
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-[#6b7280]">{selectedIds.size} selected</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schedule-start" className="text-[#111827]">
                  Start time
                </Label>
                <Input
                  id="schedule-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[#111827]">Duration</Label>
                  <Select value={String(durationMin)} onValueChange={(v) => setDurationMin(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((min) => (
                        <SelectItem key={min} value={String(min)}>
                          {min} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#111827]">Space between meetings</Label>
                  <Select value={String(spacingMin)} onValueChange={(v) => setSpacingMin(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPACING_OPTIONS.map((min) => (
                        <SelectItem key={min} value={String(min)}>
                          {min} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schedule-topic" className="text-[#111827]">
                  Topic
                </Label>
                <Input
                  id="schedule-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Development check-in"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schedule-message" className="text-[#111827]">
                  Message
                </Label>
                <Textarea
                  id="schedule-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="A short note included with the invitation."
                  rows={3}
                />
              </div>

              <label htmlFor="schedule-invite" className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  id="schedule-invite"
                  checked={sendInvites}
                  onCheckedChange={(v) => setSendInvites(v === true)}
                />
                <span className="text-sm text-[#111827]">
                  Email .ics invite to attendees (you cc&apos;d)
                </span>
              </label>

              <Button
                className="w-full bg-[#466BC4] hover:bg-[#3A59A6] text-white"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {createSessions.isPending ? "Scheduling…" : "Schedule sessions"}
              </Button>
            </div>
          </DataCard>

          <DataCard title="Upcoming sessions" badge={entries.length}>
            {scheduleQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-sm text-[#6b7280] py-8 text-center">
                No sessions scheduled yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#e5e7eb]">
                {entries.map((entry) => (
                  <li key={entry.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">
                          {entry.clientName}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-0.5 truncate">{entry.topic}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-[#111827]">
                          {formatStart(entry.startsAt)}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-0.5">{entry.durationMin} min</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataCard>
        </div>
      </div>
    </ManagerLayout>
  )
}

function formatStart(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "EEE, MMM d · h:mm a")
}
