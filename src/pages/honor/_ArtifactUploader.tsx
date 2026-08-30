import { useState } from "react"
import { Check, Loader2, Plus, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUploadFellowArtifact } from "@/hooks/honor/useHonorArtifacts"
import type { HonorFellowSources } from "@/types/honor"
import { FileDrop } from "./_FileDrop"
import { HONOR_BTN_PRIMARY } from "./_format"
import { ARTIFACTS, artifactPresent, type ArtifactConfig } from "./_artifacts"

/**
 * Honor Coach Workbench — the reusable "attach an artifact" surface.
 *
 * A Fellow's profile is built from 10 canonical artifacts: the six behavioural
 * assessments (PRISM is the source of truth), the résumé, bio, additional-info
 * document, and free-text goals (config lives in {@link ./_artifacts}). This
 * module is the two UI pieces that read/write them:
 *   • {@link ArtifactUploader}     — attach ONE artifact (file drop or goals text)
 *   • {@link ArtifactStatusMatrix} — the 10-row ✓ / “Add” status grid
 *
 * All writes go through {@link useUploadFellowArtifact}, which invalidates the
 * fellow's source caches so every surface refreshes together.
 */

/** Attach ONE artifact to a fellow — a file drop (assessment / doc) or a goals textarea. */
export function ArtifactUploader({
  fellowId,
  artifact,
  managed,
  onDone,
}: {
  fellowId: string
  artifact: ArtifactConfig
  /** The fellow is not invited yet — assessment/doc adds are blocked (goals still allowed). */
  managed?: boolean
  onDone?: () => void
}) {
  const upload = useUploadFellowArtifact()
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("")

  const blocked = !!managed && artifact.kind !== "goals"

  if (blocked) {
    return (
      <p className="text-xs text-[#9299a6]">
        Invite the fellow first — a managed fellow has no profile yet to attach {artifact.label} to.
      </p>
    )
  }

  if (artifact.kind === "goals") {
    return (
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe this fellow's goals & objectives…"
          className="min-h-[70px] w-full resize-y rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
        />
        <button
          type="button"
          className={HONOR_BTN_PRIMARY}
          disabled={upload.isPending || !text.trim()}
          onClick={() =>
            upload.mutate(
              { kind: "goals", fellowId, text: text.trim() },
              {
                onSuccess: () => {
                  toast.success("Goals saved.")
                  setText("")
                  onDone?.()
                },
              },
            )
          }
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save goals
        </button>
      </div>
    )
  }

  // assessment | doc → a file drop + upload button
  function submit() {
    if (!file) return
    const vars =
      artifact.kind === "assessment"
        ? ({ kind: "assessment", fellowId, framework: artifact.framework!, file } as const)
        : ({ kind: "doc", fellowId, docKind: artifact.docKind!, file } as const)
    upload.mutate(vars, {
      onSuccess: () => {
        toast.success(`${artifact.label} attached.`)
        setFile(null)
        onDone?.()
      },
    })
  }

  return (
    <div className="space-y-2">
      <FileDrop
        file={file}
        onFile={setFile}
        accept={artifact.accept}
        placeholder={`Drop the ${artifact.label} file or click to browse`}
        compact
      />
      <button
        type="button"
        className={HONOR_BTN_PRIMARY}
        disabled={upload.isPending || !file}
        onClick={submit}
      >
        {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Attach {artifact.label}
      </button>
    </div>
  )
}

/**
 * The 10-artifact status grid. Each row is ✓ (present, from `sources`) or an
 * inline “Add” that reveals an {@link ArtifactUploader}. `compact` renders the
 * artifacts as a single wrap-row of small badges (for the Evaluate fellow grid);
 * the default renders labelled rows (Fellow Profile / Administration).
 */
export function ArtifactStatusMatrix({
  fellowId,
  sources,
  onChanged,
  compact,
}: {
  fellowId: string
  sources: HonorFellowSources | undefined
  onChanged?: () => void
  compact?: boolean
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const managed = sources?.managed === true

  function done() {
    setOpenKey(null)
    onChanged?.()
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {ARTIFACTS.map((a) => {
            const present = artifactPresent(sources, a)
            const open = openKey === a.key
            return present ? (
              <span
                key={a.key}
                title={`${a.label} on file`}
                aria-label={`${a.label} on file`}
                className="inline-flex items-center gap-1 rounded-md border border-[#cfe8d4] bg-[#f2faf4] px-1.5 py-0.5 text-[11px] font-medium text-[#1f7a3d]"
              >
                <Check className="h-3 w-3" />
                {a.abbr}
              </span>
            ) : (
              <button
                key={a.key}
                type="button"
                title={`Add ${a.label}`}
                aria-label={`Add ${a.label}`}
                onClick={() => setOpenKey(open ? null : a.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                  open
                    ? "border-[#E8792B] bg-[#fdf2e9] text-[#c9631a]"
                    : "border-[#e6e9ef] bg-white text-[#9299a6] hover:border-[#E8792B] hover:text-[#c9631a]",
                )}
              >
                <Plus className="h-3 w-3" />
                {a.abbr}
              </button>
            )
          })}
        </div>
        {openKey && (
          <InlineUploader
            fellowId={fellowId}
            artifactKey={openKey}
            managed={managed}
            onClose={() => setOpenKey(null)}
            onDone={done}
          />
        )}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-[#f1f3f7]">
      {ARTIFACTS.map((a) => {
        const present = artifactPresent(sources, a)
        const open = openKey === a.key
        return (
          <li key={a.key} className="py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#18202f]">{a.label}</span>
              {present ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(47,143,91,0.14)] px-2 py-0.5 text-xs font-medium text-[#2f8f5b]">
                  <Check className="h-3.5 w-3.5" /> On file
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Add ${a.label}`}
                  onClick={() => setOpenKey(open ? null : a.key)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#dfe4ec] bg-white px-2.5 py-1 text-xs font-medium text-[#c9631a] transition-colors hover:border-[#E8792B]"
                >
                  {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {open ? "Cancel" : "Add"}
                </button>
              )}
            </div>
            {open && (
              <div className="mt-2">
                <ArtifactUploader fellowId={fellowId} artifact={a} managed={managed} onDone={done} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Compact-mode inline uploader: resolves the artifact by key and frames it. */
function InlineUploader({
  fellowId,
  artifactKey,
  managed,
  onClose,
  onDone,
}: {
  fellowId: string
  artifactKey: string
  managed: boolean
  onClose: () => void
  onDone: () => void
}) {
  const artifact = ARTIFACTS.find((a) => a.key === artifactKey)
  if (!artifact) return null
  return (
    <div className="rounded-lg border border-[#e6e9ef] bg-[#fafbfc] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#18202f]">Add {artifact.label}</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-[#9299a6] hover:text-[#18202f]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ArtifactUploader fellowId={fellowId} artifact={artifact} managed={managed} onDone={onDone} />
    </div>
  )
}
