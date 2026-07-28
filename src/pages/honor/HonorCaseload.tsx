import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Users, UserPlus, Upload, Search, ArrowRight, Mail, Loader2, ClipboardList } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useCaseload } from "@/hooks/honor/useCoachData"
import { useHonorInvitations, useSetFellowStatus } from "@/hooks/honor/useHonorInvitations"
import type { FellowStatus, HonorFellow } from "@/types/honor"
import { HonorCard, HonorEmptyState, HonorPageHeader, HonorPill, PrismDots } from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName, fellowStatusLabel } from "./_format"
import InviteComposer from "./InviteComposer"
import RequestPrismModal from "./RequestPrismModal"

/**
 * Honor Coach Workbench — My Fellows (Caseload).
 *
 * Wiring target: `GET /v1/coach/members` (net-new) resolves the coach's
 * `coach_member_assignments`, JWT-scoped by `sub` and enforced server-side by
 * `require_fellow_access`. Mock-backed via {@link useCaseload}.
 */

const FELLOW_STATUSES: FellowStatus[] = ["intake-pending", "assessed", "invited"]

/**
 * Per-fellow status control — a small labelled dropdown the coach uses to move a
 * fellow between Intake pending / Assessed / Invited. The selected value is
 * tinted to match the status pill so the roster still reads at a glance.
 */
function FellowStatusControl({ fellow }: { fellow: HonorFellow }) {
  const setStatus = useSetFellowStatus()
  const tone =
    fellow.status === "assessed"
      ? "text-[#1a7f4b] ring-[#bfe6cf]"
      : fellow.status === "intake-pending"
        ? "text-[#a2531a] ring-[#f0c39a]"
        : "text-[#5b6678] ring-[#dfe4ec]"
  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        aria-label={`Status for ${fellowName(fellow.firstName, fellow.lastName)}`}
        value={fellow.status}
        disabled={setStatus.isPending}
        onChange={(e) => {
          const next = e.target.value as FellowStatus
          if (next !== fellow.status) setStatus.mutate({ fellowId: fellow.id, status: next })
        }}
        className={`rounded-full bg-white px-2.5 py-1 text-xs font-medium outline-none ring-1 focus:ring-2 disabled:opacity-50 ${tone}`}
      >
        {FELLOW_STATUSES.map((s) => (
          <option key={s} value={s}>
            {fellowStatusLabel(s)}
          </option>
        ))}
      </select>
      {setStatus.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9299a6]" />}
    </div>
  )
}

