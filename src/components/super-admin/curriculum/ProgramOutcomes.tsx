import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProgramOutcomes, useRoleFamilies, useSaveProgramOutcomes } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { AdminOutcome, OutcomeLinkStatus, ProgramOutcomes as ProgramOutcomesData } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import {
  EMPTY_OUTCOME,
  MAX_OUTCOMES_PER_PROGRAM,
  makeOutcomesSchema,
  toOutcomeInputs,
  toOutcomesValues,
  type OutcomesValues,
} from "./outcomes.schemas"

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const LINK_LABEL: Record<OutcomeLinkStatus, string> = {
  active: "active",
  superseded: "superseded — a newer version exists",
  draft: "draft — not linkable",
  missing: "missing — no longer in the library",
  "other-org": "another organisation's role",
  unknown: "status unknown",
}

/** A short "not validated" label: SOC / O*NET codes are checked for format only. */
function NotValidated() {
  return (
    <span className="ml-1.5 rounded border border-amber-300 bg-amber-50 px-1 text-[10px] uppercase tracking-wide text-amber-800">
      not validated
    </span>
  )
}

function LinkedRole({ outcome }: { outcome: AdminOutcome }) {
  const bp = outcome.blueprint
  if (!bp) return <>—</>
  return (
    <div className="space-y-0.5">
      <div>{bp.title ?? "Untitled role"}</div>
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">{bp.id}</span> · {LINK_LABEL[bp.status] ?? bp.status}
      </div>
    </div>
  )
}

