import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { HonorCard, HonorEmptyState, HonorPill } from "../_shared"
import { HONOR_BTN_PRIMARY } from "../_format"
import { ADMIN_INPUT, ICON_BTN, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import {
  useCareerAreas,
  useCreateCareerArea,
  useDeleteCareerArea,
  useUpdateCareerArea,
} from "@/hooks/honor/useHonorAdmin"

export function CareerAreasTab() {
  const { data: areas = [], isLoading, isError } = useCareerAreas()
  const create = useCreateCareerArea()
  const update = useUpdateCareerArea()
  const del = useDeleteCareerArea()

  const [name, setName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success(`Career area “${trimmed}” added.`)
          setName("")
        },
        onError: () => toast.error("Couldn't add the career area — the admin backend may not be deployed yet."),
      },
    )
  }

  function saveEdit(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    update.mutate(
      { id, input: { name: trimmed } },
      {
        onSuccess: () => {
          toast.success("Career area renamed.")
          setEditingId(null)
        },
        onError: () => toast.error("Couldn't rename the career area."),
      },
    )
  }

  function toggleActive(id: string, active: boolean) {
    update.mutate(
      { id, input: { active: !active } },
      { onError: () => toast.error("Couldn't update the career area.") },
    )
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Delete career area “${label}”? This cannot be undone.`)) return
    del.mutate(id, {
      onSuccess: () => toast.success("Career area deleted."),
      onError: () => toast.error("Couldn't delete the career area."),
    })
  }

  return (
    <div className="space-y-6">
      <HonorCard>
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
            <label className="block text-sm font-medium text-[#374151]">New career area</label>
            <input
              className={ADMIN_INPUT}
              placeholder="e.g. Cybersecurity"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className={HONOR_BTN_PRIMARY} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Add area
          </button>
        </form>
      </HonorCard>

      {isError ? (
        <AdminUnavailable what="Career areas" />
      ) : isLoading ? (
        <AdminLoading />
      ) : areas.length === 0 ? (
        <HonorEmptyState>No career areas yet. Add one above.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Career area</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => (
                  <tr key={a.id} className="border-b border-[#f1f3f7] last:border-0">
                    <td className="px-4 py-3">
                      {editingId === a.id ? (
                        <input
                          className={ADMIN_INPUT}
                          value={editName}
                          autoFocus
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(a.id)}
                        />
                      ) : (
                        <span className="font-medium text-[#18202f]">{a.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <HonorPill tone={a.active ? "ok" : "gray"}>{a.active ? "Active" : "Inactive"}</HonorPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {editingId === a.id ? (
                          <>
                            <button type="button" className={ICON_BTN} onClick={() => saveEdit(a.id)}>
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button type="button" className={ICON_BTN} onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={ICON_BTN}
                              onClick={() => {
                                setEditingId(a.id)
                                setEditName(a.name)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button type="button" className={ICON_BTN} onClick={() => toggleActive(a.id, a.active)}>
                              {a.active ? "Deactivate" : "Activate"}
                            </button>
                            <button type="button" className={ICON_BTN_DANGER} onClick={() => remove(a.id, a.name)}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}
    </div>
  )
}
