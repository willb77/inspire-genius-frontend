import { useState } from "react"
import { toast } from "sonner"
import { UserPlus, Upload, Trash2 } from "lucide-react"
import { HonorCard, HonorEmptyState } from "../_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName, initials } from "../_format"
import { ADMIN_INPUT, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import { ImportModal } from "./ImportModal"
import type { ImportRecord } from "./importFile"
import {
  useAdminCoaches,
  useCreateCoach,
  useDeleteCoach,
  useImportCoaches,
} from "@/hooks/honor/useHonorAdmin"

export function CoachesTab() {
  const { data: coaches = [], isLoading, isError } = useAdminCoaches()
  const create = useCreateCoach()
  const del = useDeleteCoach()
  const importCoaches = useImportCoaches()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("coach")
  const [importOpen, setImportOpen] = useState(false)

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    create.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Coach added.")
          setFirstName("")
          setLastName("")
          setEmail("")
          setRole("coach")
        },
        onError: () => toast.error("Couldn't add the coach — the admin backend may not be deployed yet."),
      },
    )
  }

  function remove(sub: string, label: string) {
    if (!window.confirm(`Remove coach ${label}?`)) return
    del.mutate(sub, {
      onSuccess: () => toast.success("Coach removed."),
      onError: () => toast.error("Couldn't remove the coach."),
    })
  }

  return (
    <div className="space-y-6">
      <HonorCard>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <Labeled label="First name" required>
            <input required className={ADMIN_INPUT} placeholder="Jordan" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Labeled>
          <Labeled label="Last name" required>
            <input required className={ADMIN_INPUT} placeholder="Morales" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Labeled>
          <Labeled label="Email" required>
            <input required type="email" className={ADMIN_INPUT} placeholder="j.morales@honor.org" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <Labeled label="Role">
            <input className={ADMIN_INPUT} placeholder="coach" value={role} onChange={(e) => setRole(e.target.value)} />
          </Labeled>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY} disabled={create.isPending}>
              <UserPlus className="h-4 w-4" /> Add coach
            </button>
            <button type="button" className={HONOR_BTN_OUTLINE} onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Bulk import
            </button>
          </div>
        </form>
      </HonorCard>

      {isError ? (
        <AdminUnavailable what="Coaches" />
      ) : isLoading ? (
        <AdminLoading />
      ) : coaches.length === 0 ? (
        <HonorEmptyState>No coaches yet. Add one above or bulk-import a roster.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Coach</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => {
                  const name = fellowName(c.firstName, c.lastName) || c.email
                  return (
                    <tr key={c.sub} className="border-b border-[#f1f3f7] last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(27,42,74,0.10)] text-xs font-bold text-[#1B2A4A]">
                            {initials(name)}
                          </span>
                          <span className="font-medium text-[#18202f]">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5b6678]">{c.email}</td>
                      <td className="px-4 py-3 text-[#5b6678]">{c.role}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button type="button" className={ICON_BTN_DANGER} onClick={() => remove(c.sub, name)}>
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
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
        kind="coach"
        isPending={importCoaches.isPending}
        onImport={(rows: ImportRecord[]) => importCoaches.mutateAsync(rows)}
      />
    </div>
  )
}

function Labeled({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#374151]">
        {label}
        {required && <span className="ml-0.5 text-[#c0472b]">*</span>}
      </label>
      {children}
    </div>
  )
}
