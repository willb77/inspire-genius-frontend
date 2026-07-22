import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Check,
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Unplug,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useCaseload } from "@/hooks/honor/useCoachData"
import {
  useCreateHonorSession,
  useCreateHonorSessionsBulk,
  useDeleteHonorSession,
  useDisconnectGoogle,
  useHonorGoogleConnect,
  useHonorGoogleStatus,
  useHonorSchedule,
  useHonorScheduleFeed,
  useUpdateHonorSession,
} from "@/hooks/honor/useHonorSchedule"
import type { HonorSession, HonorSessionInput } from "@/types/honor"
import { HonorCard, HonorEmptyState, HonorPageHeader } from "./_shared"
import {
  HONOR_BTN_OUTLINE,
  HONOR_BTN_PRIMARY,
  fellowName,
  formatClock,
  formatDayHeading,
  sessionDayKey,
} from "./_format"

/**
 * Honor Coach Workbench — Schedule.
 *
 * Wires the live coach schedule endpoints (GET/POST/PATCH/DELETE
 * /v1/agents/honor/coach/schedule) through useHonorSchedule + its mutations.
 * Read-safe: an undeployed backend degrades to the empty state (no crash). A
 * "New session" form POSTs; each row can be edited or deleted. "Subscribe
 * (iCal)" reveals the .ics feed URL (copy + webcal:// hint). "Connect Google
 * Calendar" (live OAuth) has three states: connected (Disconnect + email),
 * available (opens the consent URL in a new tab, then light-polls status), or
 * unavailable (disabled + coming-soon note).
 */

const KINDS = ["session", "debrief", "milestone", "interview", "other"] as const
const KIND_LABEL: Record<string, string> = {
  session: "Session",
  debrief: "Debrief",
  milestone: "Milestone",
  interview: "Interview",
  other: "Other",
}

const INPUT_CLASS =
  "w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm text-[#18202f] outline-none focus:border-[#1B2A4A]"
const LABEL_CLASS = "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#5b6678]"

type FormState = {
  title: string
  date: string
  startTime: string
  endTime: string
  fellowId: string
  kind: string
  location: string
  description: string
}

const EMPTY_FORM: FormState = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  fellowId: "",
  kind: "session",
  location: "",
  description: "",
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const
const SPACING_OPTIONS = [0, 5, 10, 15, 30] as const

type BulkFormState = {
  fellowIds: Set<string>
  startsAt: string
  durationMin: number
  spacingMin: number
  topic: string
  message: string
  sendInvites: boolean
}

const EMPTY_BULK_FORM: BulkFormState = {
  fellowIds: new Set<string>(),
  startsAt: "",
  durationMin: 30,
  spacingMin: 0,
  topic: "",
  message: "",
  sendInvites: true,
}

/** Build an ISO timestamp from a date + time pair (local). Empty when incomplete. */
function toIso(date: string, time: string): string {
  if (!date || !time) return ""
  const ts = Date.parse(`${date}T${time}`)
  return Number.isNaN(ts) ? "" : new Date(ts).toISOString()
}