function OutcomesTable({ outcomes }: { outcomes: AdminOutcome[] }) {
  if (outcomes.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No outcomes yet — this program does not say where it leads.
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role family</TableHead>
          <TableHead>Linked role</TableHead>
          <TableHead>SOC / O*NET code</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {outcomes.map((o, i) => (
          <TableRow key={`${o.roleFamily}-${o.blueprintId ?? ""}-${o.socCode ?? ""}-${i}`}>
            <TableCell>{o.roleFamily}</TableCell>
            <TableCell>
              <LinkedRole outcome={o} />
            </TableCell>
            <TableCell>
              {o.socCode ? (
                <>
                  <span className="font-mono">{o.socCode}</span>
                  <NotValidated />
                </>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Loads the role families (the picker's options and the cap) before the form exists. */
function OutcomesForm({
  catalogId,
  data,
  onDone,
}: {
  catalogId: string
  data: ProgramOutcomesData
  onDone: () => void
}) {
  const families = useRoleFamilies()
  if (families.isLoading) return <Skeleton className="h-24 w-full" />
  if (families.error || !families.data) {
    return <CurriculumErrorPanel error={curriculumError(families.error, "Could not load the role families.")} />
  }
  return (
    <OutcomesFormBody
      catalogId={catalogId}
      data={data}
      familyNames={families.data.roleFamilies}
      max={Math.min(families.data.maxOutcomesPerProgram || MAX_OUTCOMES_PER_PROGRAM, MAX_OUTCOMES_PER_PROGRAM)}
      onDone={onDone}
    />
  )
}

/** The edit form. Saving replaces the program's whole list (`[]` clears it). */
function OutcomesFormBody({
  catalogId,
  data,
  familyNames,
  max,
  onDone,
}: {
  catalogId: string
  data: ProgramOutcomesData
  familyNames: string[]
  max: number
  onDone: () => void
}) {
  const save = useSaveProgramOutcomes(catalogId, data.program.id)
  const [saveError, setSaveError] = useState<CurriculumError | null>(null)
  const form = useForm<OutcomesValues>({
    resolver: zodResolver(makeOutcomesSchema(max)),
    defaultValues: toOutcomesValues(data.outcomes),
  })
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form
  const rows = useFieldArray({ control, name: "outcomes" })

  // A stored family the server no longer lists stays selectable, so opening the
  // form never silently changes an outcome.
  const optionsFor = (current: string) =>
    current && !familyNames.includes(current) ? [current, ...familyNames] : familyNames

  const onSubmit = handleSubmit((values) => {
    setSaveError(null)
    save.mutate(toOutcomeInputs(values), {
      onSuccess: () => {
        toast.success(`Saved the outcomes of ${data.program.code}.`)
        onDone()
      },
      onError: (err) => setSaveError(curriculumError(err, "The outcomes were not saved.")),
    })
  })

  return (
    <form onSubmit={onSubmit} aria-label="Outcomes form" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        A linked role is optional. There is no role picker here: paste the id of an <em>active</em> role from the
        shared role library or this school’s own organisation — the server checks it and says why if it can’t be
        linked. Up to {max} outcomes per program.
      </p>
      {rows.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No outcomes — saving now clears this program’s outcomes.</p>
      )}
      {rows.fields.map((field, i) => {
        const e = errors.outcomes?.[i]
        const current = form.getValues(`outcomes.${i}.roleFamily`)
        return (
          <div key={field.id} className="space-y-1 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={`outcome-family-${i}`}>Role family</Label>
                <select id={`outcome-family-${i}`} className={selectClass} {...register(`outcomes.${i}.roleFamily`)}>
                  <option value="">Pick a role family…</option>
                  {optionsFor(current).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[18rem] flex-1">
                <Label htmlFor={`outcome-blueprint-${i}`}>Role (blueprint) id — optional</Label>
                <Input
                  id={`outcome-blueprint-${i}`}
                  placeholder="paste a role id"
                  className="font-mono"
                  {...register(`outcomes.${i}.blueprintId`)}
                />
              </div>
              <div className="w-40">
                <Label htmlFor={`outcome-soc-${i}`}>
                  SOC / O*NET code <NotValidated />
                </Label>
                <Input id={`outcome-soc-${i}`} placeholder="15-1252" {...register(`outcomes.${i}.socCode`)} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove outcome ${i + 1}`}
                onClick={() => rows.remove(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {e && (
              <p className="text-xs text-red-600">
                {e.roleFamily?.message ?? e.socCode?.message ?? e.blueprintId?.message}
              </p>
            )}
          </div>
        )
      })}
      {errors.outcomes?.message && <p className="text-xs text-red-600">{errors.outcomes.message}</p>}
      {errors.outcomes?.root?.message && <p className="text-xs text-red-600">{errors.outcomes.root.message}</p>}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={rows.fields.length >= max}
        onClick={() => rows.append({ ...EMPTY_OUTCOME })}
      >
        <Plus className="h-4 w-4" />
        Add outcome
      </Button>

      {saveError && <CurriculumErrorPanel error={saveError} />}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          Save outcomes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * One program's career outcomes (CUR-3): a role family, optionally a linked
 * role (blueprint), optionally a SOC / O*NET code.
 *
 * Editable only when the page says the catalog is a draft AND the server's
 * outcome read says so too; a published catalog is read-only and changes go
 * through Publish → “Start a new version”, as for every other catalog edit.
 * The server enforces all of it again (super-admin, switch, draft lock).
 */
export function ProgramOutcomes({
  catalogId,
  program,
  editable,
  onClose,
}: {
  catalogId: string
  program: { id: string; code: string; title: string }
  editable: boolean
  onClose?: () => void
}) {
  const { data, isLoading, error, refetch } = useProgramOutcomes(program.id)
  const [editing, setEditing] = useState(false)

  const canEdit = editable && data?.catalog.status === "draft"

  return (
    <section aria-label={`Outcomes of ${program.code}`} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Career outcomes — <span className="font-mono">{program.code}</span> {program.title}
        </h3>
        <div className="flex gap-1">
          {canEdit && !editing && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit outcomes
            </Button>
          )}
          {onClose && (
            <Button size="icon" variant="ghost" aria-label="Close outcomes" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error || !data ? (
        <div className="space-y-2">
          <CurriculumErrorPanel error={curriculumError(error, "Could not load this program's outcomes.")} />
          <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!data.libraryAvailable && (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              The role library can’t be read right now, so linked roles show “status unknown”.
            </p>
          )}
          {canEdit && editing ? (
            <OutcomesForm catalogId={catalogId} data={data} onDone={() => setEditing(false)} />
          ) : (
            <OutcomesTable outcomes={data.outcomes} />
          )}
          {!canEdit && (
            <p role="status" className="text-xs text-muted-foreground">
              Read-only: this catalog is {data.catalog.status}. Outcomes change on a new version — Publish → “Start a
              new version”.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{data.socCodeNote}</p>
        </>
      )}
    </section>
  )
}

export default ProgramOutcomes
