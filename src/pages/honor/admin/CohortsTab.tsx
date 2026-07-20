import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import { HonorCard, HonorEmptyState, HonorPill } from "../_shared"
import { HONOR_BTN_PRIMARY } from "../_format"
import { HONOR_CAREER_AREAS } from "../_careerAreas"
import { ADMIN_INPUT, ICON_BTN, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import { CohortDetailSheet } from "./CohortDetailSheet"
import type { CohortSummary } from "@/types/honor/admin"
import {
  useCareerAreas,
  useCohorts,
  useCreateCohort,
  useDeleteCohort,
  useUpdateCohort,
} from "@/hooks/honor/useHonorAdmin"

type FormState = { id: string | null; name: string; description: string; careerArea: string }
const EMPTY_FORM: FormState = { id: null, name: "", description: "", careerArea: "" }

export function CohortsTab() {
  const { data: cohorts = [], isLoading, isError } = useCohorts()
  const { data: careerAreas = [] } = useCareerAreas()
  const create = useCreateCohort()
  const update = useUpdateCohort()
  const del = useDeleteCohort()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [openCohortId, setOpenCohortId] = useState<string | null>(null)

  // Prefer the live career-area list; fall back to the curated static list so the
  // picker still works before the admin API is deployed.
  const areaOptions = careerAreas.length > 0 ? careerAreas.map((a) => a.name) : [...HONOR_CAREER_AREAS]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const input = {
      name,
      description: form.description.trim() || undefined,
      career_area: form.careerArea.trim() || undefined,
    }
    if (form.id) {
      update.mutate(
        { id: form.id, input },
        {
          onSuccess: () => {
            toast.success("Cohort updated.")
            setForm(EMPTY_FORM)
          },
          onError: () => toast.error("Couldn't update the cohort — the admin backend may not be deployed yet."),
        },
      )
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success(`Cohort “${name}” created.`)
          setForm(EMPTY_FORM)
        },
        onError: () => toast.error("Couldn't create the cohort — the admin backend may not be deployed yet."),
      })
    }
  }

  function edit(c: CohortSummary) {
    setForm({ id: c.id, name: c.name, description: c.description ?? "", careerArea: c.careerArea ?? "" })
  }

  function remove(c: CohortSummary) {
    if (!window.confirm(`Delete cohort “${c.name}”? (soft delete)`)) return
    del.mutate(c.id, {
      onSuccess: () => toast.success("Cohort deleted."),
      onError: () => toast.error("Couldn't delete the cohort."),
    })
  }

  const busy = create.isPending || update.isPending

  return (
    <div className="space-y-6">
      <HonorCard>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">
              Cohort name<span className="ml-0.5 text-[#c0472b]">*</span>
            </label>
            <input
              required
              className={ADMIN_INPUT}
              placeholder="e.g. Cohort 2026-A"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">Career area</label>
            <input
              className={ADMIN_INPUT}
              list="honor-cohort-areas"
              placeholder="Choose or type…"
              value={form.careerArea}
              onChange={(e) => setForm((f) => ({ ...f, careerArea: e.target.value }))}
            />
            <datalist id="honor-cohort-areas">
              {areaOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-[#374151]">Description</label>
            <input
              className={ADMIN_INPUT}
              placeholder="(optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY} disabled={busy}>
              <Plus className="h-4 w-4" /> {form.id ? "Save cohort" : "Create cohort"}
            </button>
            {form.id && (
              <button type="button" className={ICON_BTN} onClick={() => setForm(EMPTY_FORM)}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </HonorCard>

      {isError ? (
        <AdminUnavailable what="Cohorts" />
      ) : isLoading ? (
        <AdminLoading />
      ) : cohorts.length === 0 ? (
        <HonorEmptyState>No cohorts yet. Create one above.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Career area</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Coaches</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f3f7] last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium text-[#1B2A4A] hover:underline"
                        onClick={() => setOpenCohortId(c.id)}
                      >
                        {c.name}
                      </button>
                      {c.description && <div className="text-xs text-[#9299a6]">{c.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.careerArea ? <HonorPill tone="navy">{c.careerArea}</HonorPill> : <span className="text-[#c6cdd9]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#5b6678]">{c.memberCount}</td>
                    <td className="px-4 py-3 text-[#5b6678]">{c.coachCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" className={ICON_BTN} onClick={() => setOpenCohortId(c.id)}>
                          <Users className="h-3.5 w-3.5" /> Manage
                        </button>
                        <button type="button" className={ICON_BTN} onClick={() => edit(c)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button type="button" className={ICON_BTN_DANGER} onClick={() => remove(c)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}

      <CohortDetailSheet cohortId={openCohortId} onClose={() => setOpenCohortId(null)} />
    </div>
  )
}