/** Seed the form from an existing session for editing. */
function formFromSession(s: HonorSession): FormState {
  const start = Number.isNaN(Date.parse(s.startsAt)) ? null : new Date(s.startsAt)
  const end = s.endsAt && !Number.isNaN(Date.parse(s.endsAt)) ? new Date(s.endsAt) : null
  const dateStr = start
    ? `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, "0")}-${start
        .getDate()
        .toString()
        .padStart(2, "0")}`
    : ""
  const clock = (d: Date | null) =>
    d ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}` : ""
  return {
    title: s.title ?? "",
    date: dateStr,
    startTime: clock(start),
    endTime: clock(end),
    fellowId: s.fellowId ?? "",
    kind: s.kind ?? "session",
    location: s.location ?? "",
    description: s.description ?? "",
  }
}

export default function HonorSchedule() {
  const { data: sessions = [], isLoading } = useHonorSchedule()
  const { data: fellows = [] } = useCaseload()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showFeed, setShowFeed] = useState(false)
  const [copied, setCopied] = useState(false)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulk, setBulk] = useState<BulkFormState>(EMPTY_BULK_FORM)

  const createMut = useCreateHonorSession()
  const createBulkMut = useCreateHonorSessionsBulk()
  const updateMut = useUpdateHonorSession()
  const deleteMut = useDeleteHonorSession()

  const feedQuery = useHonorScheduleFeed({ enabled: showFeed })
  const google = useHonorGoogleConnect()
  const { data: googleStatus, refetch: refetchGoogleStatus } = useHonorGoogleStatus()
  const disconnectMut = useDisconnectGoogle()

  const connected = googleStatus?.connected === true
  const googleEmail = googleStatus?.googleEmail
  const [polling, setPolling] = useState(false)

  /**
   * After the coach is sent to Google consent (opened in a new tab, callback
   * self-closes), light-poll the status so the UI flips to "Connected" once
   * they finish — refetch every few seconds for ~30s and whenever the window
   * regains focus. Read-safe: refetch swallows errors to the not-connected state.
   */
  useEffect(() => {
    if (!polling) return
    if (connected) {
      setPolling(false)
      return
    }
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt > 30_000) {
        window.clearInterval(interval)
        setPolling(false)
        return
      }
      void refetchGoogleStatus()
    }, 3000)
    const onFocus = () => void refetchGoogleStatus()
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [polling, connected, refetchGoogleStatus])

  function handleConnectGoogle() {
    const url = google.data?.authUrl
    if (!url) return
    window.open(url, "_blank", "noopener")
    setPolling(true)
  }

  const fellowNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of fellows) m.set(f.id, fellowName(f.firstName, f.lastName))
    return m
  }, [fellows])

  /** Sessions grouped by local day, each day sorted by start time. */
  const grouped = useMemo(() => {
    const byDay = new Map<string, HonorSession[]>()
    for (const s of sessions) {
      const key = sessionDayKey(s.startsAt)
      const list = byDay.get(key) ?? []
      list.push(s)
      byDay.set(key, list)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({
        day,
        items: items.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      }))
  }, [sessions])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormOpen(false)
  }

  function startEdit(s: HonorSession) {
    setForm(formFromSession(s))
    setEditingId(s.id)
    setFormOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const startsAt = toIso(form.date, form.startTime)
    if (!form.title.trim() || !startsAt) {
      toast.error("A title and a start date/time are required.")
      return
    }
    const endsAt = toIso(form.date, form.endTime) || null
    const payload: HonorSessionInput = {
      title: form.title.trim(),
      startsAt,
      endsAt,
      kind: form.kind || null,
      location: form.location.trim() || null,
      fellowId: form.fellowId || null,
      description: form.description.trim() || null,
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, patch: payload }, { onSuccess: resetForm })
    } else {
      createMut.mutate(payload, { onSuccess: resetForm })
    }
  }

  function resetBulk() {
    setBulk(EMPTY_BULK_FORM)
    setBulkOpen(false)
  }

  function toggleBulkFellow(id: string) {
    setBulk((b) => {
      const next = new Set(b.fellowIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...b, fellowIds: next }
    })
  }

  function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fellowIds = Array.from(bulk.fellowIds)
    if (fellowIds.length === 0) {
      toast.error("Select at least one fellow.")
      return
    }
    if (!bulk.topic.trim() || !bulk.startsAt) {
      toast.error("A topic and a start date/time are required.")
      return
    }
    const startTs = Date.parse(bulk.startsAt)
    if (Number.isNaN(startTs)) {
      toast.error("Enter a valid start date/time.")
      return
    }
    createBulkMut.mutate(
      {
        fellowIds,
        startsAt: new Date(startTs).toISOString(),
        durationMin: bulk.durationMin,
        spacingMin: bulk.spacingMin,
        topic: bulk.topic.trim(),
        message: bulk.message.trim() || undefined,
        sendInvites: bulk.sendInvites,
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.created.length} sessions scheduled, ${res.emailed} invited.`)
          resetBulk()
        },
      },
    )
  }

  function handleDelete(s: HonorSession) {
    if (!window.confirm(`Remove "${s.title}"?`)) return
    deleteMut.mutate(s.id, {
      onSuccess: () => {
        if (editingId === s.id) resetForm()
      },
    })
  }

  // Backend returns `feedUrl` (tolerate the legacy `url` alias). Behind the API
  // Gateway the minted URL can carry an internal `http://` scheme; force https —
  // calendar apps reject http subscription feeds.
  const feedUrl = (feedQuery.data?.feedUrl ?? feedQuery.data?.url ?? "").replace(
    /^http:\/\//,
    "https://",
  )
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://")

  async function copyFeed() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      toast.success("Subscribe URL copied.")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy — select and copy the URL manually.")
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <HonorPageHeader
        icon={CalendarDays}
        title="Schedule"
        description="Sessions, debriefs, and cohort milestones across your caseload."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={HONOR_BTN_OUTLINE}
              onClick={() => setShowFeed((v) => !v)}
            >
              <Link2 className="h-4 w-4" /> Subscribe (iCal)
            </button>
            {connected ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe8d4] bg-[#eef8f0] px-3 py-2 text-sm font-semibold text-[#1f7a3d]">
                  <Check className="h-4 w-4" />
                  {googleEmail ? `Connected as ${googleEmail}` : "Google Calendar connected"}
                </span>
                <button
                  type="button"
                  className={HONOR_BTN_OUTLINE}
                  onClick={() => disconnectMut.mutate()}
                  disabled={disconnectMut.isPending}
                  title="Disconnect Google Calendar"
                >
                  <Unplug className="h-4 w-4" /> Disconnect
                </button>
              </>
            ) : google.data?.available ? (
              <button
                type="button"
                className={HONOR_BTN_OUTLINE}
                onClick={handleConnectGoogle}
                title="Connect your Google Calendar"
              >
                <CalendarPlus className="h-4 w-4" />
                {polling ? "Waiting for Google…" : "Connect Google Calendar"}
              </button>
            ) : (
              <button
                type="button"
                className={HONOR_BTN_OUTLINE}
                disabled
                title="Coming soon — not yet configured"
              >
                <CalendarPlus className="h-4 w-4" /> Connect Google Calendar
              </button>
            )}
            <button
              type="button"
              className={HONOR_BTN_OUTLINE}
              onClick={() => {
                if (bulkOpen) {
                  resetBulk()
                } else {
                  setBulk(EMPTY_BULK_FORM)
                  setBulkOpen(true)
                }
              }}
            >
              <CalendarRange className="h-4 w-4" /> Schedule sessions
            </button>
            <button
              type="button"
              className={HONOR_BTN_PRIMARY}
              onClick={() => {
                if (formOpen && !editingId) {
                  resetForm()
                } else {
                  setForm(EMPTY_FORM)
                  setEditingId(null)
                  setFormOpen(true)
                }
              }}
            >
              <Plus className="h-4 w-4" /> New session
            </button>
          </div>
        }
      />

      {/* Google Calendar status hint */}
      {connected ? (
        <p className="mb-4 text-xs text-[#5b6678]">
          New sessions now sync to your Google Calendar
          {googleEmail ? ` (${googleEmail})` : ""}.
        </p>
      ) : (
        google.data &&
        !google.data.available && (
          <p className="mb-4 text-xs text-[#9299a6]">
            Google Calendar sync is coming soon — not yet configured
            {google.data.reason ? ` (${google.data.reason})` : ""}. Use{" "}
            <span className="font-medium text-[#5b6678]">Subscribe (iCal)</span> to add this schedule to
            Google, Apple, or Outlook today.
          </p>
        )
      )}

      {/* iCal subscribe panel */}
      {showFeed && (
        <HonorCard className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18202f]">Subscribe to this schedule (iCal)</h2>
            <button
              type="button"
              className="text-[#9299a6] hover:text-[#5b6678]"
              onClick={() => setShowFeed(false)}
              aria-label="Close subscribe panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {feedQuery.isLoading ? (
            <p className="text-sm text-[#5b6678]">Fetching your subscribe URL…</p>
          ) : feedUrl ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={feedUrl}
                  className={INPUT_CLASS + " font-mono text-xs"}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="iCal subscribe URL"
                />
                <button type="button" className={HONOR_BTN_OUTLINE} onClick={copyFeed}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#5b6678]">
                Paste this URL into <span className="font-medium">Google Calendar → Other calendars →
                From URL</span>, <span className="font-medium">Apple Calendar → New Calendar
                Subscription</span>, or <span className="font-medium">Outlook → Add calendar → Subscribe
                from web</span>. On Apple devices you can also open{" "}
                <a href={webcalUrl} className="font-medium text-[#1B2A4A] underline">
                  {webcalUrl}
                </a>{" "}
                to subscribe directly.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#5b6678]">
              Calendar subscription isn't available yet. Check back once schedule sync is enabled.
            </p>
          )}
        </HonorCard>
      )}

      {/* Bulk "Schedule sessions" form — one session per selected fellow */}
      {bulkOpen && (
        <HonorCard className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#18202f]">
              <CalendarRange className="h-4 w-4 text-[#1B2A4A]" /> Schedule sessions
            </h2>
            <button
              type="button"
              className="text-[#9299a6] hover:text-[#5b6678]"
              onClick={resetBulk}
              aria-label="Close schedule-sessions form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleBulkSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className={LABEL_CLASS}>
                <Users className="mr-1 inline h-3.5 w-3.5" /> Fellows ({bulk.fellowIds.size} selected)
              </span>
              {fellows.length === 0 ? (
                <p className="text-sm text-[#9299a6]">No fellows on your caseload yet.</p>
              ) : (
                <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-[#dfe4ec] p-2 sm:grid-cols-2">
                  {fellows.map((f) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-[#18202f] hover:bg-[#f6f7f9]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
                        checked={bulk.fellowIds.has(f.id)}
                        onChange={() => toggleBulkFellow(f.id)}
                      />
                      {fellowName(f.firstName, f.lastName)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="hb-start">
                Start
              </label>
              <input
                id="hb-start"
                type="datetime-local"
                className={INPUT_CLASS}
                value={bulk.startsAt}
                onChange={(e) => setBulk((b) => ({ ...b, startsAt: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS} htmlFor="hb-duration">
                  Duration
                </label>
                <select
                  id="hb-duration"
                  className={INPUT_CLASS}
                  value={bulk.durationMin}
                  onChange={(e) => setBulk((b) => ({ ...b, durationMin: Number(e.target.value) }))}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="hb-spacing">
                  Space between
                </label>
                <select
                  id="hb-spacing"
                  className={INPUT_CLASS}
                  value={bulk.spacingMin}
                  onChange={(e) => setBulk((b) => ({ ...b, spacingMin: Number(e.target.value) }))}
                >
                  {SPACING_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="hb-topic">
                Topic
              </label>
              <input
                id="hb-topic"
                className={INPUT_CLASS}
                value={bulk.topic}
                onChange={(e) => setBulk((b) => ({ ...b, topic: e.target.value }))}
                placeholder="Mid-cohort check-in"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="hb-message">
                Message (optional)
              </label>
              <textarea
                id="hb-message"
                className={INPUT_CLASS + " min-h-[72px] resize-y"}
                value={bulk.message}
                onChange={(e) => setBulk((b) => ({ ...b, message: e.target.value }))}
                placeholder="Included in the invitation to each fellow."
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151] sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
                checked={bulk.sendInvites}
                onChange={(e) => setBulk((b) => ({ ...b, sendInvites: e.target.checked }))}
              />
              Email .ics invite to fellows (coach cc&rsquo;d)
            </label>

            <div className="flex items-center gap-2 sm:col-span-2">
              <button type="submit" className={HONOR_BTN_PRIMARY} disabled={createBulkMut.isPending}>
                {createBulkMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarRange className="h-4 w-4" />
                )}
                {createBulkMut.isPending
                  ? "Scheduling…"
                  : `Schedule ${bulk.fellowIds.size} session${bulk.fellowIds.size === 1 ? "" : "s"}`}
              </button>
              <button type="button" className={HONOR_BTN_OUTLINE} onClick={resetBulk}>
                Cancel
              </button>
            </div>
          </form>
        </HonorCard>
      )}

      {/* New / edit session form */}
      {formOpen && (
        <HonorCard className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18202f]">
              {editingId ? "Edit session" : "New session"}
            </h2>
            <button
              type="button"
              className="text-[#9299a6] hover:text-[#5b6678]"
              onClick={resetForm}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="hs-title">
                Title
              </label>
              <input
                id="hs-title"
                className={INPUT_CLASS}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="PRISM debrief"
                required
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="hs-date">
                Date
              </label>
              <input
                id="hs-date"
                type="date"
                className={INPUT_CLASS}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS} htmlFor="hs-start">
                  Start
                </label>
                <input
                  id="hs-start"
                  type="time"
                  className={INPUT_CLASS}
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="hs-end">
                  End
                </label>
                <input
                  id="hs-end"
                  type="time"
                  className={INPUT_CLASS}
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="hs-fellow">
                Fellow (optional)
              </label>
              <select
                id="hs-fellow"
                className={INPUT_CLASS}
                value={form.fellowId}
                onChange={(e) => setForm((f) => ({ ...f, fellowId: e.target.value }))}
              >
                <option value="">— None —</option>
                {fellows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {fellowName(f.firstName, f.lastName)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="hs-kind">
                Kind
              </label>
              <select
                id="hs-kind"
                className={INPUT_CLASS}
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="hs-location">
                Location (optional)
              </label>
              <input
                id="hs-location"
                className={INPUT_CLASS}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Video call / Room 2B"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="hs-desc">
                Notes (optional)
              </label>
              <textarea
                id="hs-desc"
                className={INPUT_CLASS + " min-h-[72px] resize-y"}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Agenda, prep, links…"
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <button type="submit" className={HONOR_BTN_PRIMARY} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add session"}
              </button>
              <button type="button" className={HONOR_BTN_OUTLINE} onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </HonorCard>
      )}

      {/* Session list, grouped by day */}
      {isLoading ? (
        <HonorEmptyState>Loading schedule…</HonorEmptyState>
      ) : grouped.length === 0 ? (
        <HonorEmptyState>No sessions scheduled.</HonorEmptyState>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ day, items }) => (
            <HonorCard key={day}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#18202f]">
                <CalendarDays className="h-4 w-4 text-[#1B2A4A]" />
                {formatDayHeading(day)}
              </div>
              <ul className="space-y-2">
                {items.map((s) => {
                  const who = s.fellowId ? fellowNameById.get(s.fellowId) : undefined
                  return (
                    <li
                      key={s.id}
                      className="flex items-start gap-3 rounded-lg border border-[#f1f3f7] px-3 py-2.5"
                    >
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[rgba(27,42,74,0.08)] px-2 py-1 text-xs font-semibold text-[#1B2A4A]">
                        <Clock className="h-3.5 w-3.5" />
                        {formatClock(s.startsAt)}
                        {s.endsAt ? `–${formatClock(s.endsAt)}` : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium text-[#18202f]">{s.title}</span>
                          {s.kind && (
                            <span className="rounded-full bg-[#f1f3f7] px-2 py-0.5 text-[11px] font-medium text-[#5b6678]">
                              {KIND_LABEL[s.kind] ?? s.kind}
                            </span>
                          )}
                          {who && <span className="text-sm text-[#9299a6]">· {who}</span>}
                        </div>
                        {(s.location || s.description) && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9299a6]">
                            {s.location && (
                              <>
                                <MapPin className="h-3 w-3" /> {s.location}
                              </>
                            )}
                            {s.location && s.description ? " · " : ""}
                            {s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-[#5b6678] hover:bg-[#f6f7f9] hover:text-[#1B2A4A]"
                          onClick={() => startEdit(s)}
                          aria-label={`Edit ${s.title}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-[#5b6678] hover:bg-[#fdecec] hover:text-[#c0472b] disabled:opacity-50"
                          onClick={() => handleDelete(s)}
                          disabled={deleteMut.isPending}
                          aria-label={`Delete ${s.title}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </HonorCard>
          ))}
        </div>
      )}
    </div>
  )
}
