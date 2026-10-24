import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCurriculumCatalogs, useOpenOrStartDraft } from "@/hooks/curriculum/useCurriculumAdmin"
import { liveVersionOf } from "@/lib/curriculum/catalogVersions"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { Catalog } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import { catalogPath } from "./curriculumUi"

/**
 * "Edit" on a PUBLISHED catalog (CUR-UNLOCK). A published catalog is never
 * edited in place, so this opens the draft of the same year already in
 * progress, or — if there is none — starts one as a copy, exactly as
 * "New version" does, and opens it. The published version stays live until
 * that draft is published.
 *
 * Renders nothing for a draft or a superseded catalog: a draft is already
 * editable, and a superseded catalog keeps its own "New version" (a restore),
 * which is a separate decision.
 */
export function EditCatalogButton({
  catalog,
  label = "Edit",
  variant = "default",
  onError,
}: {
  catalog: Catalog
  label?: string
  variant?: "default" | "outline" | "ghost"
  /** Hand the error to the caller's own panel instead of rendering it here. */
  onError?: (error: CurriculumError | null) => void
}) {
  const navigate = useNavigate()
  const run = useOpenOrStartDraft()
  const [error, setError] = useState<CurriculumError | null>(null)

  if (catalog.status !== "published") return null

  const report = (e: CurriculumError | null) => (onError ? onError(e) : setError(e))

  const onClick = () => {
    report(null)
    run.mutate(catalog, {
      onSuccess: ({ catalog: draft, created }) => {
        toast.success(
          created
            ? `Draft ${draft.catalogYear} v${draft.version} started from v${catalog.version}.`
            : `Opened the draft already in progress: ${draft.catalogYear} v${draft.version}.`
        )
        navigate(catalogPath(draft.id))
      },
      onError: (err) => report(curriculumError(err, "The draft was not opened.")),
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        onClick={onClick}
        disabled={run.isPending}
        aria-label={`${label} ${catalog.catalogYear} v${catalog.version}`}
        className="gap-1.5"
      >
        <Pencil className="h-4 w-4" />
        {label}
      </Button>
      {!onError && error && <CurriculumErrorPanel error={error} />}
    </>
  )
}

/**
 * On a DRAFT whose year already has a published version: say which version is
 * being edited and that the published one stays live until this is published.
 */
export function LiveVersionBanner({ catalog }: { catalog: Catalog }) {
  const isDraft = catalog.status === "draft"
  const { data } = useCurriculumCatalogs(isDraft ? catalog.institutionId : null)
  const live = isDraft ? liveVersionOf(data ?? [], catalog) : null
  if (!live) return null
  return (
    <p role="status" className="rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900">
      {`You're editing v${catalog.version}. v${live.version} stays live until you publish.`}
    </p>
  )
}
