import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarClock, MapPin, Users } from "lucide-react"

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
import { useManagerTeam } from "@/hooks/manager/useManagerTeam"
import {
  useCreateTeamSessions,
  useTeamSchedule,
  useTeamSchedulePreferences,
} from "@/hooks/manager/useTeamSchedule"
import { toUtcInstant } from "@/services/manager/teamSchedule.service"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { MAX_LOCATION } from "@/types/manager/teamSchedule"
import type { TeamScheduleInput, TeamScheduleResult } from "@/types/manager/teamSchedule"

const DURATION_OPTIONS = [30, 45, 60, 90] as const
const SPACING_OPTIONS = [0, 5, 10, 15, 30] as const

/**
 * Manager Schedule — batch-schedule sessions across the manager's own roster.
 *
 * ## Two seams, deliberately different
 *
 * The SCHEDULE is the agent-engine's manager routes (`/v1/agents/coach/
 * team-schedule*`, MSCH-1). Until 2026-10-15 this page called the
 * practitioner scheduler (`/v1/agents/coach/schedule*`), which admits only
 * practitioners and super-admins and books only paying clients — so every
 * manager request was a 403, shown as "please try again". The sessions still
 * live in the same table; the manager routes book only people whose manager of
 * record is the caller, and say who was skipped and why.
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
  const scheduleQuery = useTeamSchedule()
  const createSessions = useCreateTeamSessions()
  const prefsQuery = useTeamSchedulePreferences()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [startsAt, setStartsAt] = useState("")
  const [durationMin, setDurationMin] = useState<number>(60)
  const [spacingMin, setSpacingMin] = useState<number>(10)
  const [topic, setTopic] = useState("")
  const [message, setMessage] = useState("")
  // MSCH-2: null = not edited, so the box shows the default saved in Settings.
  const [locationDraft, setLocationDraft] = useState<string | null>(null)
  const [sendInvites, setSendInvites] = useState(true)
  const [lastResult, setLastResult] = useState<TeamScheduleResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const location = locationDraft ?? prefsQuery.data?.defaultLocation ?? ""
  const locationTooLong = location.trim().length > MAX_LOCATION
  const members = teamQuery.data?.members ?? []
  const entries = scheduleQuery.data ?? []
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.name ?? id

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
    setLocationDraft(null)
    setSendInvites(true)
  }

  const canSubmit =
    selectedIds.size > 0 &&
    startsAt.trim().length > 0 &&
    topic.trim().length > 0 &&
    !locationTooLong &&
    !createSessions.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    setSubmitError(null)
    setLastResult(null)
    let startsAtUtc: string
    try {
      startsAtUtc = toUtcInstant(startsAt)
    } catch (err) {
      setSubmitError(apiErrorMessage(err, "Start time is not a valid date."))
      return
    }
    const input: TeamScheduleInput = {
      personIds: [...selectedIds],
      startsAt: startsAtUtc,
      durationMin,
      spacingMin,
      topic: topic.trim(),
      message: message.trim() || undefined,
      location: location.trim() || undefined,
      sendInvites,
    }
    createSessions.mutate(input, {
      onSuccess: (result) => {
        setLastResult(result)
        const emailed = sendInvites ? `, ${result.emailed} invites emailed` : ""
        if (result.created > 0) toast.success(`${result.created} sessions created${emailed}`)
        else toast.error("No sessions were created — see the reasons below.")
        resetForm()
      },
      onError: (err) => {
        const text = apiErrorMessage(err, "Could not create sessions.")
        setSubmitError(text)
        toast.error(text)
      },
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

              <div className="space-y-1.5">
                <Label htmlFor="schedule-location" className="text-[#111827]">
                  Location
                </Label>
                <Input
                  id="schedule-location"
                  value={location}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  placeholder="A video meeting link, a phone number or an address"
                  aria-invalid={locationTooLong}
                />
                <p className="text-xs text-[#6b7280]">
                  {locationTooLong
                    ? `At most ${MAX_LOCATION} characters.`
                    : "Your default comes from Settings. It goes in the invite."}
                </p>
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

              {submitError && (
                <p role="alert" className="text-sm text-[#EF4444]">
                  {submitError}
                </p>
              )}

              {lastResult && (lastResult.skipped.length > 0 || lastResult.notEmailed.length > 0) && (
                <div role="status" className="text-sm space-y-2 rounded-md border border-[#e5e7eb] p-3">
                  {lastResult.skipped.length > 0 && (
                    <div>
                      <p className="font-medium text-[#111827]">Not scheduled</p>
                      <ul className="list-disc pl-5 text-[#6b7280]">
                        {lastResult.skipped.map((s, i) => (
                          <li key={`skip-${s.personId}-${i}`}>
                            {nameOf(s.personId)}: {skipReason(s.reason)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lastResult.notEmailed.length > 0 && (
                    <div>
                      <p className="font-medium text-[#111827]">Scheduled, but no invite sent</p>
                      <ul className="list-disc pl-5 text-[#6b7280]">
                        {lastResult.notEmailed.map((s, i) => (
                          <li key={`mail-${s.personId}-${i}`}>
                            {nameOf(s.personId)}: {s.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DataCard>

          <DataCard title="Upcoming sessions" badge={entries.length}>
            {scheduleQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : scheduleQuery.error ? (
              <div role="alert" className="text-sm text-[#EF4444] py-8 text-center">
                {apiErrorMessage(scheduleQuery.error, "Could not load your sessions.")}{" "}
                <button onClick={() => void scheduleQuery.refetch()} className="underline">
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-sm text-[#6b7280] py-8 text-center">
                No sessions scheduled yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#e5e7eb]">
                {entries.map((entry) => (
                  <li key={entry.sessionId} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">
                          {entry.personName}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-0.5 truncate">{entry.topic}</p>
                        {entry.location && (
                          <p className="text-xs text-[#6b7280] mt-0.5 truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {entry.location}
                          </p>
                        )}
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

const SKIP_REASONS: Record<string, string> = {
  not_your_report: "doesn't report to you",
  unknown_person: "no account found",
  duplicate: "listed twice",
  empty_id: "missing id",
  check_failed: "couldn't confirm they report to you — try again",
}

function skipReason(reason: string): string {
  return SKIP_REASONS[reason] ?? reason
}

function formatStart(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "EEE, MMM d · h:mm a")
}
