import { useRef, useState, type ChangeEvent } from "react"
import { FileUp, Loader2, ScanSearch, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ACCEPTED_ROLE_FILE_TYPES,
  extractRoleText,
  RoleExtractionError,
} from "@/lib/extractRoleText"
import { useTargetExtract } from "@/hooks/job-fit/useTargetExtract"
import type { ExtractedDimension, TargetDraft } from "@/types/targets"
import { flattenTargetDraft } from "@/types/targets"
import {
  FitCard,
  FitEmptyState,
  FitMeter,
  FitMethodologyNote,
  FitPageHeader,
  FitPill,
  FitSectionTitle,
  FitStat,
} from "./_shared"
import { confidenceTone, type Tone } from "./_fit"

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
 * Job-Fit "Fit a job description" tool — the vertical's consumer of the neutral
 * target service (Decision D7, `POST /v1/targets/extract`).
 *
 * The rest of Job Fit scores you against roles that were already published as Job
 * DNAs. This fills the obvious gap: paste (or upload) ANY job description and see
 * the governed target the extractor drafts for it — per-dimension benchmark,
 * provenance (was it in the JD, or imputed?), and confidence. It is a DRAFT, and
 * the disclaimer makes that explicit: it informs, it does not decide.
 */
export default function TargetPreviewPage() {
  const [jdText, setJdText] = useState("")
  const [draft, setDraft] = useState<TargetDraft | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const extract = useTargetExtract()

  const trimmed = jdText.trim()
  const canSubmit = trimmed.length > 0 && !extract.isPending

  function onSubmit() {
    if (!canSubmit) return
    extract.mutate(trimmed, { onSuccess: setDraft })
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
        </div>
      )}
    </div>
  )
}
