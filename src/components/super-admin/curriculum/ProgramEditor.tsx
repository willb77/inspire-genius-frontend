import { useState } from "react"
import { useFieldArray, useForm, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeleteProgram, useSaveProgram } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import { CREDENTIALS, RULES, type Course, type Program, type RequirementGroup } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import { describeGroup } from "./curriculumUi"
import { ProgramOutcomes } from "./ProgramOutcomes"
import { EMPTY_PROGRAM, programSchema, toProgramInput, type ProgramValues } from "./curriculum.schemas"

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const RULE_LABEL: Record<RequirementGroup["rule"], string> = {
  required: "all required",
  choose_n: "choose n",
  min_credits: "minimum credits",
}


function toValues(p: Program): ProgramValues {
  return {
    code: p.code,
    title: p.title,
    credential: (CREDENTIALS as readonly string[]).includes(p.credential)
      ? (p.credential as ProgramValues["credential"])
      : "other",
    totalCredits: String(p.totalCredits),
    cipCode: p.cipCode ?? "",
    description: p.description ?? "",
    requirements: [...p.requirements]
      .sort((a, b) => a.position - b.position)
      .map((g) => ({
        groupName: g.groupName,
        rule: g.rule,
        n: g.n == null ? "" : String(g.n),
        minCredits: g.minCredits == null ? "" : String(g.minCredits),
        courses: [...g.courses],
      })),
  }
}

