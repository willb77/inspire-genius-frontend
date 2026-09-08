import { useRef, useState, type ChangeEvent } from "react"
import { AlertTriangle, FileUp, Gauge, Loader2, ScanSearch, Sparkles, Sprout, Target } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ACCEPTED_ROLE_FILE_TYPES,
  extractRoleText,
  RoleExtractionError,
} from "@/lib/extractRoleText"
import { useTargetExtract } from "@/hooks/job-fit/useTargetExtract"
import { isNoPrismError, useScoreTarget } from "@/hooks/job-fit/useScoreTarget"
import type { FitDetail } from "@/types/job-fit"
import type { ExtractedDimension, TargetDraft } from "@/types/targets"
import { flattenTargetDraft } from "@/types/targets"
import {
  FitCard,
  FitEmptyState,
  FitError,
  FitLoading,
  FitMeter,
  FitMethodologyNote,
  FitPageHeader,
  FitPill,
  FitSectionTitle,
  FitStat,
} from "./_shared"
import {
  bandLabel,
  bandTone,
  confidenceTone,
  fitPercent,
  fitPercentLabel,
  fitPercentTone,
  type Tone,
} from "./_fit"
import { FitBreakdown } from "./FitBreakdown"

/** Group definitions in a stable, human order. */
const GROUPS: { key: keyof Pick<TargetDraft, "behaviors" | "aptitudes" | "coreTraits">; label: string }[] = [
  { key: "behaviors", label: "Behavioral style" },
  { key: "aptitudes", label: "Aptitudes" },
  { key: "coreTraits", label: "Core traits" },
]

function provenanceTone(provenance: ExtractedDimension["provenance"]): Tone {
  return provenance === "measured" ? "green" : "gray"
}

/** One drafted dimension: its target meter, provenance + confidence, evidence. */
function DimensionRow({ dim }: { dim: ExtractedDimension }) {
  return (
    <div className="border-b border-[#f1f2f4] py-3 last:border-b-0">
      <FitMeter
        value={dim.target}
        tone="teal"
        label={dim.dimensionName}
        right={`${Math.round(dim.target)}`}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <FitPill tone={provenanceTone(dim.provenance)}>
          {dim.provenance === "measured" ? "From the JD" : "Imputed"}
        </FitPill>
        <FitPill tone={confidenceTone(dim.confidence)}>
          {Math.round(dim.confidence * 100)}% confidence
        </FitPill>
        {dim.evidence && <span className="text-xs text-[#9ca3af]">{dim.evidence}</span>}
      </div>
    </div>
  )
}

/**
 * The scored read of a drafted target: the same headline the role detail page
 * leads with (fit %, closeness, growth areas, priority focus, tier), then the
 * shared breakdown. No narrative cards — those need a published role id.
 */
function TargetFitResult({ data }: { data: FitDetail }) {
  const pct = fitPercent(data.fitScore, data.totalVariation, data.perDimension.length || 22)
  return (
    <div className="space-y-6">
      <FitCard>
        <FitSectionTitle>Your fit against this target</FitSectionTitle>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#1f2937]">{pct}</span>
              <span className="text-lg font-semibold text-[#6b7280]">%</span>
            </div>
            <p className="text-sm font-medium text-[#374151]">{fitPercentLabel(pct)}</p>
          </div>
          <Gauge className="h-8 w-8 text-[#0D9488]" aria-hidden />
        </div>
        <FitMeter value={pct} tone={fitPercentTone(pct)} className="mb-4" />
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
          <FitPill tone={bandTone(data.tier)}>{bandLabel(data.tier)}</FitPill>
          {data.baseTier !== data.tier && (
            <FitPill tone="gray">Before the critical-gap cap: {bandLabel(data.baseTier)}</FitPill>
          )}
          {data.gated && <FitPill tone="amber">Decision support only</FitPill>}
        </div>
      </FitCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FitStat
          icon={Target}
          label="Overall closeness"
          value={data.totalVariation}
          hint="Lower means closer to this target"
        />
        <FitStat
          icon={Sprout}
          label="Growth areas"
          value={data.coachingGaps.length}
          hint="Dimensions to develop toward the target"
          tone="amber"
        />
        <FitStat
          icon={AlertTriangle}
          label="Priority focus"
          value={data.criticalGaps.length}
          hint="Larger gaps worth prioritizing"
          tone={data.criticalGaps.length > 0 ? "red" : "green"}
        />
      </div>

      <div>
        <FitBreakdown data={data} />
      </div>

      <FitMethodologyNote note={data.methodologyNote} />
    </div>
  )
}

/**
 * Job-Fit "Fit a job description" tool — the vertical's consumer of the neutral
 * target service (Decision D7, `POST /v1/targets/extract`).
 *
 * The rest of Job Fit scores you against roles that were already published as Job
 * DNAs. This fills the obvious gap: paste (or upload) ANY job description and see
 * the governed target the extractor drafts for it — per-dimension benchmark,
 * provenance (was it in the JD, or imputed?), and confidence. It is a DRAFT, and
 * the disclaimer makes that explicit: it informs, it does not decide.
 *
 * Once a target is drafted you can score your own PRISM against it
 * (`POST /v1/blueprint/fit/target`, self-scoped — your vector never leaves the
 * server). The result is the same breakdown the role detail page renders. An
 * account with no PRISM on file is told so in place, never shown a score.
 */
