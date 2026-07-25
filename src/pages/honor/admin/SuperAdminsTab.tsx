import { useState } from "react"
import { toast } from "sonner"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { HonorCard, HonorEmptyState } from "../_shared"
import { HONOR_BTN_PRIMARY, fellowName, initials } from "../_format"
import { ADMIN_INPUT, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import {
  useAdminSuperAdmins,
  useCreateSuperAdmin,
  useDeleteSuperAdmin,
} from "@/hooks/honor/useHonorAdmin"

/**
 * Administration › Super-Admins (super-admin only).
 *
 * Add a platform super-admin: first name, last name, email, role = Super Admin
 * (fixed). Provisioning links-or-creates a magic-link login and grants the
 * super-admin platform role + honor entitlement server-side, so the person can
 * sign in with a magic link. Remove demotes them to a regular user (the account
 * is preserved); you cannot remove your own super-admin role.
 */
export function SuperAdminsTab() {
  const { data: admins = [], isLoading, isError } = useAdminSuperAdmins()
  const create = useCreateSuperAdmin()
  const del = useDeleteSuperAdmin()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    create.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase() },
      {
        onSuccess: (a) => {
          toast.success(`${fellowName(a.firstName, a.lastName) || a.email} added as super-admin — they can sign in with a magic link.`)
          setFirstName("")
          setLastName("")
          setEmail("")
        },
        onError: () => toast.error("Couldn't add the super-admin — the admin backend may not be deployed yet."),
      },
    )
  }

  function remove(sub: string, label: string) {
    if (!window.confirm(`Remove super-admin ${label}? This demotes them to a regular user (the account is kept).`)) return
    del.mutate(sub, {
      onSuccess: () => toast.success("Super-admin removed."),
      onError: (err) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(detail || "Couldn't remove the super-admin.")
      },
    })
  }

  return (
    <div className="space-y-6">
      <HonorCard>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <Labeled label="First name" required>
            <input required className={ADMIN_INPUT} placeholder="Gary" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Labeled>
          <Labeled label="Last name" required>
            <input required className={ADMIN_INPUT} placeholder="Burnette" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Labeled>
          <Labeled label="Email" required>
            <input required type="email" className={ADMIN_INPUT} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <Labeled label="Role">
            <input className={ADMIN_INPUT} value="Super Admin" readOnly disabled aria-label="Role" />
          </Labeled>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY} disabled={create.isPending}>
              <ShieldCheck className="h-4 w-4" /> Add super-admin
            </button>
            <span className="text-xs text-[#5b6678]">
              Grants full platform access. They sign in with a magic link — no password needed.
            </span>
          </div>
        </form>
      </HonorCard>

      {isError ? (
        <AdminUnavailable what="Super-Admins" />
      ) : isLoading ? (
        <AdminLoading />
      ) : admins.length === 0 ? (
        <HonorEmptyState>No super-admins listed yet. Add one above.</HonorEmptyState>
      ) : (
        <HonorCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Super-Admin</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const name = fellowName(a.firstName, a.lastName) || a.email
                  return (
                    <tr key={a.sub} className="border-b border-[#f1f3f7] last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(232,121,43,0.15)] text-xs font-bold text-[#B45309]">
                            {initials(name)}
                          </span>
                          <span className="font-medium text-[#18202f]">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5b6678]">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(27,42,74,0.08)] px-2 py-0.5 text-xs font-medium text-[#1B2A4A]">
                          <ShieldCheck className="h-3 w-3" /> Super Admin
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button type="button" className={ICON_BTN_DANGER} onClick={() => remove(a.sub, name)}>
                            <ShieldOff className="h-3.5 w-3.5" /> Remove
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
