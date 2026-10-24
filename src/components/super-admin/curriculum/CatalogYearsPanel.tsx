import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CopyPlus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateCatalog, useCurriculumCatalogs, useDeleteCatalog } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { Catalog } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import { catalogYearSchema, type CatalogYearValues } from "./curriculum.schemas"
import { catalogPath } from "./curriculumUi"


export function StatusBadge({ status }: { status: Catalog["status"] }) {
  const variant = status === "published" ? "default" : status === "draft" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

/**
 * One school's catalog years and their versions. A published catalog is never
 * edited; "New version" starts a draft copy of it, which is what gets edited
 * and published in its place.
 */
export function CatalogYearsPanel({ institutionId, schoolName }: { institutionId: string; schoolName?: string }) {
  const navigate = useNavigate()
  const { data, isLoading, error } = useCurriculumCatalogs(institutionId)
  const create = useCreateCatalog()
  const remove = useDeleteCatalog(institutionId)
  const [actionError, setActionError] = useState<CurriculumError | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogYearValues>({ resolver: zodResolver(catalogYearSchema), defaultValues: { catalogYear: "" } })

  const startDraft = (catalogYear: string, fromCatalogId: string | null) => {
    setActionError(null)
    create.mutate(
      { institutionId, catalogYear, fromCatalogId },
      {
        onSuccess: (c) => {
          toast.success(`Draft ${c.catalogYear} v${c.version} started.`)
          reset({ catalogYear: "" })
          navigate(catalogPath(c.id))
        },
        onError: (err) => setActionError(curriculumError(err, "The catalog was not created.")),
      }
    )
  }

  const onSubmit = handleSubmit((v) => startDraft(v.catalogYear.trim(), null))

  const onDelete = (c: Catalog) => {
    setActionError(null)
    remove.mutate(c.id, {
      onSuccess: () => toast.success(`Draft ${c.catalogYear} v${c.version} deleted.`),
      onError: (err) => setActionError(curriculumError(err, "The draft was not deleted.")),
    })
  }

  const catalogs = data ?? []
  return (
    <section aria-label="Catalog years" className="space-y-3">
      <h2 className="text-lg font-semibold">Catalog years{schoolName ? ` — ${schoolName}` : ""}</h2>

      <form onSubmit={onSubmit} aria-label="Start a catalog year" className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="catalog-year">New catalog year</Label>
          <Input id="catalog-year" placeholder="2026-2027" {...register("catalogYear")} />
        </div>
        <Button type="submit" size="sm" disabled={create.isPending} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Start draft
        </Button>
        {errors.catalogYear && <p className="w-full text-xs text-red-600">{errors.catalogYear.message}</p>}
      </form>

      {actionError && <CurriculumErrorPanel error={actionError} />}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <CurriculumErrorPanel error={curriculumError(error, "Could not load the catalog years.")} />
      ) : catalogs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No catalog years yet for this school.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-64" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogs.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.catalogYear}</TableCell>
                <TableCell>v{c.version}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>{c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button asChild size="sm" variant="outline">
                    <Link to={catalogPath(c.id)}>Open</Link>
                  </Button>
                  {c.status === "draft" ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete draft ${c.catalogYear} v${c.version}`}
                      onClick={() => onDelete(c)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => startDraft(c.catalogYear, c.id)}
                      disabled={create.isPending}
                    >
                      <CopyPlus className="h-4 w-4" />
                      New version
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export default CatalogYearsPanel