/** One requirement group's course picks — a checkbox per catalog course. */
function GroupCourses({
  index,
  courses,
  register,
}: {
  index: number
  courses: Course[]
  register: UseFormRegister<ProgramValues>
}) {
  return (
    <fieldset className="max-h-40 overflow-y-auto rounded border p-2">
      <legend className="text-xs font-medium">Courses in this group</legend>
      {courses.length === 0 ? (
        <p className="text-xs text-muted-foreground">This catalog has no courses yet.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {courses.map((c) => (
            <label key={c.code} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" value={c.code} {...register(`requirements.${index}.courses`)} />
              <span className="font-mono">{c.code}</span> {c.title}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function Groups({
  control,
  register,
  courses,
  errors,
}: {
  control: Control<ProgramValues>
  register: UseFormRegister<ProgramValues>
  courses: Course[]
  errors: FieldErrors<ProgramValues>
}) {
  const groups = useFieldArray({ control, name: "requirements" })
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Requirement groups</legend>
      {groups.fields.map((field, i) => {
        const e = errors.requirements?.[i]
        return (
          <div key={field.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={`group-name-${i}`}>Group name</Label>
                <Input id={`group-name-${i}`} {...register(`requirements.${i}.groupName`)} />
              </div>
              <div>
                <Label htmlFor={`group-rule-${i}`}>Rule</Label>
                <select id={`group-rule-${i}`} className={selectClass} {...register(`requirements.${i}.rule`)}>
                  {RULES.map((r) => (
                    <option key={r} value={r}>
                      {RULE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <Label htmlFor={`group-n-${i}`}>n</Label>
                <Input id={`group-n-${i}`} {...register(`requirements.${i}.n`)} />
              </div>
              <div className="w-28">
                <Label htmlFor={`group-min-${i}`}>Min credits</Label>
                <Input id={`group-min-${i}`} {...register(`requirements.${i}.minCredits`)} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove group ${i + 1}`}
                onClick={() => groups.remove(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <GroupCourses index={i} courses={courses} register={register} />
            {e && (
              <p className="text-xs text-red-600">
                {e.groupName?.message ?? e.n?.message ?? e.minCredits?.message ?? e.courses?.message}
              </p>
            )}
          </div>
        )
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => groups.append({ groupName: "", rule: "required", n: "", minCredits: "", courses: [] })}
      >
        Add requirement group
      </Button>
    </fieldset>
  )
}

/**
 * Programs of one catalog and their requirement groups. Group courses are
 * picked from the catalog; the server reports credit totals, and refuses an
 * unknown code (422) or a loop (409) — both rendered as they come back.
 *
 * Program outcomes (CUR-3) open per program from the list's Outcomes button,
 * outside the program form (a form cannot hold another form), on every
 * catalog status — editable on a draft, read-only otherwise.
 */
export function ProgramEditor({
  catalogId,
  programs,
  courses,
  editable,
}: {
  catalogId: string
  programs: Program[]
  courses: Course[]
  editable: boolean
}) {
  const save = useSaveProgram(catalogId)
  const remove = useDeleteProgram(catalogId)
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saveError, setSaveError] = useState<CurriculumError | null>(null)
  const [deleteError, setDeleteError] = useState<CurriculumError | null>(null)
  const [outcomesFor, setOutcomesFor] = useState<string | null>(null)
  const outcomesProgram = programs.find((p) => p.id && p.id === outcomesFor) ?? null

  const form = useForm<ProgramValues>({ resolver: zodResolver(programSchema), defaultValues: EMPTY_PROGRAM })
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = form

  const open = (p: Program | null) => {
    reset(p ? toValues(p) : EMPTY_PROGRAM)
    setEditing(p?.code ?? null)
    setSaveError(null)
    setFormOpen(true)
  }
  const close = () => {
    setFormOpen(false)
    setEditing(null)
    setSaveError(null)
  }

  const onSubmit = handleSubmit((values) => {
    setSaveError(null)
    save.mutate(toProgramInput(values), {
      onSuccess: (program) => {
        toast.success(`Saved ${program.code}.`)
        close()
      },
      onError: (err) => setSaveError(curriculumError(err, "The program was not saved.")),
    })
  })

  const onDelete = (code: string) => {
    setDeleteError(null)
    remove.mutate(code, {
      onSuccess: () => toast.success(`Removed ${code}.`),
      onError: (err) => setDeleteError(curriculumError(err, `${code} was not removed.`)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{programs.length} programs</p>
        {editable && !formOpen && (
          <Button size="sm" onClick={() => open(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add program
          </Button>
        )}
      </div>

      {deleteError && <CurriculumErrorPanel error={deleteError} />}

      {formOpen && editable && (
        <form onSubmit={onSubmit} aria-label="Program form" className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="program-code">Program code</Label>
              <Input id="program-code" {...register("code")} disabled={editing !== null} />
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="program-title">Title</Label>
              <Input id="program-title" {...register("title")} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="program-credential">Credential</Label>
              <select id="program-credential" className={selectClass} {...register("credential")}>
                {CREDENTIALS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="program-total">Total credits</Label>
              <Input id="program-total" inputMode="decimal" {...register("totalCredits")} />
              {errors.totalCredits && <p className="text-xs text-red-600">{errors.totalCredits.message}</p>}
            </div>
            <div>
              <Label htmlFor="program-cip">CIP code</Label>
              <Input id="program-cip" {...register("cipCode")} />
            </div>
          </div>
          <div>
            <Label htmlFor="program-description">Description</Label>
            <Textarea id="program-description" rows={2} {...register("description")} />
          </div>

          <Groups control={control} register={register} courses={courses} errors={errors} />

          <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">
            Career outcomes (role family, linked role, SOC / O*NET code) are set per program with the
            Outcomes button in the program list{editing ? "" : ", once the program is saved"}.
          </p>

          {saveError && <CurriculumErrorPanel error={saveError} />}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              {editing ? "Save program" : "Add program"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {programs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No programs in this catalog yet{editable ? " — add one, or import a CSV." : "."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Credential</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Requirement groups</TableHead>
              <TableHead>Outcomes</TableHead>
              {editable && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.code}>
                <TableCell className="font-mono">{p.code}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.credential}</TableCell>
                <TableCell>{p.totalCredits}</TableCell>
                <TableCell>
                  {p.requirements.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="space-y-0.5 text-xs">
                      {p.requirements.map((g) => (
                        <li key={g.groupName}>{describeGroup(g)}</li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={p.id && p.id === outcomesFor ? "secondary" : "outline"}
                    aria-label={`Outcomes for ${p.code}`}
                    disabled={!p.id}
                    onClick={() => setOutcomesFor(p.id && p.id !== outcomesFor ? p.id : null)}
                  >
                    {p.outcomes?.length ?? 0}
                  </Button>
                </TableCell>
                {editable && (
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label={`Edit ${p.code}`} onClick={() => open(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${p.code}`}
                      onClick={() => onDelete(p.code)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {outcomesProgram?.id && (
        <ProgramOutcomes
          key={outcomesProgram.id}
          catalogId={catalogId}
          program={{ id: outcomesProgram.id, code: outcomesProgram.code, title: outcomesProgram.title }}
          editable={editable}
          onClose={() => setOutcomesFor(null)}
        />
      )}
    </div>
  )
}

export default ProgramEditor
