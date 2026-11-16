import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessagesSquare,
  PencilLine,
  Scale,
  ShieldAlert,
  Trophy,
  UserPlus2,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { KCE_SELF_IDENTITY, isKceAccessDenied } from "@/services/knowledge-continuity/authz"
import { KceAccessInline, KceAccessNotice } from "./KceAccessNotice"
import { useReviewQueue } from "@/hooks/knowledge-continuity/useReviewQueue"
import { useSubmitValidation } from "@/hooks/knowledge-continuity/useSubmitValidation"
import { useRegisterAtRiskRole } from "@/hooks/knowledge-continuity/useRegisterAtRiskRole"
import { useStartCaptureSession } from "@/hooks/knowledge-continuity/useStartCaptureSession"
import { useResolveContradiction } from "@/hooks/knowledge-continuity/useResolveContradiction"
import { useUnitTurns } from "@/hooks/knowledge-continuity/useUnitTurns"
import type {
  ContradictionRelation,
  ContradictionUnitSide,
  KnowledgeUnit,
  ValidationVerdict,
} from "@/types/knowledge-continuity"

const CRITICALITY_BADGE_CLASS = "bg-red-100 text-red-700 border-red-200"
const CATEGORY_BADGE_CLASS = "bg-slate-100 text-slate-700 border-slate-200"

// ── Review Queue tab ─────────────────────────────────────────────────────────

type NoteDialogState = { unit: KnowledgeUnit; verdict: Extract<ValidationVerdict, "amend" | "reject"> }

function UnitCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-40" />
      </CardContent>
    </Card>
  )
}

