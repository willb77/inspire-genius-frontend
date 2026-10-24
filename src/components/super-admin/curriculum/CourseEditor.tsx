import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeleteCourse, useSaveCourse } from "@/hooks/curriculum/useCurriculumAdmin"
import { formatRequisites } from "@/lib/curriculum/prerequisites"
import { curriculumError, type CurriculumError } from "@/services/curriculum/curriculumErrors"
import { TERMS, type Course } from "@/types/curriculum"
import { CurriculumErrorPanel } from "./CurriculumReportView"
import {
  courseSchema,
  EMPTY_COURSE,
  toCourseInput,
  type CourseValues,
} from "./curriculum.schemas"

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function toValues(c: Course): CourseValues {
  return {
    code: c.code,
    title: c.title,
    credits: String(c.credits),
    description: c.description ?? "",
    termsOffered: c.termsOffered.filter((t): t is (typeof TERMS)[number] =>
      (TERMS as readonly string[]).includes(t)
    ),
    prerequisites: c.prerequisites.map((p) => ({
      code: p.code,
      kind: p.kind,
      altGroup: String(p.altGroup),
      minGrade: p.minGrade ?? "",
    })),
  }
}

/**
 * Courses of one catalog, each with its prerequisites — picked from this
 * catalog's own courses, never typed. A loop is refused by the server (409)
 * and its named chain is shown as it comes back.
 */
export function CourseEditor({
  catalogId,
  courses,
  editable,
}: {
  catalogId: string
  courses: Course[]
  editable: boolean
}) {
  const save = useSaveCourse(catalogId)
  const remove = useDeleteCourse(catalogId)
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saveError, setSaveError] = useState<CurriculumError | null>(null)
  const [deleteError, setDeleteError] = useState<CurriculumError | null>(null)

  const form = useForm<CourseValues>({ resolver: zodResolver(courseSchema), defaultValues: EMPTY_COURSE })
  const prereqs = useFieldArray({ control: form.control, name: "prerequisites" })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form

  const codeNow = form.watch("code").trim().toUpperCase()
  const pickable = courses.filter((c) => c.code !== codeNow)

  const openNew = () => {
    reset(EMPTY_COURSE)
    setEditing(null)
    setSaveError(null)
    setFormOpen(true)
  }
  const openEdit = (c: Course) => {
    reset(toValues(c))
    setEditing(c.code)
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
    save.mutate(toCourseInput(values), {
      onSuccess: (course) => {
        toast.success(`Saved ${course.code}.`)
        close()
      },
      onError: (err) => setSaveError(curriculumError(err, "The course was not saved.")),
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
        <p className="text-sm text-muted-foreground">{courses.length} courses</p>
        {editable && !formOpen && (
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add course
          </Button>
        )}
      </div>

      {deleteError && <CurriculumErrorPanel error={deleteError} />}

      {formOpen && editable && (
        <form onSubmit={onSubmit} aria-label="Course form" className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="course-code">Course code</Label>
              <Input id="course-code" {...register("code")} disabled={editing !== null} />
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="course-title">Title</Label>
              <Input id="course-title" {...register("title")} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="course-credits">Credits</Label>
              <Input id="course-credits" inputMode="decimal" {...register("credits")} />
              {errors.credits && <p className="text-xs text-red-600">{errors.credits.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="course-description">Description</Label>
            <Textarea id="course-description" rows={2} {...register("description")} />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Terms offered</legend>
            <div className="flex gap-4">
              {TERMS.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" value={t} {...register("termsOffered")} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Prerequisites</legend>
            <p className="text-xs text-muted-foreground">
              Picked from this catalog. Rows with the same alternative group are alternatives (“A or B”);
              leave it blank for “required on its own”.
            </p>
            {prereqs.fields.map((field, i) => (
              <div key={field.id} className="flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor={`req-code-${i}`}>Course</Label>
                  <select id={`req-code-${i}`} className={selectClass} {...register(`prerequisites.${i}.code`)}>
                    <option value="">Choose…</option>
                    {pickable.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`req-kind-${i}`}>Kind</Label>
                  <select id={`req-kind-${i}`} className={selectClass} {...register(`prerequisites.${i}.kind`)}>
                    <option value="prereq">prerequisite</option>
                    <option value="coreq">corequisite</option>
                  </select>
                </div>
                <div className="w-28">
                  <Label htmlFor={`req-alt-${i}`}>Alternative group</Label>
                  <Input id={`req-alt-${i}`} {...register(`prerequisites.${i}.altGroup`)} />
                </div>
                <div className="w-24">
                  <Label htmlFor={`req-grade-${i}`}>Min grade</Label>
                  <Input id={`req-grade-${i}`} {...register(`prerequisites.${i}.minGrade`)} />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove prerequisite ${i + 1}`}
                  onClick={() => prereqs.remove(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {errors.prerequisites?.[i] && (
                  <p className="w-full text-xs text-red-600">
                    {errors.prerequisites[i]?.code?.message ??
                      errors.prerequisites[i]?.altGroup?.message ??
                      errors.prerequisites[i]?.minGrade?.message}
                  </p>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => prereqs.append({ code: "", kind: "prereq", altGroup: "", minGrade: "" })}
              disabled={pickable.length === 0}
            >
              Add prerequisite
            </Button>
            {pickable.length === 0 && (
              <p className="text-xs text-muted-foreground">Add another course to this catalog first.</p>
            )}
          </fieldset>

          {saveError && <CurriculumErrorPanel error={saveError} />}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              {editing ? "Save course" : "Add course"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {courses.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No courses in this catalog yet{editable ? " — add one, or import a CSV." : "."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Requires</TableHead>
              {editable && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.code}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.credits}</TableCell>
                <TableCell>{c.termsOffered.join(", ") || "—"}</TableCell>
                <TableCell>{formatRequisites(c.prerequisites)}</TableCell>
                {editable && (
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${c.code}`}
                      onClick={() => onDelete(c.code)}
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
    </div>
  )
}

export default CourseEditor
