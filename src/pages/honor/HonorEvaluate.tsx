import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  Users,
  User,
  Upload,
  Loader2,
  Wand2,
  CheckSquare,
  Square,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeBodyHtml } from "@/lib/sanitizeHtml"
import { useCaseload } from "@/hooks/honor/useCoachData"
import { useHonorEvaluate, useHonorEvaluateReport } from "@/hooks/honor/useHonorEvaluate"
import { USE_HONOR_EVAL_LIVE } from "@/hooks/honor/mocks"
import { initiateUpload, uploadToS3, triggerProcessing } from "@/services/documents/documentService"
import type {
  HonorCareerFit,
  HonorCitedClaim,
  HonorComparative,
  HonorEvaluation,
  HonorFellow,
  HonorFitFactor,
  HonorGoalFit,
  HonorGoalVerdict,
} from "@/types/honor"
import {
  AgentTraceRow,
  HonorCard,
  HonorEmptyState,
  HonorMeter,
  HonorPageHeader,
  HonorPill,
  HonorSectionTitle,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName } from "./_format"

/**
 * Honor Coach Workbench — Evaluate Fellow (Phase 3).
 *
 * Wires the deterministic backend evaluate route
 * (POST /v1/agents/honor/coach/students/{fellow_id}/evaluate) into a structured,
 * CITED report: the objective evaluation, development areas, ranked career /
 * position fit, and goals-fit — every number computed server-side by the
 * config-weighted scorer (no model call), rendered verbatim. Selecting more than
 * one owned Fellow turns on the comparative matrix + team read (1:1 / 1:many /
 * many:many / team). A position description can be attached (doc_kind="position")
 * and Meridian can narrate the sections into prose on demand. The primary
 * (first-selected) Fellow is the subject; ownership is enforced server-side.
 */

// Known career-area archetypes (matches the backend fit_config; used for the
// team-read target select before a report exists).
const HONOR_CAREER_AREAS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "operations_program_management", label: "Operations Program Management" },
  { key: "security_risk_management", label: "Security Risk Management" },
  { key: "consulting_advisory", label: "Consulting & Advisory" },
  { key: "sales_business_development", label: "Sales & Business Development" },
  { key: "people_leadership", label: "People Leadership" },
  { key: "analysis_intelligence", label: "Analysis & Intelligence" },
]

const VERDICT_TONE: Record<HonorGoalVerdict, "ok" | "navy" | "orange" | "gray"> = {
  supported: "ok",
  mixed: "navy",
  "at-tension": "orange",
  unmapped: "gray",
}

