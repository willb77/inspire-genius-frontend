import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  AlertTriangle,
  ArrowLeft,
  BookText,
  CheckCircle2,
  ChevronsUpDown,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  Sparkles,
  ThumbsDown,
  Unlink,
  User,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { isKceAccessDenied } from "@/services/knowledge-continuity/authz"
import { KceAccessInline, KceAccessNotice } from "./KceAccessNotice"
import { useCurricula } from "@/hooks/knowledge-continuity/useCurricula"
import { useCurriculum } from "@/hooks/knowledge-continuity/useCurriculum"
import { useRecordUsage } from "@/hooks/knowledge-continuity/useRecordUsage"
import { useSavedRoles } from "@/hooks/knowledge-continuity/useSavedRoles"
import { useCitableUnits } from "@/hooks/knowledge-continuity/useCitableUnits"
import { useBuildCurriculum } from "@/hooks/knowledge-continuity/useBuildCurriculum"
import { usePublishCurriculum } from "@/hooks/knowledge-continuity/usePublishCurriculum"
import type {
  CurriculumItem,
  CurriculumSummary,
  CurriculumUnit,
} from "@/types/knowledge-continuity"

const ACCENT = "#127A8A"

// Capture/curricula are grouped under a stable org key (the AuthUser carries no
// organization) — matches the capture front door and the reviewer intake form.
const CURRICULUM_ORG_ID = "kce-capture"

// ── Validity-band presentation (plain labels, no scoring jargon) ─────────────
const VALIDITY_BADGE_CLASS: Record<string, string> = {
  validated: "bg-emerald-100 text-emerald-700 border-emerald-200",
  provisional: "bg-amber-100 text-amber-700 border-amber-200",
  needs_review: "bg-amber-100 text-amber-700 border-amber-200",
  deprecated: "bg-slate-100 text-slate-500 border-slate-200",
  amend_requested: "bg-orange-100 text-orange-700 border-orange-200",
}
const bandClass = (band: string) =>
  VALIDITY_BADGE_CLASS[band] ?? "bg-slate-100 text-slate-600 border-slate-200"
