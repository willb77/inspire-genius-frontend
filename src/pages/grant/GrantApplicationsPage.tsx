import { useEffect, useMemo, useState } from "react"
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Lock,
  ShieldCheck,
  ExternalLink,
  FileText,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useFafsaApplication,
  useFafsaCompleteness,
  useFafsaFieldCatalog,
  useFafsaHandoff,
  useGenerateFafsaPacket,
  useSetFafsaHandoffStep,
  useUpdateFafsaSections,
} from "@/hooks/grant/useFafsa"
import type { FafsaField, FafsaPacket, FafsaSection } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantPill, GrantMeter, GrantSectionTitle } from "./_shared"

/** One editable/read-only field row inside a collect section. */
function FafsaFieldRow({
  field,
  value,
  onChange,
}: {
  field: FafsaField
  value: string
  onChange: (v: string) => void
}) {
  // DDX + sensitive fields are never collected — show them as locked rows so the
  // student understands the tax section auto-fills and the SSN is entered on the
  // federal site, not here.
  if (!field.collectable) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#eef1f4] bg-[#f9fafb] p-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#9ca3af]" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">{field.label}</span>
            <GrantPill tone={field.ddx ? "teal" : "amber"}>
              {field.ddx ? "Auto-fills on consent" : "You enter on StudentAid.gov"}
            </GrantPill>
          </div>
          {field.help && <p className="mt-1 text-xs text-[#9ca3af]">{field.help}</p>}
        </div>
      </div>
    )
  }

  const inputCls =
    "w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#3B5BFF]"

  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-[#374151]">
        {field.label}
        {field.required && <span className="text-[#ef4444]">*</span>}
      </span>
      {field.type === "boolean" ? (
        <select
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
        >
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : field.type === "select" && field.options.length > 0 ? (
        <select
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
        >
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputCls}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
          placeholder={field.type === "school_list" ? "Comma-separated school codes" : undefined}
        />
      )}
      {field.help && <p className="mt-1 text-xs text-[#9ca3af]">{field.help}</p>}
    </label>
  )
}

/** Coerce a draft string back to the JSON type the backend expects. */
function coerce(field: FafsaField, raw: string): unknown {
  if (raw === "") return ""
  if (field.type === "number") return Number(raw)
  if (field.type === "boolean") return raw === "true"
  if (field.type === "school_list")
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  return raw
}

function stringify(v: unknown): string {
  if (v == null) return ""
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "boolean") return v ? "true" : "false"
  return String(v)
}

/** A collect section card with inline editing + save. */
function CollectSection({
  section,
  sections,
  onSave,
  saving,
}: {
  section: FafsaSection
  sections: Record<string, unknown>
  onSave: (patch: Record<string, unknown>) => void
  saving: boolean
}) {
  const editable = section.fields.filter((f) => f.collectable)
  const [draft, setDraft] = useState<Record<string, string>>({})

  // Seed the draft from the persisted answers whenever they change.
  useEffect(() => {
    const seed: Record<string, string> = {}
    for (const f of editable) seed[f.key] = stringify(sections[f.key])
    setDraft(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.key, JSON.stringify(sections)])

  function save() {
    const patch: Record<string, unknown> = {}
    for (const f of editable) {
      const val = coerce(f, draft[f.key] ?? "")
      if (val !== "") patch[f.key] = val
    }
    if (Object.keys(patch).length > 0) onSave(patch)
  }

  return (
    <GrantCard className="mb-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[#1f2937]">{section.title}</h3>
        <p className="text-xs text-[#9ca3af]">{section.description}</p>
      </div>
      <div className="space-y-3">
        {section.fields.map((f) => (
          <FafsaFieldRow
            key={f.key}
            field={f}
            value={draft[f.key] ?? ""}
            onChange={(v) => setDraft((prev) => ({ ...prev, [f.key]: v }))}
          />
        ))}
      </div>
      {editable.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#3B5BFF] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f49cc] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save section"}
          </button>
        </div>
      )}
    </GrantCard>
  )
}

/** The generated prep-packet summary. */
function PacketSummary({ packet }: { packet: FafsaPacket }) {
  return (
    <GrantCard className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#3B5BFF]" />
        <span className="text-sm font-semibold text-[#1f2937]">
          Prep packet — FAFSA {packet.awardYear}
        </span>
        <GrantPill tone={packet.ready ? "green" : "amber"}>
          {packet.ready ? "Submission-ready" : "In progress"}
        </GrantPill>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <GrantPill tone="blue">{packet.counts.prefilled} pre-filled</GrantPill>
        <GrantPill tone="teal">{packet.counts.collected} completed</GrantPill>
        {packet.counts.missingRequired > 0 && (
          <GrantPill tone="amber">{packet.counts.missingRequired} still needed</GrantPill>
        )}
      </div>
      <ul className="mb-3 space-y-1">
        {packet.summary.map((line, i) => (
          <li key={i} className="text-sm text-[#374151]">
            {line}
          </li>
        ))}
      </ul>
      <p className="rounded-lg bg-[#f9fafb] p-3 text-xs leading-relaxed text-[#6b7280]">
        {packet.disclaimer}
      </p>
    </GrantCard>
  )
}

