import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ShieldAlert,
  FileText,
  Upload,
  ClipboardList,
  Sparkles,
  Target,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useCaseload, useFellow } from "@/hooks/honor/useCoachData"
import { MOCK_GOALS, MOCK_SUGGESTED_GOALS } from "@/hooks/honor/mocks"
import {
  AgentTraceRow,
  HonorCard,
  HonorEmptyState,
  HonorMeter,
  HonorPill,
  HonorSectionTitle,
  PrismDots,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName, initials } from "./_format"

/**
 * Honor Coach Workbench — Fellow Profile / Workspace (`/coach/member/{id}`).
 *
 * Wiring target: `GET /v1/coach/member/{id}` (net-new), guarded by
 * `require_fellow_access` — opening a member not assigned to the coach returns
 * a 403 (demoed below) and is logged to `audit_logs`. Intake reuses the existing
 * `PrismAssessment.tsx` bound via `?member={id}`; Documents reuse the real
 * document hooks; Goals persist to `user_milestones` (Ascend). Mock-backed via
 * {@link useFellow}.
 */

type Tab = "overview" | "intake" | "evaluate" | "goals" | "education"
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "intake", label: "Intake" },
  { id: "evaluate", label: "Evaluate" },
  { id: "goals", label: "Goal Setting" },
  { id: "education", label: "Education & Training" },
]

