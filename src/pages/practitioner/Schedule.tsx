import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarClock, Users, Video } from "lucide-react"

import PractitionerLayout from "@/layouts/PractitionerLayout"
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
import {
  useCoachClients,
  useCoachSchedule,
  useCreateSessionsBulk,
} from "@/hooks/practitioner/useCoachClient"
import type { BulkScheduleInput } from "@/types/practitioner/coachClient"

const DURATION_OPTIONS = [30, 45, 60, 90] as const
const SPACING_OPTIONS = [0, 5, 10, 15, 30] as const

/**
 * Practitioner Schedule — clickable wireframe on stubbed coachClient data.
 *
 * Left: a "Create sessions" form that bulk-schedules across a selected cohort
 * of clients (the Fellows). Right: an upcoming-sessions feed. Both read/write
 * through the coachClient hook seam so the backend can be swapped in later.
 */
export default function PractitionerSchedule() {
  const navigate = useNavigate()

  const clientsQuery = useCoachClients()
  const scheduleQuery = useCoachSchedule()
  const createSessions = useCreateSessionsBulk()

  const [prompt, setPrompt] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [startsAt, setStartsAt] = useState("")
  const [durationMin, setDurationMin] = useState<number>(60)
  const [spacingMin, setSpacingMin] = useState<number>(10)
  const [topic, setTopic] = useState("")
  const [message, setMessage] = useState("")
  const [sendInvites, setSendInvites] = useState(true)

  const clients = clientsQuery.data ?? []
  const entries = scheduleQuery.data ?? []

  const toggleClient = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const resetForm = () => {
    setPrompt("")
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
        toast.success(
          `${result.created} sessions created, ${result.emailed} invites emailed`,
        )
        resetForm()
      },
      onError: () => {
        toast.error("Could not create sessions. Please try again.")
      },
    })
  }

  return (
    <PractitionerLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-[#3B5BFF]" />
              Schedule
            </h1>
            <p className="text-sm text-[#6b7280] mt-1">
              Batch-schedule coaching sessions across your cohort and review
              what&apos;s coming up.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-[#e5e7eb] text-[#111827]"
            onClick={() => navigate("/practitioner/meeting")}
          >
            <Video className="h-4 w-4 text-[#3B5BFF]" />
            Start a Meeting
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Create sessions form */}
          <DataCard title="Create sessions with clients">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-prompt" className="text-[#111827]">
                  Describe what you want to schedule
                </Label>
                <Input
                  id="schedule-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Weekly PRISM debriefs for my new cohort"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#111827] flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#6b7280]" />
                  Select clients (cohort)
                </Label>
                <div className="border border-[#e5e7eb] rounded-md max-h-56 overflow-y-auto divide-y divide-[#e5e7eb]">
                  {clientsQuery.isLoading ? (
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="p-3 text-sm text-[#6b7280]">
                      No clients in your cohort yet.
                    </div>
                  ) : (
                    clients.map((client) => {
                      const checked = selectedIds.has(client.id)
                      return (
                        <label
                          key={client.id}
                          htmlFor={`client-${client.id}`}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#f9fafb]"
                        >
                          <Checkbox
                            id={`client-${client.id}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleClient(client.id, v === true)
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-[#111827] truncate">
                              {client.name}
                            </span>
                            <span className="block text-xs text-[#6b7280] truncate">
                              {client.org}
                            </span>
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-[#6b7280]">
                  {selectedIds.size} selected
                </p>
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
                  <Select
                    value={String(durationMin)}
                    onValueChange={(v) => setDurationMin(Number(v))}
                  >
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
                  <Select
                    value={String(spacingMin)}
                    onValueChange={(v) => setSpacingMin(Number(v))}
                  >
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
                  placeholder="e.g. PRISM debrief"
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

              <label
                htmlFor="schedule-invite"
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <Checkbox
                  id="schedule-invite"
                  checked={sendInvites}
                  onCheckedChange={(v) => setSendInvites(v === true)}
                />
                <span className="text-sm text-[#111827]">
                  Email .ics invite to clients (coach cc&apos;d)
                </span>
              </label>

              <Button
                className="w-full bg-[#3B5BFF] hover:bg-[#2A47CC] text-white"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {createSessions.isPending ? "Scheduling…" : "Schedule sessions"}
              </Button>
            </div>
          </DataCard>

          {/* Upcoming sessions feed */}
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
                        <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                          {entry.topic}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-[#111827]">
                          {formatStart(entry.startsAt)}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-0.5">
                          {entry.durationMin} min
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataCard>
        </div>
      </div>
    </PractitionerLayout>
  )
}

function formatStart(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "EEE, MMM d · h:mm a")
}