/** Wrap Meridian's synthesized prose into sanitized paragraph HTML. */
function proseHtml(content: string): string {
  const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return esc
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/** Compact, model-free summary of the deterministic report to hand Meridian. */
function summarizeForNarration(report: HonorEvaluation, subjectName: string): string {
  const top = report.career_fit_ranked
    .slice(0, 3)
    .map((c) => `${c.label} ${c.score}`)
    .join(", ")
  const strengths = report.objective_evaluation.map((c) => c.source).join("; ")
  const goals = report.goals_fit.map((g) => `${g.goal} → ${g.verdict}`).join("; ")
  return [
    `Narrate this Honor Fellow evaluation for ${subjectName} in a direct, concise, dignified tone.`,
    `Do not invent or change any score. Cite the sources as given. Never surface classified detail.`,
    `Top career fit (0-100): ${top}.`,
    strengths ? `Strengths (cited): ${strengths}.` : "",
    goals ? `Stated goals: ${goals}.` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export default function HonorEvaluate() {
  const { data: fellows = [] } = useCaseload()
  const report = useHonorEvaluateReport()
  const narrate = useHonorEvaluate()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [goalsText, setGoalsText] = useState("")
  const [targetArea, setTargetArea] = useState<string>("operations_program_management")
  const [result, setResult] = useState<HonorEvaluation | null>(null)
  const [narrationHtml, setNarrationHtml] = useState<string>("")
  const [narrationTrace, setNarrationTrace] = useState<string[]>([])
  const [positionAttached, setPositionAttached] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const selectedFellows = useMemo(
    () => fellows.filter((f) => selected.has(f.id)),
    [fellows, selected],
  )
  const primary: HonorFellow | undefined = selectedFellows[0]
  const comparisonIds = selectedFellows.slice(1).map((f) => f.id)
  const mode =
    selectedFellows.length <= 1
      ? "Individual"
      : selectedFellows.length === 2
        ? "1:1 comparison"
        : `Team (${selectedFellows.length})`

  const nameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const f of fellows) m[f.id] = fellowName(f.firstName, f.lastName)
    return m
  }, [fellows])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = fellows.length > 0 && fellows.every((f) => selected.has(f.id))
  function toggleAll() {
    setSelected(() => (allSelected ? new Set<string>() : new Set(fellows.map((f) => f.id))))
  }

  const goals = useMemo(
    () =>
      goalsText
        .split("\n")
        .map((g) => g.trim())
        .filter(Boolean),
    [goalsText],
  )

  async function runEvaluation() {
    if (!primary) {
      toast.warning("Select a fellow to evaluate.")
      return
    }
    setNarrationHtml("")
    setNarrationTrace([])
    try {
      const data = await report.mutateAsync({
        fellowId: primary.id,
        body: {
          goals: goals.length ? goals : undefined,
          memberIds: comparisonIds.length ? comparisonIds : undefined,
          targetArea: comparisonIds.length ? targetArea : undefined,
        },
      })
      setResult(data ?? null)
      if (!data) toast.error("Evaluation returned no data.")
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      toast.error(
        status === 409
          ? "This fellow has no IG profile yet — invite them before evaluating."
          : "Evaluation failed. Please try again.",
      )
    }
  }

  async function onPositionFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !primary) return
    setUploading(true)
    try {
      // Attach the position description to the FELLOW (subject), doc_kind="position".
      const presigned = await initiateUpload({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        file_size: file.size,
        doc_kind: "position",
        subject_user_id: primary.id,
      })
      await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
      await triggerProcessing(presigned.document_id)
      setPositionAttached(file.name)
      toast.success(`Position description attached to ${fellowName(primary.firstName, primary.lastName)}.`)
    } catch {
      toast.error("Could not attach the position description.")
    } finally {
      setUploading(false)
    }
  }

  async function runNarration() {
    if (!result || !primary) return
    const subjectName = fellowName(primary.firstName, primary.lastName)
    try {
      const reply = await narrate.mutateAsync({
        prompt: summarizeForNarration(result, subjectName),
        memberId: primary.id,
      })
      if (reply.content.trim()) {
        setNarrationHtml(proseHtml(reply.content))
        setNarrationTrace(reply.trace?.length ? reply.trace : ["Meridian"])
      } else {
        toast.info("Meridian returned no narration.")
      }
    } catch {
      toast.error("Meridian narration is unavailable right now.")
    }
  }

  return (
    <div>
      <HonorPageHeader
        icon={Sparkles}
        title="Evaluate Fellow"
        description="A cited, deterministic evaluation from the Fellow's behavioral profile. Select more than one fellow to compare a pod. Meridian can narrate the result."
      />

      {/* Controls */}
      <HonorCard className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <HonorSectionTitle>Fellows</HonorSectionTitle>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-[#5b6678]">
              {selectedFellows.length <= 1 ? (
                <User className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {mode}
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5b6678] hover:text-[#1B2A4A]"
            >
              {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fellows.map((f) => {
            const on = selected.has(f.id)
            const isPrimary = primary?.id === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  on
                    ? "border-[#E8792B] bg-[rgba(232,121,43,0.06)]"
                    : "border-[#dfe4ec] bg-white hover:border-[#c6cdd9]",
                )}
              >
                <span>
                  <span className="font-medium text-[#18202f]">
                    {fellowName(f.firstName, f.lastName)}
                  </span>
                  <span className="block text-xs text-[#9299a6]">{f.target}</span>
                </span>
                {isPrimary ? (
                  <HonorPill tone="orange">Subject</HonorPill>
                ) : (
                  f.prism && <HonorPill tone="navy">{f.prism.label}</HonorPill>
                )}
              </button>
            )
          })}
        </div>
        {fellows.length === 0 && (
          <HonorEmptyState>No fellows on your caseload yet.</HonorEmptyState>
        )}

        {/* Goals + target area + position + run */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[#374151]">
              Goals &amp; objectives <span className="text-[#9299a6]">(one per line, optional)</span>
            </span>
            <textarea
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              placeholder={"Operations program management role\nLead a security team"}
              className="min-h-[70px] w-full resize-y rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
            />
          </label>

          <div className="flex flex-col gap-3">
            {comparisonIds.length > 0 && (
              <label className="text-sm">
                <span className="mb-1 block font-medium text-[#374151]">Team read — target area</span>
                <select
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
                >
                  {HONOR_CAREER_AREAS.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={onPositionFile}
              />
              <button
                type="button"
                disabled={!primary || uploading}
                onClick={() => fileRef.current?.click()}
                className={HONOR_BTN_OUTLINE}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {positionAttached ? "Replace position" : "Attach position description"}
              </button>
              {positionAttached && (
                <span className="text-xs text-[#5b6678]">Attached: {positionAttached}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={runEvaluation}
            disabled={!primary || report.isPending}
            className={HONOR_BTN_PRIMARY}
          >
            {report.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {report.isPending ? "Evaluating…" : "Run evaluation"}
          </button>
          {result && USE_HONOR_EVAL_LIVE && (
            <button
              type="button"
              onClick={runNarration}
              disabled={narrate.isPending}
              className={HONOR_BTN_OUTLINE}
            >
              {narrate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {narrate.isPending ? "Narrating…" : "Narrate with Meridian"}
            </button>
          )}
        </div>
      </HonorCard>

      {result && (
        <ReportView
          report={result}
          primaryName={primary ? fellowName(primary.firstName, primary.lastName) : "Fellow"}
          nameById={nameById}
          narrationHtml={narrationHtml}
          narrationTrace={narrationTrace}
        />
      )}
    </div>
  )
}

// ── Report render ────────────────────────────────────────────────────────────

function ReportView({
  report,
  primaryName,
  nameById,
  narrationHtml,
  narrationTrace,
}: {
  report: HonorEvaluation
  primaryName: string
  nameById: Record<string, string>
  narrationHtml: string
  narrationTrace: string[]
}) {
  const noScores = report.frameworks.length === 0
  return (
    <div className="space-y-6">
      {noScores && (
        <div className="rounded-lg border border-[#f0d9b8] bg-[#fdf6ec] px-4 py-3 text-sm text-[#8a5a12]">
          No scored assessments on file for this fellow yet — fit scores below are
          imputed-neutral. Import a PRISM report to get a real evaluation.
        </div>
      )}

      {narrationHtml && (
        <HonorCard>
          <HonorSectionTitle>Meridian narrative</HonorSectionTitle>
          <AgentTraceRow trace={narrationTrace} />
          <div
            className="prose prose-sm mt-2 max-w-none text-sm text-[#18202f] [&_p]:mb-2 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: sanitizeBodyHtml(narrationHtml) }}
          />
        </HonorCard>
      )}

      {/* 1. Objective evaluation */}
      <HonorCard>
        <HonorSectionTitle>Objective Evaluation — {primaryName}</HonorSectionTitle>
        <ClaimList claims={report.objective_evaluation} empty="No behavioral strengths on file." />
        {report.development_areas.length > 0 && (
          <>
            <div className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-[#9299a6]">
              Development areas
            </div>
            <ClaimList claims={report.development_areas} empty="" tone="orange" />
          </>
        )}
      </HonorCard>

      {/* 2. Goals & objectives fit */}
      {report.goals_fit.length > 0 && (
        <HonorCard>
          <HonorSectionTitle>Goals &amp; Objectives — Fit</HonorSectionTitle>
          <ul className="mt-2 space-y-3">
            {report.goals_fit.map((g, i) => (
              <GoalRow key={`${g.goal}-${i}`} goal={g} />
            ))}
          </ul>
        </HonorCard>
      )}

      {/* 3. Career / position fit — ranked */}
      <HonorCard>
        <HonorSectionTitle>Career / Position Fit — Ranked</HonorSectionTitle>
        <div className="mt-2 space-y-3">
          {report.career_fit_ranked.map((c) => (
            <CareerRow key={c.area} fit={c} />
          ))}
        </div>
      </HonorCard>

      {/* 4. Comparative / team */}
      {report.comparative && (
        <ComparativeView
          comparative={report.comparative}
          career={report.career_fit_ranked}
          primaryName={primaryName}
          nameById={nameById}
        />
      )}

      <p className="text-xs text-[#9299a6]">{report.notes}</p>
    </div>
  )
}

function ClaimList({
  claims,
  empty,
  tone = "navy",
}: {
  claims: HonorCitedClaim[]
  empty: string
  tone?: "navy" | "orange"
}) {
  if (claims.length === 0) {
    return empty ? <p className="mt-2 text-sm text-[#9299a6]">{empty}</p> : null
  }
  return (
    <ul className="mt-2 space-y-2">
      {claims.map((c, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-[#18202f]">
          <span>{c.statement}</span>
          <HonorPill tone={tone === "orange" ? "orange" : "gray"}>{c.source}</HonorPill>
        </li>
      ))}
    </ul>
  )
}

function FactorPills({ factors, label }: { factors: HonorFitFactor[]; label: string }) {
  if (factors.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[#9299a6]">{label}:</span>
      {factors.map((f) => (
        <HonorPill key={f.feature} tone="gray">
          {f.source}
        </HonorPill>
      ))}
    </div>
  )
}

function CareerRow({ fit }: { fit: HonorCareerFit }) {
  return (
    <div className="rounded-lg border border-[#f1f3f7] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-medium text-[#18202f]">{fit.label}</span>
        <span className="text-sm font-semibold text-[#1B2A4A]">{fit.score}</span>
      </div>
      <HonorMeter value={fit.score} tone={fit.score >= 80 ? "orange" : "navy"} />
      <FactorPills factors={fit.top_factors} label="Drivers" />
      <FactorPills factors={fit.top_gaps} label="Gaps" />
    </div>
  )
}

function GoalRow({ goal }: { goal: HonorGoalFit }) {
  return (
    <li className="rounded-lg border border-[#f1f3f7] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#18202f]">{goal.goal}</span>
        <span className="flex items-center gap-2">
          {goal.score != null && <span className="text-sm text-[#5b6678]">{goal.score}</span>}
          <HonorPill tone={VERDICT_TONE[goal.verdict]}>{goal.verdict}</HonorPill>
        </span>
      </div>
      {goal.label && goal.verdict !== "unmapped" && (
        <div className="mt-0.5 text-xs text-[#9299a6]">vs {goal.label}</div>
      )}
      <FactorPills factors={goal.factors} label="Support" />
    </li>
  )
}

function ComparativeView({
  comparative,
  career,
  primaryName,
  nameById,
}: {
  comparative: HonorComparative
  career: HonorCareerFit[]
  primaryName: string
  nameById: Record<string, string>
}) {
  // Columns = the archetype areas (labels from the primary's ranked list).
  const areaLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of career) m[c.area] = c.label
    return m
  }, [career])
  const areas = comparative.areas.filter((a) => a !== "uploaded_position")
  const primaryScores = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of career) m[c.area] = c.score
    return m
  }, [career])

  // Rows = primary (from ranked list) + each comparison subject.
  const rows: Array<{ id: string; name: string; scores: Record<string, number> }> = [
    { id: "__primary__", name: `${primaryName} (subject)`, scores: primaryScores },
    ...comparative.subjects.map((sid) => ({
      id: sid,
      name: nameById[sid] ?? sid,
      scores: comparative.per_subject_area_fit[sid] ?? {},
    })),
  ]

  return (
    <HonorCard className="p-0">
      <div className="p-5 pb-0">
        <HonorSectionTitle>Comparative — fit by area</HonorSectionTitle>
      </div>
      <div className="overflow-x-auto p-5 pt-2">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#5b6678]">
            <tr>
              <th className="py-2 pr-4">Fellow</th>
              {areas.map((a) => (
                <th key={a} className="px-3 py-2">
                  {areaLabel[a] ?? a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#f1f3f7]">
                <td className="py-3 pr-4 font-medium text-[#18202f]">{r.name}</td>
                {areas.map((a) => {
                  const v = r.scores[a] ?? 0
                  const best = Math.max(...rows.map((rr) => rr.scores[a] ?? 0))
                  return (
                    <td key={a} className="px-3 py-3">
                      <HonorMeter value={v} tone={v === best && v > 0 ? "orange" : "navy"} right={`${v}`} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparative.team_read && (
        <div className="border-t border-[#f1f3f7] p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9299a6]">
            Team read — {comparative.team_read.label}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <TeamChips label="Covered" items={comparative.team_read.covered} tone="ok" />
            <TeamChips label="Gaps" items={comparative.team_read.gaps} tone="orange" />
            <TeamChips label="Complementary" items={comparative.team_read.complementary} tone="navy" />
            <TeamChips label="Redundant" items={comparative.team_read.redundant} tone="gray" />
          </div>
        </div>
      )}
    </HonorCard>
  )
}

function TeamChips({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "ok" | "orange" | "navy" | "gray"
}) {
  return (
    <div>
      <span className="text-xs text-[#9299a6]">{label}:</span>{" "}
      {items.length === 0 ? (
        <span className="text-xs text-[#c6cdd9]">—</span>
      ) : (
        <span className="inline-flex flex-wrap gap-1.5">
          {items.map((it) => (
            <HonorPill key={it} tone={tone}>
              {it.split(":").pop()}
            </HonorPill>
          ))}
        </span>
      )}
    </div>
  )
}
