import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurriculumInstitutions, useSaveInstitution } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { Institution } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import { institutionSchema, type InstitutionValues } from "./curriculum.schemas"

const EMPTY: InstitutionValues = { name: "", unitid: "", opeid: "" }

/** Schools: list, add, edit. Selecting one opens its catalog years. */
export function SchoolsPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { data, isLoading, error, refetch } = useCurriculumInstitutions(true)
  const save = useSaveInstitution()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [saveError, setSaveError] = useState<CurriculumError | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstitutionValues>({ resolver: zodResolver(institutionSchema), defaultValues: EMPTY })

  const open = (i: Institution | null) => {
    reset(i ? { name: i.name, unitid: i.unitid ?? "", opeid: i.opeid ?? "" } : EMPTY)
    setEditing(i)
    setSaveError(null)
    setFormOpen(true)
  }

  const onSubmit = handleSubmit((v) => {
    setSaveError(null)
    save.mutate(
      { id: editing?.id, body: { name: v.name.trim(), unitid: v.unitid.trim(), opeid: v.opeid.trim() } },
      {
        onSuccess: (school) => {
          toast.success(`Saved ${school.name}.`)
          setFormOpen(false)
          onSelect(school.id)
        },
        onError: (err) => setSaveError(curriculumError(err, "The school was not saved.")),
      }
    )
  })

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />
  }
  if (error) {
    return (
      <div className="space-y-2">
        <CurriculumErrorPanel error={curriculumError(error, "Could not load the schools.")} />
        <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  const schools = data ?? []
  return (
    <section aria-label="Schools" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schools</h2>
        {!formOpen && (
          <Button size="sm" onClick={() => open(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add school
          </Button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} aria-label="School form" className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="school-name">School name</Label>
              <Input id="school-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="school-unitid">UNITID (IPEDS, optional)</Label>
              <Input id="school-unitid" inputMode="numeric" {...register("unitid")} />
              {errors.unitid && <p className="text-xs text-red-600">{errors.unitid.message}</p>}
            </div>
            <div>
              <Label htmlFor="school-opeid">OPEID (optional)</Label>
              <Input id="school-opeid" inputMode="numeric" {...register("opeid")} />
              {errors.opeid && <p className="text-xs text-red-600">{errors.opeid.message}</p>}
            </div>
          </div>
          {saveError && <CurriculumErrorPanel error={saveError} />}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              {editing ? "Save school" : "Add school"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {schools.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No schools yet. Add the first one to start entering its catalog.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>UNITID</TableHead>
              <TableHead>OPEID</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((s) => (
              <TableRow key={s.id} data-state={s.id === selectedId ? "selected" : undefined}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.unitid ?? "—"}</TableCell>
                <TableCell>{s.opeid ?? "—"}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => onSelect(s.id)}>
                    Catalog years
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => open(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export default SchoolsPanel
