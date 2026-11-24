/**
 * House style S4b — the setup forms and status lines of the one interview
 * build. Each is a verbatim copy of the one in LiveInterviewBody (star) or
 * StudioInterviewBody (custom); the old bodies are not edited, and render
 * whenever the interview switch is off.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UserRound } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import JobDnaCandidatePicker, { type JobDnaCandidateLink } from "@/components/interview/JobDnaCandidatePicker"
import type { useDeepLinkedCandidate } from "@/hooks/interview/useDeepLinkedCandidate"
import { ROUTES } from "@/constants/routes"
import type {
  LiveCandidate,
  LiveEmployerMeta,
  LiveTailoringMeta,
  ScorecardDraftReport,
} from "@/services/interview/live.service"
import { SLOT, slotParts, type TFn } from "@/components/interview/tFallback"
import { kindOptions, stepLabel, type PipelineStepOutcome, type RunKind } from "./runFormat"

// ── Kind picker (new) ─────────────────────────────────────────────

export function KindPicker({ value, onChange }: { value: RunKind; onChange: (k: RunKind) => void }) {
  const { t } = useTranslation("interviewPages")
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{t("house.kindPicker.legend", "What kind of interview?")}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {kindOptions(t).map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition",
              value === opt.value ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:bg-muted",
            )}
          >
            <div className="font-medium text-foreground">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.hint}</div>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

// ── Live (star) copies ─────────────────────────────────────────────

/** One honest line about the Job Studio scorecard draft after finalise (Live wording). */
export function ScorecardDraftLineStar({ linked, report }: { linked: boolean; report?: ScorecardDraftReport | null }) {
  const { t } = useTranslation("interviewPages")
  if (!linked) return null
  if (report?.written) {
    const [reviewBefore, reviewAfter] = slotParts(
      t("live.scorecard.review", { defaultValue: "{{slot}} before it counts.", slot: SLOT }),
    )
    return (
      <p className="text-sm text-emerald-700" data-testid="scorecard-draft-line">
        {typeof report.dimensions_scored === "number"
          ? t("live.scorecard.writtenDims", { defaultValue: "Scorecard draft written for the linked candidate ({{dimensions}} dimensions).", dimensions: report.dimensions_scored })
          : t("live.scorecard.written", "Scorecard draft written for the linked candidate.")}
        {reviewBefore}
        <Link to={ROUTES.JOB_DNA.SCORECARDS} className="underline underline-offset-2">
          {t("live.scorecard.reviewLink", "Review it under Role Blueprints → Scorecards")}
        </Link>
        {reviewAfter}
      </p>
    )
  }
  return (
    <p className="text-sm text-amber-700" role="alert" data-testid="scorecard-draft-line">
      {report?.reason
        ? t("live.scorecard.noDraftReason", { defaultValue: "No scorecard draft was written for the linked candidate ({{reason}}).", reason: report.reason })
        : t("live.scorecard.noDraft", "No scorecard draft was written for the linked candidate (the backend did not report one).")}
    </p>
  )
}

export function PipelineStepLines({ outcomes }: { outcomes: PipelineStepOutcome[] }) {
  const { t } = useTranslation("interviewPages")
  if (outcomes.length === 0) return null
  return (
    <ul className="space-y-0.5" data-testid="pipeline-step-lines">
      {outcomes.map((o) => (
        <li
          key={o.step}
          className={o.outcome === "failed" ? "text-sm text-amber-700" : "text-sm text-slate-600"}
          role={o.outcome === "failed" ? "alert" : undefined}
        >
          {o.outcome === "moved"
            ? t("live.step.moved", { defaultValue: "Pipeline step set to {{step}}.", step: stepLabel(o.step, t) })
            : o.outcome === "unchanged"
              ? t("live.step.unchanged", { defaultValue: "Pipeline step unchanged ({{detail}}) — {{step}} was not applied.", detail: o.detail ?? t("live.step.alreadyThere", "already there"), step: stepLabel(o.step, t) })
              : t("live.step.failed", { defaultValue: "Pipeline step not updated to {{step}}: {{detail}}.", step: stepLabel(o.step, t), detail: o.detail ?? t("live.step.unknownError", "unknown error") })}
        </li>
      ))}
    </ul>
  )
}

