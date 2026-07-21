import { useState } from "react"
import { toast } from "sonner"
import { Upload, Pencil, Trash2, Check, X } from "lucide-react"
import { HonorCard, HonorEmptyState, HonorSectionTitle } from "../_shared"
import { HONOR_BTN_OUTLINE, fellowName, fellowStatusLabel, initials } from "../_format"
import { ADMIN_INPUT, ICON_BTN, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import { ImportModal } from "./ImportModal"
import type { ImportRecord } from "./importFile"
import type { AdminCoach, AdminFellow, AdminFellowCoach } from "@/types/honor/admin"
import {
  useAdminCoaches,
  useAdminFellows,
  useAssignFellowCoach,
  useDeleteFellow,
  useImportFellows,
  useUnassignFellowCoach,
  useUpdateFellow,
} from "@/hooks/honor/useHonorAdmin"

/** Display label for a coach embedded in a fellow row. */
function coachLabel(c: AdminFellowCoach): string {
  return c.name || c.email || c.sub
}

/** Display label for a pickable coach from the coaches roster. */
function pickCoachLabel(c: AdminCoach): string {
  return fellowName(c.firstName, c.lastName) || c.email
}

export function FellowsTab() {
  const { data: fellows = [], isLoading, isError } = useAdminFellows()
  // Read-safe: if the coaches roster errors, the picker degrades to empty; the
  // fellows table (and each fellow's embedded coaches) still render.
  const { data: allCoaches = [] } = useAdminCoaches()
  const update = useUpdateFellow()
  const del = useDeleteFellow()
  const importFellows = useImportFellows()
  const assignCoach = useAssignFellowCoach()
  const unassignCoach = useUnassignFellowCoach()

  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ firstName: string; lastName: string; email: string; cohort: string }>({
    firstName: "",
    lastName: "",
    email: "",
    cohort: "",
  })

  function startEdit(f: AdminFellow) {
    setEditingId(f.id)
    setDraft({ firstName: f.firstName, lastName: f.lastName, email: f.email, cohort: f.cohort })
  }

  function saveEdit(id: string) {
    update.mutate(
      {
        id,
        input: {
          first_name: draft.firstName.trim(),
          last_name: draft.lastName.trim(),
          email: draft.email.trim().toLowerCase(),
          cohort: draft.cohort.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Fellow updated.")
          setEditingId(null)
        },
        onError: () => toast.error("Couldn't update the fellow — the admin backend may not be deployed yet."),
      },
    )
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Remove fellow ${label}? (soft delete)`)) return
    del.mutate(id, {
      onSuccess: () => toast.success("Fellow removed."),
      onError: () => toast.error("Couldn't remove the fellow."),
    })
  }

  function addCoach(fellowId: string, coachSub: string) {
    if (!coachSub) return
    assignCoach.mutate(
      { fellowId, coachSub },
      {
        onSuccess: () => toast.success("Coach assigned."),
        onError: () => toast.error("Couldn't assign the coach — the admin backend may not be deployed yet."),
      },
    )
  }

  function removeCoach(fellowId: string, coach: AdminFellowCoach) {
    unassignCoach.mutate(
      { fellowId, coachSub: coach.sub },
      {
        onSuccess: () => toast.success("Coach unassigned."),
        onError: () => toast.error("Couldn't unassign the coach."),
      },
    )
  }

  return (
    <div className="space-y-4">
      <HonorSectionTitle
        action={
          <button type="button" className={HONOR_BTN_OUTLINE} onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk import
          </button>
        }
      >
        All fellows
      </HonorSectionTitle>

      {isError ? (
        <AdminUnavailable what="Fellows" />
      ) : isLoading ? (
        <AdminLoading />
      ) : fellows.length === 0 ? (
        <HonorEmptyState>No fellows yet. Onboard one, or bulk-import a cohort roster.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Fellow</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Coach(es)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fellows.map((f) => {
                  const name = fellowName(f.firstName, f.lastName) || f.email
                  const editing = editingId === f.id
                  const coaches = f.coaches ?? []
                  const assignedSubs = new Set(coaches.map((c) => c.sub))
                  const availableCoaches = allCoaches.filter((c) => !assignedSubs.has(c.sub))
                  return (
                    <tr key={f.id} className="border-b border-[#f1f3f7] last:border-0 align-top">
                      <td className="px-4 py-3">
                        {editing ? (
                          <div className="flex gap-2">
                            <input
                              className={ADMIN_INPUT}
                              value={draft.firstName}
                              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                              aria-label="First name"
                            />
                            <input
                              className={ADMIN_INPUT}
                              value={draft.lastName}
                              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                              aria-label="Last name"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(27,42,74,0.10)] text-xs font-bold text-[#1B2A4A]">
                              {initials(name)}
                            </span>
                            <span className="font-medium text-[#18202f]">{name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#5b6678]">
                        {editing ? (
                          <input
                            className={ADMIN_INPUT}
                            value={draft.email}
                            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                            aria-label="Email"
                          />
                        ) : (
                          f.email
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#5b6678]">
                        {editing ? (
                          <input
                            className={ADMIN_INPUT}
                            value={draft.cohort}
                            onChange={(e) => setDraft((d) => ({ ...d, cohort: e.target.value }))}
                            aria-label="Cohort"
                          />
                        ) : (
                          f.cohort || "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[16rem] flex-col gap-2">
                          {coaches.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {coaches.map((c) => (
                                <span
                                  key={c.sub}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#dfe4ec] bg-[#f6f7f9] py-0.5 pl-2 pr-1 text-xs text-[#18202f]"
                                  title={c.email || undefined}
                                >
                                  {coachLabel(c)}
                                  <button
                                    type="button"
                                    className="grid h-4 w-4 place-items-center rounded-full text-[#8a94a6] hover:bg-[rgba(192,71,43,0.12)] hover:text-[#c0472b] disabled:opacity-50"
                                    aria-label={`Unassign ${coachLabel(c)}`}
                                    onClick={() => removeCoach(f.id, c)}
                                    disabled={unassignCoach.isPending}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <select
                            className={ADMIN_INPUT}
                            value=""
                            aria-label={`Assign coach to ${name}`}
                            disabled={assignCoach.isPending || availableCoaches.length === 0}
                            onChange={(e) => {
                              addCoach(f.id, e.target.value)
                              e.target.value = ""
                            }}
                          >
                            <option value="">
                              {availableCoaches.length === 0 ? "All coaches assigned" : "Assign coach…"}
                            </option>
                            {availableCoaches.map((c) => (
                              <option key={c.sub} value={c.sub}>
                                {pickCoachLabel(c)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5b6678]">{fellowStatusLabel(f.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {editing ? (
                            <>
                              <button type="button" className={ICON_BTN} onClick={() => saveEdit(f.id)}>
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                              <button type="button" className={ICON_BTN} onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className={ICON_BTN} onClick={() => startEdit(f)}>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button type="button" className={ICON_BTN_DANGER} onClick={() => remove(f.id, name)}>
                                <Trash2 className="h-3.5 w-3.5" /> Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="fellow"
        isPending={importFellows.isPending}
        onImport={(rows: ImportRecord[]) => importFellows.mutateAsync(rows)}
      />
    </div>
  )
}