export default function HonorCaseload() {
  const navigate = useNavigate()
  const { data: fellows = [], isLoading } = useCaseload()
  const [query, setQuery] = useState("")

  // Caseload counts derived from the live roster (no fixed sample totals).
  const counts = useMemo(
    () => ({
      assigned: fellows.length,
      assessed: fellows.filter((f) => f.status === "assessed").length,
      intakePending: fellows.filter((f) => f.status === "intake-pending").length,
    }),
    [fellows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fellows
    return fellows.filter(
      (f) =>
        fellowName(f.firstName, f.lastName).toLowerCase().includes(q) ||
        f.background.toLowerCase().includes(q) ||
        f.target.toLowerCase().includes(q)
    )
  }, [fellows, query])

  function openMember(f: HonorFellow) {
    navigate(ROUTES.HONOR.memberWorkspace(f.id))
  }

  // ── Bulk "send invitations to selected" ──────────────────────────────
  const invitations = useHonorInvitations()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sendEmail, setSendEmail] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [prismOpen, setPrismOpen] = useState(false)

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allVisibleSelected = filtered.length > 0 && filtered.every((f) => selected.has(f.id))
  function toggleAll() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        filtered.forEach((f) => next.delete(f.id))
        return next
      }
      return new Set([...prev, ...filtered.map((f) => f.id)])
    })
  }
  /** Open the composer (when emailing) or link silently (when the email is off). */
  async function sendSelected() {
    const ids = [...selected]
    if (!ids.length) return
    if (sendEmail) {
      setComposerOpen(true)
      return
    }
    // No email → no message to compose; link the fellows straight away.
    await invitations.mutateAsync({ fellowIds: ids, sendEmail: false })
    setSelected(new Set())
  }

  /** Composer "Send" — fire the bulk invite with the composed message body. */
  async function handleComposerSend(messageHtml: string) {
    const ids = [...selected]
    if (!ids.length) return
    await invitations.mutateAsync({ fellowIds: ids, sendEmail: true, messageHtml })
    setComposerOpen(false)
    setSelected(new Set())
  }

  return (
    <div>
      <HonorPageHeader
        icon={Users}
        title="My Fellows"
        description="The Honor fellows on your caseload. Open a fellow to run their intake, evaluation, and plan."
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPrismOpen(true)} className={HONOR_BTN_OUTLINE}>
              <ClipboardList className="h-4 w-4" /> Request a PRISM report
            </button>
            <Link to={ROUTES.HONOR.ONBOARD} className={HONOR_BTN_OUTLINE}>
              <Upload className="h-4 w-4" /> Import CSV
            </Link>
            <Link to={ROUTES.HONOR.ONBOARD} className={HONOR_BTN_PRIMARY}>
              <UserPlus className="h-4 w-4" /> Add fellow
            </Link>
          </div>
        }
      />

      {/* Stat pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        <HonorPill tone="navy">{counts.assigned} assigned</HonorPill>
        <HonorPill tone="ok">{counts.assessed} assessed</HonorPill>
        <HonorPill tone="orange">{counts.intakePending} intake pending</HonorPill>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9299a6]" />
        <input
          aria-label="Search fellows"
          placeholder="Search by name, background, or target"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-[#dfe4ec] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1B2A4A]"
        />
      </div>

      {/* Bulk invitation bar — shows when fellows are selected */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-[#dfe4ec] bg-[#f8fafc] px-4 py-2.5">
          <span className="text-sm font-medium text-[#18202f]">{selected.size} selected</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-[#374151]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Send invitation email
          </label>
          <button
            type="button"
            onClick={sendSelected}
            disabled={invitations.isPending}
            className={HONOR_BTN_PRIMARY}
          >
            {invitations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {invitations.isPending ? "Sending…" : `Send invitations to ${selected.size} selected`}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-[#5b6678] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <HonorEmptyState>Loading your caseload…</HonorEmptyState>
      ) : filtered.length === 0 ? (
        <HonorEmptyState>No fellows match “{query}”.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Select all fellows"
                    />
                  </th>
                  <th className="px-4 py-3">Fellow</th>
                  <th className="px-4 py-3">Background → Target</th>
                  <th className="px-4 py-3">Behavioral frameworks</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b border-[#f1f3f7] last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#c6cdd9] accent-[#E8792B]"
                        checked={selected.has(f.id)}
                        onChange={() => toggleOne(f.id)}
                        aria-label={`Select ${fellowName(f.firstName, f.lastName)}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openMember(f)}
                        className="text-left font-medium text-[#18202f] hover:text-[#E8792B]"
                      >
                        {fellowName(f.firstName, f.lastName)}
                      </button>
                      <div className="text-xs text-[#9299a6]">
                        #{f.id} · {f.cohort}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">
                      <span className="text-[#5b6678]">{f.background}</span>
                      <span className="mx-1.5 text-[#c6cdd9]">→</span>
                      <span className="font-medium">{f.target}</span>
                    </td>
                    <td className="px-4 py-3">
                      {f.prism?.quads?.length ? (
                        <div className="flex flex-col gap-0.5">
                          <PrismDots quads={f.prism.quads} label={`PRISM ${f.prism.label}`} />
                          <span className="text-xs text-[#9299a6]">
                            {[f.disc ? `DISC ${f.disc}` : null, (f.cliftonStrengths ?? []).slice(0, 2).join("/")]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#9299a6]">Awaiting intake</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FellowStatusControl fellow={f} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => openMember(f)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#E8792B] hover:underline"
                        >
                          {f.status === "intake-pending" ? "Open intake" : "Open"}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}

      <InviteComposer
        open={composerOpen}
        recipientCount={selected.size}
        onCancel={() => setComposerOpen(false)}
        onSend={handleComposerSend}
        pending={invitations.isPending}
      />

      <RequestPrismModal open={prismOpen} onClose={() => setPrismOpen(false)} />
    </div>
  )
}