/** JS-10 — say what the URL asked for, in every state, before consent. */
export function DeepLinkNotice({ deepLink }: { deepLink: ReturnType<typeof useDeepLinkedCandidate> }) {
  const { t } = useTranslation("interviewPages")
  if (deepLink.state === "loading") {
    return <p className="text-sm text-slate-600" data-testid="deep-link-notice">{t("live.deepLink.loading", "Loading the candidate from Role Blueprints…")}</p>
  }
  if (deepLink.state === "ready" && deepLink.link) {
    const [before, after] = slotParts(
      deepLink.link.external_id
        ? t("live.deepLink.readyWithId", { defaultValue: "Interviewing {{slot}} ({{externalId}}) from Role Blueprints — the candidate will be linked once you confirm consent.", slot: SLOT, externalId: deepLink.link.external_id })
        : t("live.deepLink.ready", { defaultValue: "Interviewing {{slot}} from Role Blueprints — the candidate will be linked once you confirm consent.", slot: SLOT }),
    )
    return (
      <p className="text-sm text-indigo-900" data-testid="deep-link-notice">
        {before}
        <span className="font-medium">{deepLink.link.display_name}</span>
        {after}
      </p>
    )
  }
  if (deepLink.state === "missing") {
    return (
      <p className="text-sm text-amber-700" role="alert" data-testid="deep-link-notice">
        {t("live.deepLink.missing", "The candidate in this link is not in that Job DNA's pipeline. You can still pick one on the next step; otherwise this interview will not be linked.")}
      </p>
    )
  }
  if (deepLink.state === "error") {
    return (
      <p className="text-sm text-amber-700" role="alert" data-testid="deep-link-notice">
        {t("live.deepLink.error", "Could not load the candidate from Role Blueprints. You can still pick one on the next step; otherwise this interview will not be linked.")}
      </p>
    )
  }
  return null
}

const buildCandidateSchema = (t: TFn) =>
  z.object({
    displayName: z.string().min(1, t("live.candidate.nameRequired", "Candidate name is required")).max(255),
    externalId: z.string().max(255).optional(),
  })
type CandidateFormValues = z.infer<ReturnType<typeof buildCandidateSchema>>

export function CandidateIdentityForm({
  onConfirm,
  initialLink = null,
}: {
  onConfirm: (c: LiveCandidate) => void
  /** JS-10 — a link resolved from the URL, applied once as if picked. */
  initialLink?: JobDnaCandidateLink | null
}) {
  const { t } = useTranslation("interviewPages")
  const candidateSchema = useMemo(() => buildCandidateSchema(t), [t])
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  const [link, setLink] = useState<JobDnaCandidateLink | null>(null)
  const pick = (l: JobDnaCandidateLink) => {
    setLink(l)
    form.setValue("displayName", l.display_name, { shouldValidate: true })
    form.setValue("externalId", l.external_id ?? "")
  }
  const appliedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialLink || appliedRef.current === initialLink.candidate_id) return
    appliedRef.current = initialLink.candidate_id
    pick(initialLink)
    // pick() is stable for this component's lifetime; the effect keys on the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLink])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> {t("live.candidate.title", "Who are you interviewing?")}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {t("live.candidate.intro", "This is a real, scored interview — the candidate is not the signed-in user. Identify them before the questions start.")}
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) =>
            onConfirm({
              display_name: v.displayName.trim(),
              external_id: v.externalId?.trim() ? v.externalId.trim() : undefined,
              candidate_id: link?.candidate_id,
              blueprint_id: link?.blueprint_id,
            }),
          )}
          className="space-y-4"
        >
          <JobDnaCandidatePicker value={link} onPick={pick} onClear={() => setLink(null)} />
          <div>
            <Label htmlFor="candidate-name">{t("live.candidate.nameLabel", "Candidate name")}</Label>
            <Input id="candidate-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="candidate-external-id">{t("live.candidate.externalIdLabel", "External / candidate ID (optional)")}</Label>
            <Input id="candidate-external-id" {...form.register("externalId")} placeholder={t("live.candidate.externalIdPlaceholder", "ATS ID, req #, etc.")} />
          </div>
          <Button type="submit">{t("live.candidate.continue", "Continue")}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Studio (custom) copies ─────────────────────────────────────────