function UnitProvenance({ unitId, open }: { unitId: string; open: boolean }) {
  const { t } = useTranslation("kcPages")
  // Lazy: only fetch the interview turns once the reviewer opens the panel.
  const { data, isLoading, isError, error } = useUnitTurns(unitId, open)
  if (!open) return null
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("review.provenance.loading", "Loading the interview…")}
        </div>
      )}
      {isError && isKceAccessDenied(error) && <KceAccessInline />}
      {isError && !isKceAccessDenied(error) && (
        <p className="text-xs text-muted-foreground">
          {t("review.provenance.loadError", "Couldn't load the interview for this unit.")}
        </p>
      )}
      {data && data.turns.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            "review.provenance.none",
            "No recorded interview for this unit (it may pre-date turn capture)."
          )}
        </p>
      )}
      {data && data.turns.length > 0 && (
        <ul className="space-y-3">
          {data.turns.map((turn) => (
            <li key={turn.id} className="space-y-1">
              <div className="flex gap-2">
                <MessagesSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#127A8A]" />
                <p className="text-xs font-medium text-foreground">{turn.question}</p>
              </div>
              <p className="rounded bg-white px-2 py-1 text-xs text-foreground">{turn.response}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function UnitCard({
  unit,
  expanded,
  onToggleExpanded,
  onApprove,
  onOpenNoteDialog,
  isSubmitting,
}: {
  unit: KnowledgeUnit
  expanded: boolean
  onToggleExpanded: () => void
  onApprove: () => void
  onOpenNoteDialog: (verdict: "amend" | "reject") => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation("kcPages")
  const [showProvenance, setShowProvenance] = useState(false)
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{unit.title}</CardTitle>
          <Badge variant="outline" className={CATEGORY_BADGE_CLASS}>
            {unit.category}
          </Badge>
          {unit.criticality === "high" && (
            <Badge variant="outline" className={CRITICALITY_BADGE_CLASS}>
              {t("review.unit.highCriticality", "High criticality")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t("review.unit.kvi", { defaultValue: "KVI {{value}}", value: unit.kvi.toFixed(2) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className={expanded ? "text-sm text-foreground" : "line-clamp-3 text-sm text-foreground"}>
          {unit.body}
        </p>
        {unit.body.length > 160 && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="text-xs font-medium text-[#127A8A] hover:underline"
          >
            {expanded ? t("review.unit.showLess", "Show less") : t("review.unit.showMore", "Show more")}
          </button>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onApprove} disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t("review.unit.approve", "Approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenNoteDialog("amend")}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <PencilLine className="h-4 w-4" />
            {t("review.unit.amend", "Amend")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenNoteDialog("reject")}
            disabled={isSubmitting}
            className="gap-1.5 text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
            {t("review.unit.reject", "Reject")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowProvenance((v) => !v)}
            className="gap-1.5 text-muted-foreground"
          >
            <MessagesSquare className="h-4 w-4" />
            {showProvenance
              ? t("review.unit.hideInterview", "Hide the interview")
              : t("review.unit.replayInterview", "Replay the interview")}
          </Button>
        </div>
        <UnitProvenance unitId={unit.id} open={showProvenance} />
      </CardContent>
    </Card>
  )
}

function ContradictionSide({
  side,
  onKeep,
  busy,
}: {
  side?: ContradictionUnitSide | null
  onKeep: () => void
  busy: boolean
}) {
  const { t } = useTranslation("kcPages")
  if (!side) {
    return (
      <div className="flex-1 rounded-md border bg-white p-3 text-xs text-muted-foreground">
        {t("review.contradiction.unitGone", "This unit is no longer available.")}
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-2 rounded-md border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={CATEGORY_BADGE_CLASS}>
          {side.category}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("review.contradiction.bandKvi", { defaultValue: "{{band}} · KVI {{value}}", band: side.validity_band, value: side.kvi.toFixed(2) })}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{side.title}</p>
      <p className="text-xs text-foreground">{side.body}</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={onKeep} className="gap-1.5">
        <Trophy className="h-3.5 w-3.5" /> {t("review.contradiction.keepThis", "Keep this, retire the other")}
      </Button>
    </div>
  )
}

function ContradictionCard({ c }: { c: ContradictionRelation }) {
  const { t } = useTranslation("kcPages")
  const resolve = useResolveContradiction()
  const busy = resolve.isPending
  const supersede = (winnerUnitId: string) =>
    resolve.mutate({ relationId: c.id, body: { action: "supersede", winner_unit_id: winnerUnitId } })

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <ContradictionSide side={c.from_unit} onKeep={() => supersede(c.from_unit_id)} busy={busy} />
        <div className="flex items-center justify-center text-amber-600">
          <Scale className="h-5 w-5" />
        </div>
        <ContradictionSide side={c.to_unit} onKeep={() => supersede(c.to_unit_id)} busy={busy} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => resolve.mutate({ relationId: c.id, body: { action: "keep_both" } })}
        >
          {t("review.contradiction.bothTrue", "Both are true")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => resolve.mutate({ relationId: c.id, body: { action: "dismiss" } })}
          className="text-muted-foreground"
        >
          {t("review.contradiction.notContradiction", "Not a contradiction")}
        </Button>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  )
}

function ReviewQueueTab() {
  const { t } = useTranslation("kcPages")
  const { data: queue, isLoading, isError, error } = useReviewQueue()
  const submitValidation = useSubmitValidation()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null)
  const [notes, setNotes] = useState("")

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function approve(unit: KnowledgeUnit) {
    submitValidation.mutate({
      unitId: unit.id,
      body: { validator_user_id: KCE_SELF_IDENTITY, method: "sme_review", verdict: "confirm" },
    })
  }

  function closeNoteDialog() {
    setNoteDialog(null)
    setNotes("")
  }

  function confirmNoteDialog() {
    if (!noteDialog) return
    submitValidation.mutate({
      unitId: noteDialog.unit.id,
      body: {
        validator_user_id: KCE_SELF_IDENTITY,
        method: "sme_review",
        verdict: noteDialog.verdict,
        notes: notes.trim(),
      },
    })
    closeNoteDialog()
  }

  const units = queue?.needs_review_units ?? []
  const contradictions = queue?.unresolved_contradictions ?? []

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="space-y-4">
          <UnitCardSkeleton />
          <UnitCardSkeleton />
        </div>
      )}

      {!isLoading && isError && isKceAccessDenied(error) && <KceAccessNotice />}

      {!isLoading && isError && !isKceAccessDenied(error) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("review.queue.loadError", "We couldn't load the review queue right now. Try again shortly.")}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && units.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("review.queue.empty", "All caught up — no units awaiting review.")}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && units.length > 0 && (
        <div className="space-y-4">
          {units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              expanded={expandedIds.has(unit.id)}
              onToggleExpanded={() => toggleExpanded(unit.id)}
              onApprove={() => approve(unit)}
              onOpenNoteDialog={(verdict) => {
                setNotes("")
                setNoteDialog({ unit, verdict })
              }}
              isSubmitting={submitValidation.isPending}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("review.queue.contradictionsTitle", "Contradictions")}
          </CardTitle>
          <CardDescription>
            {t(
              "review.queue.contradictionsDescription",
              "Two captured units disagree. Keep the one that's right (the other is retired), mark that both are true, or dismiss it if it isn't really a contradiction."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contradictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("review.queue.noContradictions", "No unresolved contradictions.")}
            </p>
          ) : (
            <div className="space-y-3">
              {contradictions.map((c) => (
                <ContradictionCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={noteDialog !== null} onOpenChange={(open) => !open && closeNoteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("review.queue.noteTitle", { defaultValue: "{{verdict}} — {{title}}", verdict:
                  noteDialog?.verdict === "amend"
                    ? t("review.unit.amend", "Amend")
                    : t("review.unit.reject", "Reject"), title: noteDialog?.unit.title })}
            </DialogTitle>
            <DialogDescription>
              {t(
                "review.queue.noteDescription",
                "Add a note explaining what needs to change before it can be validated."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="review-notes">{t("review.queue.notes", "Notes")}</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("review.queue.notesPlaceholder", "What needs to change?")}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeNoteDialog}>
              {t("review.queue.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={notes.trim().length === 0 || submitValidation.isPending}
              onClick={confirmNoteDialog}
              className="gap-1.5"
            >
              {submitValidation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("review.queue.submit", "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Capture intake tab ───────────────────────────────────────────────────────

/**
 * The organisation is not the person's to choose. Intake used to take it as
 * free text, so rows landed under whatever string was typed. Every other KCE
 * surface already writes to this key, and the server decides the real
 * organisation from who is signed in.
 */
const INTAKE_ORG_ID = "kce-capture"

function makeRiskSchema(t: TFunction) {
  const range = t("review.intake.rangeError", "Enter a value between 0 and 1")
  const expertRequired = t("review.intake.expertRequired", "Expert user id is required")
  const roleRequired = t("review.intake.roleRequired", "Role title is required")
  return z.object({
    expert_user_id: z.string().min(1, expertRequired),
    role_title: z.string().min(1, roleRequired),
    exit_risk: z.number().min(0, range).max(1, range),
    role_criticality: z.number().min(0, range).max(1, range),
    doc_gap: z.number().min(0, range).max(1, range),
    bus_factor: z.number().min(0, range).max(1, range),
    // Kept as raw text — parsed to a number (or omitted) at submit time — to
    // avoid the optional-vs-required generic mismatch z.preprocess() causes
    // with react-hook-form's resolver typing.
    retirement_horizon_months: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), {
        message: t("review.intake.horizonError", "Must be a whole number of months, 0 or more"),
      }),
  })
}

type RiskFormValues = z.infer<ReturnType<typeof makeRiskSchema>>

const RISK_FACTOR_FIELDS: { name: keyof Pick<RiskFormValues, "exit_risk" | "role_criticality" | "doc_gap" | "bus_factor"> }[] = [
  { name: "exit_risk" },
  { name: "role_criticality" },
  { name: "doc_gap" },
  { name: "bus_factor" },
]

function riskFactorLabel(t: TFunction, name: (typeof RISK_FACTOR_FIELDS)[number]["name"]): string {
  switch (name) {
    case "exit_risk":
      return t("review.intake.factor.exit_risk", "Exit risk")
    case "role_criticality":
      return t("review.intake.factor.role_criticality", "Role criticality")
    case "doc_gap":
      return t("review.intake.factor.doc_gap", "Documentation gap")
    case "bus_factor":
      return t("review.intake.factor.bus_factor", "Bus factor")
  }
}

function RegisterRiskForm() {
  const { t } = useTranslation("kcPages")
  const registerRisk = useRegisterAtRiskRole()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RiskFormValues>({
    resolver: zodResolver(makeRiskSchema(t)),
    defaultValues: {
      expert_user_id: "",
      role_title: "",
      exit_risk: 0.5,
      role_criticality: 0.5,
      doc_gap: 0.5,
      bus_factor: 0.5,
      retirement_horizon_months: "",
    },
  })

  function onSubmit(values: RiskFormValues) {
    registerRisk.mutate(
      {
        org_id: INTAKE_ORG_ID,
        expert_user_id: values.expert_user_id.trim(),
        role_title: values.role_title.trim(),
        exit_risk: values.exit_risk,
        role_criticality: values.role_criticality,
        doc_gap: values.doc_gap,
        bus_factor: values.bus_factor,
        retirement_horizon_months: values.retirement_horizon_months?.trim()
          ? Number(values.retirement_horizon_months)
          : undefined,
      },
      { onSuccess: () => reset() }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          {t("review.intake.riskTitle", "Register an at-risk role")}
        </CardTitle>
        <CardDescription>
          {t("review.intake.riskDescription", "Flag a role or expert whose knowledge should be prioritized for capture.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="risk-expert-id">{t("review.intake.expertId", "Expert user id")}</Label>
              <Input id="risk-expert-id" {...register("expert_user_id")} />
              {errors.expert_user_id && (
                <p className="text-xs text-red-600">{errors.expert_user_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk-role-title">{t("review.intake.roleTitle", "Role title")}</Label>
              <Input id="risk-role-title" {...register("role_title")} />
              {errors.role_title && <p className="text-xs text-red-600">{errors.role_title.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {RISK_FACTOR_FIELDS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={`risk-${field.name}`}>
                  {t("review.intake.factorRange", { defaultValue: "{{label}} (0–1)", label: riskFactorLabel(t, field.name) })}
                </Label>
                <Input
                  id={`risk-${field.name}`}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {errors[field.name] && (
                  <p className="text-xs text-red-600">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5 sm:w-1/3">
            <Label htmlFor="risk-horizon">
              {t("review.intake.horizon", "Retirement horizon (months, optional)")}
            </Label>
            <Input id="risk-horizon" type="number" min={0} step={1} {...register("retirement_horizon_months")} />
            {errors.retirement_horizon_months && (
              <p className="text-xs text-red-600">{errors.retirement_horizon_months.message}</p>
            )}
          </div>

          <Button type="submit" disabled={registerRisk.isPending} className="gap-1.5">
            {registerRisk.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("review.intake.registerRole", "Register role")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function makeSessionSchema(t: TFunction) {
  return z
    .object({
      expert_user_id: z.string().min(1, t("review.intake.expertRequired", "Expert user id is required")),
      role_title: z.string().min(1, t("review.intake.roleRequired", "Role title is required")),
      is_synthetic: z.boolean(),
      consent_event_id: z.string().optional(),
    })
    .refine((values) => values.is_synthetic || (values.consent_event_id?.trim().length ?? 0) > 0, {
      message: t("review.intake.consentRequired", "Consent id is required for a real (non-practice) session"),
      path: ["consent_event_id"],
    })
}

type SessionFormValues = z.infer<ReturnType<typeof makeSessionSchema>>

function StartCaptureSessionForm() {
  const { t } = useTranslation("kcPages")
  const startSession = useStartCaptureSession()
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(makeSessionSchema(t)),
    defaultValues: {
      expert_user_id: "",
      role_title: "",
      is_synthetic: true,
      consent_event_id: "",
    },
  })

  const isSynthetic = watch("is_synthetic")

  function onSubmit(values: SessionFormValues) {
    startSession.mutate(
      {
        org_id: INTAKE_ORG_ID,
        expert_user_id: values.expert_user_id.trim(),
        role_title: values.role_title.trim(),
        is_synthetic: values.is_synthetic,
        consent_event_id: values.is_synthetic
          ? undefined
          : values.consent_event_id?.trim() || undefined,
      },
      { onSuccess: () => reset() }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus2 className="h-4 w-4 text-[#127A8A]" />
          {t("review.intake.sessionTitle", "Start a capture session")}
        </CardTitle>
        <CardDescription>
          {t("review.intake.sessionDescription", "Practice sessions need no consent record. A real expert session does.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="session-expert-id">{t("review.intake.expertId", "Expert user id")}</Label>
              <Input id="session-expert-id" {...register("expert_user_id")} />
              {errors.expert_user_id && (
                <p className="text-xs text-red-600">{errors.expert_user_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-role-title">{t("review.intake.roleTitle", "Role title")}</Label>
              <Input id="session-role-title" {...register("role_title")} />
              {errors.role_title && (
                <p className="text-xs text-red-600">{errors.role_title.message}</p>
              )}
            </div>
          </div>

          <Controller
            control={control}
            name="is_synthetic"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="session-is-synthetic">{t("review.intake.practice", "Practice session")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "review.intake.practiceHint",
                      "On — synthetic practice, no consent record needed. Off — a real expert session."
                    )}
                  </p>
                </div>
                <Switch
                  id="session-is-synthetic"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          {!isSynthetic && (
            <div className="space-y-1.5 sm:w-1/2">
              <Label htmlFor="session-consent-id">{t("review.intake.consentId", "Consent record id")}</Label>
              <Input id="session-consent-id" {...register("consent_event_id")} />
              {errors.consent_event_id && (
                <p className="text-xs text-red-600">{errors.consent_event_id.message}</p>
              )}
            </div>
          )}

          <Button type="submit" disabled={startSession.isPending} className="gap-1.5">
            {startSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("review.intake.startSession", "Start session")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CaptureIntakeTab() {
  return (
    <div className="space-y-6">
      <RegisterRiskForm />
      <StartCaptureSessionForm />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Knowledge Continuity vertical — Practitioner Reviewer Console. Renders
 * inside the shared AppShell via KceLayout, which already gates the vertical
 * on entitlement, so no extra access check is needed here. Two tabs: a
 * review queue for validating captured knowledge units, and capture intake
 * for flagging at-risk roles and starting new capture sessions. Deliberately
 * plain language — no raw PRISM dimension names surfaced here.
 */
export default function KceReviewConsolePage() {
  const { t } = useTranslation("kcPages")
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ClipboardCheck className="h-5 w-5 text-[#127A8A]" />
          {t("review.title", "Reviewer Console")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("review.subtitle", "Validate captured knowledge and flag at-risk roles for capture.")}
        </p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">{t("review.tabQueue", "Review Queue")}</TabsTrigger>
          <TabsTrigger value="intake">{t("review.tabIntake", "Capture intake")}</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <ReviewQueueTab />
        </TabsContent>
        <TabsContent value="intake" className="mt-4">
          <CaptureIntakeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