export default function HonorMemberProfile() {
  const navigate = useNavigate()
  const { memberId } = useParams<{ memberId: string }>()
  const { data: fellows = [] } = useCaseload()

  // No id in the URL → land on the first assigned member (matches the wireframe init).
  const effectiveId = memberId ?? fellows[0]?.id
  const { data: fellow, isLoading } = useFellow(effectiveId)

  const [tab, setTab] = useState<Tab>(memberId ? "overview" : "overview")
  const [denied, setDenied] = useState(false)

  const goals = useMemo(() => MOCK_GOALS.filter((g) => g.fellowId === effectiveId), [effectiveId])
  const suggested = useMemo(
    () => MOCK_SUGGESTED_GOALS.filter((g) => g.fellowId === effectiveId),
    [effectiveId]
  )

  if (isLoading) return <HonorEmptyState>Loading fellow…</HonorEmptyState>
  if (!fellow) return <HonorEmptyState>Fellow not found on your caseload.</HonorEmptyState>

  const name = fellowName(fellow.firstName, fellow.lastName)

  return (
    <div>
      {/* Member header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(27,42,74,0.10)] text-sm font-bold text-[#1B2A4A]">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[#18202f]">{name}</h1>
          <p className="text-sm text-[#9299a6]">
            #{fellow.id} · {fellow.cohort} · {fellow.background} → {fellow.target}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            onClick={() => setDenied(true)}
            title="Demo the ownership guard"
          >
            <ShieldAlert className="h-4 w-4" /> Simulate opening someone else&apos;s fellow
          </button>
        </div>
      </div>

      {/* 403 access-denial demo */}
      {denied && (
        <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-[#e6c3bb] bg-[rgba(192,71,43,0.06)] p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#c0472b]" />
          <div className="text-sm">
            <p className="font-semibold text-[#c0472b]">403 — Not your fellow</p>
            <p className="text-[#5b6678]">
              Coach {name.split(" ")[0] === "Coach" ? name : "S. Carter"} has no assignment for fellow
              #4471. The attempt is logged to <code className="font-mono text-xs">audit_logs</code> and
              enforced by the <code className="font-mono text-xs">require_fellow_access</code>{" "}
              dependency.
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-[#c0472b] hover:underline"
              onClick={() => setDenied(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-[#dfe4ec]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-[#E8792B] text-[#c9631a]"
                : "border-transparent text-[#5b6678] hover:text-[#18202f]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <HonorCard>
            <HonorSectionTitle>Behavioral snapshot</HonorSectionTitle>
            <AgentTraceRow trace={["Aura", "Meridian"]} />
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="PRISM (source of truth)">
                {fellow.prism?.quads?.length ? (
                  <PrismDots quads={fellow.prism.quads} label={fellow.prism.label} />
                ) : (
                  "—"
                )}
              </Row>
              <Row label="DISC">{fellow.disc ?? "—"}</Row>
              <Row label="CliftonStrengths">
                {fellow.cliftonStrengths?.length ? fellow.cliftonStrengths.join(" · ") : "—"}
              </Row>
              <Row label="Service → target">
                {fellow.background} → {fellow.target}
              </Row>
            </dl>
          </HonorCard>

          <HonorCard>
            <HonorSectionTitle
              action={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#E8792B] hover:underline"
                  onClick={() => toast.info("Presigned upload via document-service (stub)")}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              }
            >
              Documents on file
            </HonorSectionTitle>
            {(fellow.docs ?? []).length === 0 ? (
              <p className="text-sm text-[#9299a6]">No documents yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(fellow.docs ?? []).map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
                    <FileText className="h-4 w-4 text-[#1B2A4A]" />
                    <span className="text-[#18202f]">{d.name}</span>
                    <span className="ml-auto text-xs text-[#9299a6]">{d.uploadedAt}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <HonorSectionTitle>Quick actions</HonorSectionTitle>
              <div className="flex flex-wrap gap-2">
                <QuickAction icon={ClipboardList} label="Open questionnaire" onClick={() => setTab("intake")} />
                <QuickAction icon={Sparkles} label="Evaluate fellow" onClick={() => setTab("evaluate")} />
                <QuickAction icon={Target} label="Set goals" onClick={() => setTab("goals")} />
                <QuickAction icon={GraduationCap} label="Find training" onClick={() => setTab("education")} />
              </div>
            </div>
          </HonorCard>
        </div>
      )}

      {/* Intake — PRISM questionnaire embed */}
      {tab === "intake" && (
        <HonorCard>
          <HonorSectionTitle>PRISM Behavioral Questionnaire — Part 1A</HonorSectionTitle>
          <p className="mb-4 text-sm text-[#9299a6]">Question 3 of 40</p>
          <p className="mb-3 text-sm font-medium text-[#18202f]">
            Rank these words by how well they describe your working preference (1 = most like you).
          </p>
          <div className="space-y-2">
            {["Decisive", "Supportive", "Analytical", "Expressive"].map((w, i) => (
              <div
                key={w}
                className="flex items-center justify-between rounded-lg border border-[#dfe4ec] px-3 py-2.5 text-sm"
              >
                <span className="text-[#18202f]">{w}</span>
                <select
                  className="rounded-md border border-[#dfe4ec] px-2 py-1 text-sm outline-none focus:border-[#1B2A4A]"
                  defaultValue={String(i + 1)}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" className={HONOR_BTN_OUTLINE}>
              Back
            </button>
            <button
              type="button"
              className={HONOR_BTN_PRIMARY}
              onClick={() => toast.success("Answer saved to prism_results — advancing to Q4 (stub)")}
            >
              Save &amp; continue
            </button>
          </div>
          <p className="mt-3 text-xs text-[#9299a6]">
            Reuses the platform&apos;s <code className="font-mono">PrismAssessment.tsx</code> bound via{" "}
            <code className="font-mono">?member={fellow.id}</code> (PRISM UK Service Library flow).
          </p>
        </HonorCard>
      )}

      {/* Evaluate shortcut */}
      {tab === "evaluate" && (
        <HonorCard>
          <HonorSectionTitle>Evaluate {name}</HonorSectionTitle>
          <p className="mb-3 text-sm text-[#5b6678]">
            Run the multi-agent evaluation for this fellow on the full Evaluate surface.
          </p>
          <button
            type="button"
            className={HONOR_BTN_PRIMARY}
            onClick={() => navigate(ROUTES.HONOR.EVALUATE)}
          >
            <Sparkles className="h-4 w-4" /> Open Evaluate
          </button>
        </HonorCard>
      )}

      {/* Goals */}
      {tab === "goals" && (
        <HonorCard>
          <HonorSectionTitle>Transition goals</HonorSectionTitle>
          {goals.length === 0 ? (
            <p className="text-sm text-[#9299a6]">No goals set yet.</p>
          ) : (
            <ul className="space-y-3">
              {goals.map((g) => (
                <li key={g.id}>
                  <HonorMeter value={g.progress} tone="orange" label={g.title} right={`${g.progress}%`} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <HonorSectionTitle>Suggested by Ascend</HonorSectionTitle>
            <AgentTraceRow trace={["Aura", "Ascend", "Meridian"]} />
            <ul className="mt-3 space-y-2">
              {suggested.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#f1f3f7] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-[#18202f]">
                    <Target className="h-4 w-4 text-[#E8792B]" /> {g.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => toast.success("Goal added to user_milestones (stub)")}
                    className="text-xs font-medium text-[#E8792B] hover:underline"
                  >
                    Add as goal
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </HonorCard>
      )}

      {/* Education & training (Pathfinder) */}
      {tab === "education" && (
        <HonorCard>
          <HonorSectionTitle>Pathfinder — Education &amp; Training</HonorSectionTitle>
          <AgentTraceRow trace={["Echo", "Bridge", "Grant", "Meridian"]} />
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <GraduationCap className="h-4 w-4 text-[#1B2A4A]" /> PMP Cert Prep · PMI
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <GraduationCap className="h-4 w-4 text-[#1B2A4A]" /> Google PM Certificate · Coursera
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <HonorPill tone="orange">Placement</HonorPill> Local employer apprenticeship — Ops Analyst
              via Bridge pipeline · Raleigh, NC
            </li>
          </ul>
        </HonorCard>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f3f7] pb-2 last:border-0">
      <dt className="text-[#5b6678]">{label}</dt>
      <dd className="text-right font-medium text-[#18202f]">{children}</dd>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Target
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe4ec] bg-white px-3 py-1.5 text-xs font-medium text-[#1B2A4A] transition-colors hover:border-[#E8792B] hover:text-[#c9631a]"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