/** One honest line about the Job Studio scorecard draft after finalise (Studio wording). */
export function ScorecardDraftLineCustom({ linked, report }: { linked: boolean; report?: ScorecardDraftReport | null }) {
  const { t } = useTranslation("interviewPages")
  if (!linked) return null
  if (report?.written) {
    return (
      <p className="text-sm text-emerald-700" data-testid="scorecard-draft-line">
        {typeof report.dimensions_scored === "number"
          ? t("live.scorecard.writtenDims", { defaultValue: "Scorecard draft written for the linked candidate ({{dimensions}} dimensions).", dimensions: report.dimensions_scored })
          : t("live.scorecard.written", "Scorecard draft written for the linked candidate.")}{" "}
        {t("studio.scorecard.review", "Review it under Job DNA → Scorecards before it counts.")}
      </p>
    )
  }
  return (
    <p className="text-sm text-amber-700" role="alert" data-testid="scorecard-draft-line">
      {report?.reason
        ? t("live.scorecard.noDraftReason", { defaultValue: "No scorecard draft was written for the linked candidate ({{reason}}).", reason: report.reason })
        : t("live.scorecard.noDraft", "No scorecard draft was written for the linked candidate (the backend did not report one).")}
    </p>
  )
}

const buildParticipantSchema = (t: TFn) =>
  z.object({
    displayName: z.string().min(1, t("studio.participant.nameRequired", "A name is required")).max(255),
    externalId: z.string().max(255).optional(),
  })
type ParticipantFormValues = z.infer<ReturnType<typeof buildParticipantSchema>>

export function ParticipantForm({ onConfirm }: { onConfirm: (c: LiveCandidate) => void }) {
  const { t } = useTranslation("interviewPages")
  const participantSchema = useMemo(() => buildParticipantSchema(t), [t])
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: { displayName: "", externalId: "" },
  })
  const [link, setLink] = useState<JobDnaCandidateLink | null>(null)
  const pick = (l: JobDnaCandidateLink) => {
    setLink(l)
    form.setValue("displayName", l.display_name, { shouldValidate: true })
    form.setValue("externalId", l.external_id ?? "")
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-indigo-600" /> {t("studio.participant.title", "Who is this interview with?")}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {t("studio.participant.intro", "The interviewee is not the signed-in user — identify them before the questions start.")}
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) =>
            onConfirm({
              display_name: v.displayName.trim(),
              external_id: v.externalId?.trim() ? v.externalId.trim() : undefined,
              candidate_id: link?.candidate_id,
              blueprint_id: link?.blueprint_id,
            }),
          )}
          className="space-y-4"
        >
          <JobDnaCandidatePicker value={link} onPick={pick} onClear={() => setLink(null)} />
          <div>
            <Label htmlFor="participant-name">{t("studio.participant.nameLabel", "Name")}</Label>
            <Input id="participant-name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="participant-external-id">{t("studio.participant.refLabel", "Reference ID (optional)")}</Label>
            <Input id="participant-external-id" {...form.register("externalId")} placeholder={t("studio.participant.refPlaceholder", "Student ID, ATS ID, etc.")} />
          </div>
          <Button type="submit">{t("live.candidate.continue", "Continue")}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Provenance + tailoring notice (Studio). Two things a run should never hide:
 * which curated framework the questions came from, and the fact that a
 * requested role rewrite did not happen.
 */
export function ProvenanceNotice({
  employer,
  tailoring,
}: {
  employer: LiveEmployerMeta | null
  tailoring: LiveTailoringMeta | null
}) {
  const { t } = useTranslation("interviewPages")
  const [tailoringBefore, tailoringAfter] = slotParts(
    t("studio.tailoringNotice", { defaultValue: "These questions were {{slot}} rewritten for the role — the tailoring step was unavailable, so the standard wording is being used. The interview and its scoring are unaffected.", slot: SLOT }),
  )
  const rewriteMissed =
    tailoring?.requested && !tailoring.applied &&
    (tailoring.reason === "tailoring_unavailable" || tailoring.reason === "tailoring_error")
  if (!employer && !rewriteMissed) return null
  return (
    <div className="space-y-2">
      {employer ? (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
          data-testid="studio-employer-provenance"
        >
          <span className="font-semibold text-slate-800">
            {employer.framework
              ? t("studio.framedOnFramework", { defaultValue: "Framed on {{name}} — {{framework}}", name: employer.name, framework: employer.framework })
              : t("studio.framedOn", { defaultValue: "Framed on {{name}}", name: employer.name })}
          </span>
          <p className="mt-1 leading-snug">{employer.provenance}</p>
        </div>
      ) : null}
      {rewriteMissed ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          role="status"
          data-testid="studio-tailoring-notice"
        >
          {tailoringBefore}
          <span className="font-semibold">{t("studio.tailoringNot", "not")}</span>
          {tailoringAfter}
        </div>
      ) : null}
    </div>
  )
}