export default function TargetPreviewPage() {
  const [jdText, setJdText] = useState("")
  const [draft, setDraft] = useState<TargetDraft | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const extract = useTargetExtract()
  const score = useScoreTarget()

  const trimmed = jdText.trim()
  const canSubmit = trimmed.length > 0 && !extract.isPending

  function onSubmit() {
    if (!canSubmit) return
    extract.mutate(trimmed, {
      onSuccess: (d) => {
        // A new draft is a new target: any earlier score no longer applies to it.
        score.reset()
        setDraft(d)
      },
    })
  }

  function onScore() {
    if (!draft || score.isPending) return
    score.mutate({ draft })
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    try {
      const { text } = await extractRoleText(file)
      if (!text) {
        toast.error("That file didn't contain any readable text.")
        return
      }
      setJdText(text)
    } catch (err) {
      toast.error(
        err instanceof RoleExtractionError
          ? err.message
          : "Couldn't read that file. Paste the text instead.",
      )
    }
  }

  return (
    <div className="pb-10">
      <FitPageHeader
        icon={ScanSearch}
        title="Fit a job description"
        description="Paste or upload a job description and preview the behavioral target it implies — before it's ever published as a role."
      />

      <FitCard className="mb-6">
        <FitSectionTitle
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp className="mr-1.5 h-4 w-4" aria-hidden />
              Upload a file
            </Button>
          }
        >
          Job description
        </FitSectionTitle>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_ROLE_FILE_TYPES}
          className="hidden"
          onChange={onFile}
          aria-hidden
        />
        <Textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the job description here…"
          rows={8}
          aria-label="Job description"
        />
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {extract.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                Drafting…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                Draft the target
              </>
            )}
          </Button>
        </div>
      </FitCard>

      {!draft && !extract.isPending && (
        <FitEmptyState>
          The drafted target will appear here — a benchmark for each of the 22 dimensions, with
          where it came from and how confident the extractor is.
        </FitEmptyState>
      )}

      {draft && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <FitStat
              icon={ScanSearch}
              label="From the JD"
              value={draft.measuredCount}
              hint="dimensions with direct evidence"
              tone="green"
            />
            <FitStat
              icon={Sparkles}
              label="Imputed"
              value={draft.imputedCount}
              hint="derived from the role shape"
              tone="gray"
            />
            <FitStat
              icon={ScanSearch}
              label="Mean confidence"
              value={`${Math.round(draft.meanConfidence * 100)}%`}
              hint={draft.provider === "anthropic" ? "model-drafted" : "keyword-drafted"}
              tone={confidenceTone(draft.meanConfidence)}
            />
          </div>

          {draft.warnings.length > 0 && (
            <FitCard className="border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.06)]">
              <ul className="list-inside list-disc text-sm text-[#b45309]">
                {draft.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </FitCard>
          )}

          {GROUPS.map(({ key, label }) => {
            const dims = draft[key]
            if (dims.length === 0) return null
            return (
              <FitCard key={key}>
                <FitSectionTitle>{label}</FitSectionTitle>
                {dims.map((dim) => (
                  <DimensionRow key={dim.dimensionId} dim={dim} />
                ))}
              </FitCard>
            )
          })}

          {flattenTargetDraft(draft).length === 0 && (
            <FitEmptyState>The extractor couldn't draft any dimensions from that text.</FitEmptyState>
          )}

          <FitMethodologyNote note={draft.methodologyNote} />

          {/* Score my fit — the draft is a target; this is you against it */}
          <FitCard>
            <FitSectionTitle
              action={
                <Button type="button" onClick={onScore} disabled={score.isPending}>
                  {score.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                      Scoring…
                    </>
                  ) : (
                    <>
                      <Gauge className="mr-1.5 h-4 w-4" aria-hidden />
                      Score my fit against this target
                    </>
                  )}
                </Button>
              }
            >
              Score my fit
            </FitSectionTitle>
            <p className="text-sm text-[#6b7280]">
              Compare your own PRISM profile with this drafted target, dimension by dimension —
              the same read as a published role, so a role that isn&apos;t on the platform yet can
              still be sized up.
            </p>
          </FitCard>

          {score.isPending && <FitLoading label="Scoring your fit against this target…" />}

          {score.isError && isNoPrismError(score.error) && (
            <FitEmptyState>
              We can&apos;t score your fit yet — there&apos;s no PRISM assessment on file for your
              account. Once your PRISM report is uploaded, come back and score this target.
            </FitEmptyState>
          )}

          {score.isError && !isNoPrismError(score.error) && (
            <FitError>
              We couldn&apos;t score your fit against this target. Please try again shortly.
            </FitError>
          )}

          {score.isSuccess && score.data && <TargetFitResult data={score.data} />}
        </div>
      )}
    </div>
  )
}
