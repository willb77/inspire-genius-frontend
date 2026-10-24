import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CopyPlus, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCreateCatalog, usePublishCatalog } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { CatalogDetail } from "@/types/curriculum"
import { catalogPath } from "./curriculumUi"
import { CurriculumErrorPanel, CurriculumReportView } from "./CurriculumReportView"

/**
 * Publish a draft, or start a new version of a published one.
 *
 * The publish check shown is the server's (`publishCheck` on the catalog
 * read), refreshed after every edit. Publishing makes any earlier published
 * version of the same year `superseded`, server-side, in one transaction.
 */
export function PublishPanel({ detail }: { detail: CatalogDetail }) {
  const navigate = useNavigate()
  const { catalog, publishCheck } = detail
  const publish = usePublishCatalog(catalog.id, catalog.institutionId)
  const create = useCreateCatalog()
  const [error, setError] = useState<CurriculumError | null>(null)
  const isDraft = catalog.status === "draft"

  const onPublish = () => {
    setError(null)
    publish.mutate(undefined, {
      onSuccess: (c) => toast.success(`${c.catalogYear} v${c.version} is published.`),
      onError: (err) => setError(curriculumError(err, "The catalog was not published.")),
    })
  }

  const onNewVersion = () => {
    setError(null)
    create.mutate(
      { institutionId: catalog.institutionId, catalogYear: catalog.catalogYear, fromCatalogId: catalog.id },
      {
        onSuccess: (c) => {
          toast.success(`Draft ${c.catalogYear} v${c.version} started from v${catalog.version}.`)
          navigate(catalogPath(c.id))
        },
        onError: (err) => setError(curriculumError(err, "The new version was not created.")),
      }
    )
  }

  return (
    <div className="space-y-4">
      {isDraft ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onPublish} disabled={!publishCheck.ok || publish.isPending} className="gap-1.5">
            <Send className="h-4 w-4" />
            Publish {catalog.catalogYear} v{catalog.version}
          </Button>
          <span className="text-sm text-muted-foreground">
            {publishCheck.ok
              ? "Publishing replaces the published version of this year, if there is one. It cannot be edited afterwards."
              : "Fix the problems below before publishing."}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            This catalog is {catalog.status}. Published catalogs are never edited — a correction is a new version
            of the catalog year.
          </p>
          <Button variant="outline" onClick={onNewVersion} disabled={create.isPending} className="gap-1.5">
            <CopyPlus className="h-4 w-4" />
            Start a new version
          </Button>
        </div>
      )}

      {error && <CurriculumErrorPanel error={error} />}
      <CurriculumReportView report={publishCheck} title="Publish check" />
    </div>
  )
}

export default PublishPanel
