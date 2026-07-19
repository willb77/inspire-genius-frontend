import { toast } from "sonner"
import { Settings2, UserPlus, Upload, Mail, Pencil } from "lucide-react"
import { useCoaches, useTeams } from "@/hooks/honor/useCoachData"
import { HonorCard, HonorEmptyState, HonorPageHeader, HonorPill, HonorSectionTitle } from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, initials } from "./_format"

/**
 * Honor Coach Workbench — Administration (coach & team management).
 *
 * Wiring target: coaches live in `user_profiles` (manager/practitioner role,
 * user-service); invites go through invitation-service (SES magic-link); team
 * assignment writes `coach_team_assignments` (net-new). CSV roster import reuses
 * `roster_import.py`. Mock-backed via {@link useCoaches} / {@link useTeams}.
 */

const inputCls =
  "w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"

export default function HonorAdministration() {
  const { data: coaches = [] } = useCoaches()
  const { data: teams = [] } = useTeams()

  function onAddCoach(e: React.FormEvent) {
    e.preventDefault()
    toast.success("Coach created in user_profiles + invite queued via invitation-service (scaffold stub)")
  }

  return (
    <div>
      <HonorPageHeader
        icon={Settings2}
        title="Administration"
        description="Manage coaches, assign them to cohorts, and import rosters."
      />

      {/* Add a coach */}
      <HonorCard className="mb-6">
        <HonorSectionTitle>Add a coach</HonorSectionTitle>
        <form onSubmit={onAddCoach} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">First name<span className="ml-0.5 text-[#c0472b]">*</span></label>
            <input required className={inputCls} placeholder="Jordan" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">Last name<span className="ml-0.5 text-[#c0472b]">*</span></label>
            <input required className={inputCls} placeholder="Morales" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">Email<span className="ml-0.5 text-[#c0472b]">*</span></label>
            <input required type="email" className={inputCls} placeholder="j.morales@honor.org" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#374151]">Phone</label>
            <input className={inputCls} placeholder="(optional)" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-[#374151]">Assign to team</label>
            <select className={inputCls} defaultValue="">
              <option value="" disabled>
                Choose a cohort…
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" className={HONOR_BTN_PRIMARY}>
              <UserPlus className="h-4 w-4" /> Add coach &amp; send invite
            </button>
            <button type="button" className={HONOR_BTN_OUTLINE}>
              Save draft
            </button>
          </div>
        </form>
      </HonorCard>

      {/* Coaches table */}
      <HonorSectionTitle
        action={
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            onClick={() => toast.info("CSV roster import — column mapping preview (scaffold stub)")}
          >
            <Upload className="h-4 w-4" /> Import roster CSV
          </button>
        }
      >
        Coaches
      </HonorSectionTitle>
      {coaches.length === 0 ? (
        <HonorEmptyState>No coaches yet.</HonorEmptyState>
      ) : (
        <HonorCard className="mb-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#dfe4ec] text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="px-4 py-3">Coach</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teams</th>
                  <th className="px-4 py-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f3f7] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(27,42,74,0.10)] text-xs font-bold text-[#1B2A4A]">
                          {initials(c.name)}
                        </span>
                        <div>
                          <div className="font-medium text-[#18202f]">{c.name}</div>
                          <div className="text-xs text-[#9299a6]">{c.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#5b6678]">{c.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(c.teams ?? []).map((t) => (
                          <HonorPill key={t} tone="navy">
                            {t}
                          </HonorPill>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#5b6678] hover:bg-[#f6f7f9]"
                          onClick={() => toast.info("Wireframe stub — edit coach")}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#E8792B] hover:bg-[rgba(232,121,43,0.1)]"
                          onClick={() => toast.info("Invite re-sent via invitation-service (stub)")}
                        >
                          <Mail className="h-3.5 w-3.5" /> Invite
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

      {/* Teams */}
      <HonorSectionTitle>Teams &amp; cohorts</HonorSectionTitle>
      {teams.length === 0 ? (
        <HonorEmptyState>No teams or cohorts yet.</HonorEmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {teams.map((t) => (
            <HonorCard key={t.id}>
              <div className="text-sm font-semibold text-[#18202f]">{t.name}</div>
              <div className="mt-1 text-2xl font-bold text-[#1B2A4A]">{t.memberCount}</div>
              <div className="text-xs text-[#9299a6]">assigned fellows</div>
            </HonorCard>
          ))}
        </div>
      )}
    </div>
  )
}
