import { useState } from "react"
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
import { useFellowPrism, useRequestFellowPrism } from "@/hooks/honor/useHonorEvaluate"
import {
  AgentTraceRow,
  HonorCard,
  HonorEmptyState,
  HonorSectionTitle,
  PrismDots,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName, initials } from "./_format"
import type { HonorPrismScore } from "@/types/honor"

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

type Tab = "overview" | "prism" | "evaluate" | "goals" | "education"
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "prism", label: "PRISM Report" },
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
  const prismQuery = useFellowPrism(effectiveId)
  const requestPrism = useRequestFellowPrism()

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
                <QuickAction icon={ClipboardList} label="PRISM report" onClick={() => setTab("prism")} />
                <QuickAction icon={Sparkles} label="Evaluate fellow" onClick={() => setTab("evaluate")} />
                <QuickAction icon={Target} label="Set goals" onClick={() => setTab("goals")} />
                <QuickAction icon={GraduationCap} label="Find training" onClick={() => setTab("education")} />
              </div>
            </div>
          </HonorCard>
        </div>
      )}

      {/* PRISM Report — the fellow's scores from the imported CSV, or request one */}
      {tab === "prism" && (
        <HonorCard>
          <HonorSectionTitle>PRISM Report — {name}</HonorSectionTitle>
          {prismQuery.isLoading ? (
            <p className="text-sm text-[#9299a6]">Loading PRISM report…</p>
          ) : prismQuery.data?.managed ? (
            <p className="text-sm text-[#9299a6]">
              Invite {name.split(" ")[0]} first — a managed fellow has no profile yet to attach a
              PRISM report to.
            </p>
          ) : prismQuery.data?.hasReport ? (
            <div>
              <p className="mb-3 text-xs text-[#9299a6]">
                {prismQuery.data.scoreCount ?? prismQuery.data.scores.length} scores
                {prismQuery.data.assessedAt
                  ? ` · imported ${new Date(prismQuery.data.assessedAt).toLocaleDateString()}`
                  : ""}
              </p>
              {(() => {
                const groups: Record<string, HonorPrismScore[]> = {}
                for (const s of prismQuery.data.scores ?? []) {
                  const cat = s.category || "Scores"
                  ;(groups[cat] ||= []).push(s)
                }
                return Object.entries(groups).map(([cat, rows]) => (
                  <div key={cat} className="mb-4">
                    <h3 className="mb-1.5 text-sm font-semibold text-[#1B2A4A]">{cat}</h3>
                    <div className="overflow-hidden rounded-lg border border-[#e6e9ef]">
                      {rows.map((s, i) => (
                        <div
                          key={`${cat}-${s.dimension}-${i}`}
                          className={`flex items-center justify-between px-3 py-2 text-sm ${
                            i % 2 ? "bg-[#f7f9fc]" : "bg-white"
                          }`}
                        >
                          <span className="text-[#18202f]">
                            {s.dimension}
                            {s.subDimension ? (
                              <span className="text-[#9299a6]"> · {s.subDimension}</span>
                            ) : null}
                          </span>
                          <span className="font-semibold text-[#1B2A4A]">
                            {s.score != null
                              ? s.score
                              : s.scoreText ?? (s.rank != null ? `#${s.rank}` : "—")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-[#5b6678]">
                No PRISM report on file for {name.split(" ")[0]} yet. Request one below — once it’s
                added (during onboarding or via an assessment import), the scores appear here.
              </p>
              <button
                type="button"
                className={HONOR_BTN_PRIMARY}
                disabled={requestPrism.isPending || !fellow}
                onClick={() => fellow && requestPrism.mutate(fellow.id)}
              >
                <ClipboardList className="h-4 w-4" /> Request a PRISM Report
              </button>
            </div>
          )}
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
          <p className="text-sm text-[#9299a6]">No goals set yet.</p>
          <p className="mt-2 text-xs text-[#9299a6]">
            Set goals with {name.split(" ")[0]} on the Evaluate surface, where Meridian can
            score them against the behavioral profile.
          </p>
          <div className="mt-4">
            <button
              type="button"
              className={HONOR_BTN_OUTLINE}
              onClick={() => navigate(ROUTES.HONOR.EVALUATE)}
            >
              <Sparkles className="h-4 w-4" /> Open Evaluate
            </button>
          </div>
        </HonorCard>
      )}

      {/* Education & training (Pathfinder) */}
      {tab === "education" && (
        <HonorCard>
          <HonorSectionTitle>Pathfinder — Education &amp; Training</HonorSectionTitle>
          <p className="text-sm text-[#9299a6]">
            No education or training recommendations yet.
          </p>
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