function bandLabel(t: TFunction, band: string): string {
  switch (band) {
    case "validated":
      return t("curriculum.band.validated", "Validated")
    case "provisional":
      return t("curriculum.band.provisional", "Provisional")
    case "needs_review":
      return t("curriculum.band.needs_review", "In review")
    case "deprecated":
      return t("curriculum.band.deprecated", "Retired")
    case "amend_requested":
      return t("curriculum.band.amend_requested", "Amendment requested")
    default:
      return band
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// Publisher ids are not names. Older curricula carry the browser's placeholder
// ("me", which read as "published by the viewer"), and the server stamps the
// signed-in account's id, which no one can read. Neither belongs on screen
// until there is a name to show.
const UNREADABLE_PUBLISHER = /^(me|self|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

function publisherLabel(t: TFunction, publishedBy: string | null | undefined): string {
  const who = publishedBy?.trim()
  if (!who || UNREADABLE_PUBLISHER.test(who)) return t("curriculum.published", "Published")
  return t("curriculum.publishedBy", { defaultValue: "Published by {{name}}", name: who })
}

// ── Curriculum picker ─────────────────────────────────────────────────────────

function PickerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-36" />
      </CardContent>
    </Card>
  )
}

function CurriculumPicker({
  onSelect,
}: {
  onSelect: (templateId: string) => void
}) {
  const { t } = useTranslation("kcPages")
  const { data: curricula, isLoading, isError, error } = useCurricula()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <PickerCardSkeleton />
        <PickerCardSkeleton />
      </div>
    )
  }

  if (isError && isKceAccessDenied(error)) return <KceAccessNotice />

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("curriculum.picker.loadError", "We couldn't load the curricula right now. Try again shortly.")}
        </CardContent>
      </Card>
    )
  }

  const list = curricula ?? []
  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("curriculum.picker.empty", "No curricula have been published yet.")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {list.map((c: CurriculumSummary) => (
        <Card key={c.template_id} className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{c.name}</CardTitle>
              {c.wiring_style && (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                  {c.wiring_style}
                </Badge>
              )}
            </div>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {t("curriculum.picker.moduleCount", {
                  count: c.module_count,
                  defaultValue_one: "{{count}} module",
                  defaultValue_other: "{{count}} modules",
    defaultValue: "{{count}} modules",
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <BookText className="h-3.5 w-3.5" />
                {t("curriculum.picker.sourceCount", {
                  count: c.cited_unit_count,
                  defaultValue_one: "{{count}} source",
                  defaultValue_other: "{{count}} sources",
    defaultValue: "{{count}} sources",
                })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <p className="text-xs text-muted-foreground">
              {publisherLabel(t, c.published_by)} · {formatDate(c.created_at)}
            </p>
            <Button
              size="sm"
              onClick={() => onSelect(c.template_id)}
              className="gap-1.5"
              style={{ backgroundColor: ACCENT }}
            >
              <GraduationCap className="h-4 w-4" />
              {t("curriculum.picker.open", "Open curriculum")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Provenance ────────────────────────────────────────────────────────────────

function UnresolvedCitationChip({ unitId }: { unitId: string }) {
  const { t } = useTranslation("kcPages")
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Unlink className="h-3.5 w-3.5 shrink-0" />
      <span>{t("curriculum.sourceGone", { defaultValue: "Source no longer available ({{id}})", id: unitId })}</span>
    </div>
  )
}

function UnitProvenanceCard({
  unit,
  onSignal,
  onClarify,
  isSubmitting,
}: {
  unit: CurriculumUnit
  onSignal: (unit: CurriculumUnit, signalType: "still_true" | "no_longer_true") => void
  onClarify: (unit: CurriculumUnit) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation("kcPages")
  return (
    <div className="rounded-md border bg-card px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{unit.title}</span>
        <Badge variant="outline" className={bandClass(unit.validity_band)}>
          {bandLabel(t, unit.validity_band)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("curriculum.confidence", { defaultValue: "Confidence {{value}}", value: unit.kvi.toFixed(2) })}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{unit.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => onSignal(unit, "still_true")}
          className="gap-1.5 text-emerald-700 hover:text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t("curriculum.stillAccurate", "Still accurate")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => onSignal(unit, "no_longer_true")}
          className="gap-1.5 text-red-600 hover:text-red-700"
        >
          <ThumbsDown className="h-4 w-4" />
          {t("curriculum.noLongerTrue", "No longer true")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => onClarify(unit)}
          className="gap-1.5"
        >
          <HelpCircle className="h-4 w-4" />
          {t("curriculum.needsClarification", "Needs clarification")}
        </Button>
      </div>
    </div>
  )
}

function ItemProvenance({
  item,
  unitsById,
  onSignal,
  onClarify,
  isSubmitting,
}: {
  item: CurriculumItem
  unitsById: Record<string, CurriculumUnit>
  onSignal: (unit: CurriculumUnit, signalType: "still_true" | "no_longer_true") => void
  onClarify: (unit: CurriculumUnit) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation("kcPages")
  const [open, setOpen] = useState(false)
  const citedCount = item.cited_unit_ids.length

  return (
    <div className="rounded-md border-l-2 border-l-slate-200 pl-4">
      <p className="text-sm text-foreground">{item.text}</p>
      {citedCount > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#127A8A] hover:underline"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {open
                ? t("curriculum.hideSources", "Hide sources")
                : t("curriculum.showSources", { defaultValue: "Where this comes from ({{count}})", count: citedCount })}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {item.cited_unit_ids.map((id) => {
              const unit = unitsById[id]
              return unit ? (
                <UnitProvenanceCard
                  key={id}
                  unit={unit}
                  onSignal={onSignal}
                  onClarify={onClarify}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <UnresolvedCitationChip key={id} unitId={id} />
              )
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

// ── Walk-through ──────────────────────────────────────────────────────────────

type ClarifyState = { unit: CurriculumUnit }

function CurriculumWalkthrough({
  templateId,
  onBack,
}: {
  templateId: string
  onBack: () => void
}) {
  const { t } = useTranslation("kcPages")
  const { data: curriculum, isLoading, isError, error } = useCurriculum(templateId)
  const recordUsage = useRecordUsage()

  const [clarify, setClarify] = useState<ClarifyState | null>(null)
  const [notes, setNotes] = useState("")


  function sendSignal(unit: CurriculumUnit, signalType: "still_true" | "no_longer_true") {
    recordUsage.mutate({
      unitId: unit.id,
      templateId,
      body: {
        signal_type: signalType,
        value: signalType === "still_true" ? 1.0 : 0.0,
      },
    })
  }

  function closeClarify() {
    setClarify(null)
    setNotes("")
  }

  function submitClarify() {
    if (!clarify) return
    recordUsage.mutate({
      unitId: clarify.unit.id,
      templateId,
      body: {
        signal_type: "clarity_flag",
        value: 0.0,
        notes: notes.trim() || undefined,
      },
    })
    closeClarify()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 pl-0 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("curriculum.allCurricula", "All curricula")}
      </Button>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && isError && isKceAccessDenied(error) && <KceAccessNotice />}

      {!isLoading && ((isError && !isKceAccessDenied(error)) || (!isError && !curriculum)) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t(
              "curriculum.openError",
              "We couldn't open this curriculum. It may have been unpublished — go back and pick another."
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && curriculum && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{curriculum.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {curriculum.wiring_style && (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                  {curriculum.wiring_style}
                </Badge>
              )}
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {publisherLabel(t, curriculum.published_by)}
              </span>
              <span>· {formatDate(curriculum.created_at)}</span>
            </div>
          </div>

          {curriculum.modules.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t("curriculum.noModules", "This curriculum has no modules yet.")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {curriculum.modules.map((module, mIdx) => (
                <Card key={`${module.title}-${mIdx}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="h-4 w-4 text-[#127A8A]" />
                      {module.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {module.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("curriculum.noItems", "No items in this module.")}
                      </p>
                    ) : (
                      module.items.map((item, iIdx) => (
                        <ItemProvenance
                          key={`${mIdx}-${iIdx}`}
                          item={item}
                          unitsById={curriculum.units_by_id}
                          onSignal={sendSignal}
                          onClarify={(unit) => {
                            setNotes("")
                            setClarify({ unit })
                          }}
                          isSubmitting={recordUsage.isPending}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={clarify !== null} onOpenChange={(o) => !o && closeClarify()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {clarify
                ? t("curriculum.clarifyTitleWithUnit", { defaultValue: "Needs clarification — {{title}}", title: clarify.unit.title })
                : t("curriculum.needsClarification", "Needs clarification")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "curriculum.clarifyDescription",
                "Tell us what's unclear or out of date. Your note goes to the reviewer for this knowledge."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="clarify-notes">{t("curriculum.yourNote", "Your note")}</Label>
            <Textarea
              id="clarify-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("curriculum.notePlaceholder", "What needs clarifying?")}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeClarify}>
              {t("curriculum.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={notes.trim().length === 0 || recordUsage.isPending}
              onClick={submitClarify}
              className="gap-1.5"
            >
              {recordUsage.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("curriculum.send", "Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Build a curriculum (authoring) ───────────────────────────────────────────

function BuildCurriculumPanel({ onPublished }: { onPublished: (templateId: string) => void }) {
  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesFailed,
    error: rolesError,
    refetch: refetchRoles,
    isFetching: rolesFetching,
  } = useSavedRoles(CURRICULUM_ORG_ID)
  const citable = useCitableUnits()
  const build = useBuildCurriculum()
  const publish = usePublishCurriculum()
  const [roleTitle, setRoleTitle] = useState("")
  const { t } = useTranslation("kcPages")

  const busy = citable.isPending || build.isPending || publish.isPending
  const selected = roles.find((r) => r.role_title === roleTitle)

  async function buildAndPublish() {
    if (!selected) return
    try {
      const source = await citable.mutateAsync(selected.taxonomy_id)
      if (source.units.length === 0) {
        toast.error(
          t(
            "curriculum.build.noValidated",
            "This role has no validated knowledge yet. Validate some captured units in the Reviewer Console first."
          )
        )
        return
      }
      const built = await build.mutateAsync({
        taxonomy_id: selected.taxonomy_id,
        units: source.units.map((u) => ({
          id: u.id,
          category: u.category,
          title: u.title,
          body: u.body,
          taxonomy_node_id: u.taxonomy_node_id,
        })),
      })
      if (built.modules.length === 0) {
        toast.error(
          t(
            "curriculum.build.assembleFailed",
            "Couldn't assemble a curriculum from this role's validated knowledge."
          )
        )
        return
      }
      const res = await publish.mutateAsync({
        taxonomy_id: selected.taxonomy_id,
        wiring_style: built.wiring_style ?? "balanced",
        modules: built.modules,
      })
      onPublished(res.template_id)
    } catch {
      // errors already surfaced by the mutation hooks
    }
  }

  const buttonLabel = publish.isPending
    ? t("curriculum.build.publishing", "Publishing…")
    : build.isPending
      ? t("curriculum.build.assembling", "Assembling…")
      : citable.isPending
        ? t("curriculum.build.gathering", "Gathering knowledge…")
        : t("curriculum.build.button", "Build & publish")

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[#127A8A]" />
          {t("curriculum.build.title", "Build a curriculum")}
        </CardTitle>
        <CardDescription>
          {t(
            "curriculum.build.description",
            "Turn a role's validated knowledge into a wiring-adapted learning path for the next person. Only validated and provisional units are used."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="build-role">{t("curriculum.build.role", "Role")}</Label>
            <select
              id="build-role"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              disabled={rolesLoading || busy}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">
                {rolesLoading
                  ? t("curriculum.build.loadingRoles", "Loading roles…")
                  : t("curriculum.build.selectRole", "Select a role")}
              </option>
              {roles.map((r) => (
                <option key={r.taxonomy_id} value={r.role_title}>
                  {r.role_title}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={buildAndPublish} disabled={!selected || busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {buttonLabel}
          </Button>
        </div>
        {rolesFailed && isKceAccessDenied(rolesError) && <KceAccessInline />}
        {/* D-17 PR-B: a failed read is not "no roles yet". */}
        {rolesFailed && !isKceAccessDenied(rolesError) && roles.length === 0 && (
          <div role="alert" data-testid="curriculum-roles-load-failed" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {t(
                "curriculum.build.rolesLoadFailed",
                "Your saved roles couldn't be loaded. That is not the same as having none — try again in a moment."
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetchRoles()} disabled={rolesFetching}>
              {t("curriculum.build.rolesRetry", "Try again")}
            </Button>
          </div>
        )}
        {!rolesLoading && !rolesFailed && roles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t(
              "curriculum.build.noRoles",
              "No roles yet — blueprint and capture a role first, then validate its knowledge."
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

/**
 * Knowledge Continuity vertical — Successor Curriculum. A successor picks a
 * published curriculum and walks its modules; each taught sentence exposes its
 * provenance (the captured knowledge units it came from) and lets the successor
 * confirm, dispute, or ask for clarification. Renders inside the shared
 * AppShell via KceLayout, which already gates the vertical on entitlement.
 * Deliberately plain language — no raw scoring/formula names surfaced.
 */
export default function KceCurriculumPage() {
  const { t } = useTranslation("kcPages")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <GraduationCap className="h-5 w-5 text-[#127A8A]" />
          {t("curriculum.title", "Successor curriculum")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("curriculum.subtitle", "Learn the role from captured expertise — and flag anything that's no longer accurate.")}
        </p>
      </div>

      {selectedTemplateId ? (
        <CurriculumWalkthrough
          templateId={selectedTemplateId}
          onBack={() => setSelectedTemplateId(null)}
        />
      ) : (
        <div className="space-y-6">
          <BuildCurriculumPanel onPublished={setSelectedTemplateId} />
          <CurriculumPicker onSelect={setSelectedTemplateId} />
        </div>
      )}
    </div>
  )
}