/**
 * UI-7 — Application Concierge (FAFSA).
 *
 * The real FAFSA collect → prep-packet → guided StudentAid.gov handoff flow,
 * wired to `/v1/agents/grant/fafsa/*`. GRANT stages every non-tax field so the
 * student confirms rather than hunts; the tax section auto-fills from the IRS on
 * consent and the SSN is entered on the federal site — GRANT stores neither.
 * GRANT never submits the FAFSA; the handoff checklist guides the federally
 * required steps.
 */
export default function GrantApplicationsPage() {
  const { data: application } = useFafsaApplication()
  const { data: catalog, isLoading: catalogLoading } = useFafsaFieldCatalog()
  const { data: completeness } = useFafsaCompleteness()
  const { data: handoff } = useFafsaHandoff()

  const updateSections = useUpdateFafsaSections()
  const generatePacket = useGenerateFafsaPacket()
  const setStep = useSetFafsaHandoffStep()

  const [packet, setPacket] = useState<FafsaPacket | null>(null)

  const answers = useMemo(
    () => (application?.sections as Record<string, unknown>) ?? {},
    [application]
  )
  const collectSections = useMemo(
    () => (catalog?.sections ?? []).filter((s) => !s.handoff),
    [catalog]
  )

  const pct = completeness?.percentComplete ?? 0
  const awardYear = completeness?.awardYear ?? application?.award_year ?? ""

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={ClipboardList}
        title="Application Concierge"
        description="We stage every non-tax field so you confirm instead of hunt — then guide you through the StudentAid.gov steps only you can take."
      />

      {catalogLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          {/* Completeness */}
          <GrantCard className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#374151]">
                FAFSA {awardYear || "—"} readiness
              </span>
              <GrantPill tone={completeness?.ready ? "green" : "blue"}>{pct}%</GrantPill>
            </div>
            <GrantMeter value={pct} tone={completeness?.ready ? "green" : "blue"} />
            <p className="mt-3 text-sm text-[#6b7280]">
              {completeness
                ? completeness.ready
                  ? "Every required non-tax field is staged — you're ready for the StudentAid.gov handoff."
                  : `${completeness.missingRequired.length} required field(s) still need an answer.`
                : "Loading your progress…"}
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-[rgba(45,212,191,0.1)] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
              <p className="text-xs leading-relaxed text-[#0f766e]">
                GRANT never stores your SSN or tax data. Tax figures transfer straight from the IRS
                when you consent; your SSN is entered on StudentAid.gov. We never submit for you.
              </p>
            </div>
          </GrantCard>

          {/* Collect sections */}
          <GrantSectionTitle>Your information</GrantSectionTitle>
          {collectSections.map((section) => (
            <CollectSection
              key={section.key}
              section={section}
              sections={answers}
              saving={updateSections.isPending}
              onSave={(patch) =>
                updateSections.mutate(patch, {
                  onError: () => undefined,
                })
              }
            />
          ))}

          {/* Prep packet */}
          <GrantSectionTitle className="mt-6">Prep packet</GrantSectionTitle>
          <GrantCard className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#6b7280]">
                Generate a completed packet of everything staged so far — ready to confirm on
                StudentAid.gov.
              </p>
              <button
                type="button"
                onClick={() =>
                  generatePacket.mutate(undefined, {
                    onSuccess: (p) => setPacket(p),
                    onError: () => undefined,
                  })
                }
                disabled={generatePacket.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B5BFF] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f49cc] disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {generatePacket.isPending ? "Generating…" : "Generate prep packet"}
              </button>
            </div>
          </GrantCard>
          {packet && <PacketSummary packet={packet} />}

          {/* Guided handoff */}
          <GrantSectionTitle className="mt-6">
            Guided StudentAid.gov handoff
          </GrantSectionTitle>
          <GrantCard>
            {handoff ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-[#6b7280]">
                    {handoff.counts.complete} of {handoff.counts.total} steps done
                  </span>
                  <GrantPill tone={handoff.complete ? "green" : "blue"}>
                    {handoff.counts.remaining} left
                  </GrantPill>
                </div>
                <ul className="space-y-2">
                  {handoff.steps.map((step) => {
                    const done = step.status === "complete"
                    return (
                      <li
                        key={step.id}
                        className="flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3"
                      >
                        <button
                          type="button"
                          aria-pressed={done}
                          aria-label={`Mark "${step.title}" ${done ? "not done" : "done"}`}
                          onClick={() =>
                            setStep.mutate({
                              stepId: step.id,
                              status: done ? "pending" : "complete",
                            })
                          }
                          className="mt-0.5 shrink-0"
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-[#2DD4BF]" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#cbd5e1]" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              done ? "text-[#9ca3af] line-through" : "text-[#1f2937]"
                            )}
                          >
                            {step.title}
                          </span>
                          <p className="mt-0.5 text-xs text-[#9ca3af]">{step.description}</p>
                          <a
                            href={step.deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#3B5BFF] hover:underline"
                          >
                            Open on StudentAid.gov
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-[#9ca3af]">Loading your handoff steps…</p>
            )}
          </GrantCard>
        </>
      )}
    </div>
  )
}
