import { useState } from "react"
import { toast } from "sonner"
import { X, UserPlus, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { HonorPill } from "../_shared"
import { fellowName } from "../_format"
import { ADMIN_INPUT, ICON_BTN_DANGER } from "./_adminStyles"
import { AdminLoading, AdminUnavailable } from "./_adminUi"
import {
  useAdminCoaches,
  useAdminFellows,
  useAssignCoach,
  useAssignFellow,
  useCohort,
  useUnassignCoach,
  useUnassignFellow,
} from "@/hooks/honor/useHonorAdmin"

/** Slide-over panel: view a cohort and assign/remove its fellows and coaches. */
export function CohortDetailSheet({
  cohortId,
  onClose,
}: {
  cohortId: string | null
  onClose: () => void
}) {
  const open = !!cohortId
  const { data: cohort, isLoading, isError } = useCohort(cohortId ?? undefined)
  const { data: allFellows = [] } = useAdminFellows({ enabled: open })
  const { data: allCoaches = [] } = useAdminCoaches({ enabled: open })

  const assignFellow = useAssignFellow()
  const unassignFellow = useUnassignFellow()
  const assignCoach = useAssignCoach()
  const unassignCoach = useUnassignCoach()

  const [fellowPick, setFellowPick] = useState("")
  const [coachPick, setCoachPick] = useState("")

  const assignedFellowIds = new Set((cohort?.members ?? []).map((m) => m.id))
  const assignedCoachSubs = new Set((cohort?.coaches ?? []).map((c) => c.sub))
  const availableFellows = allFellows.filter((f) => !assignedFellowIds.has(f.id))
  const availableCoaches = allCoaches.filter((c) => !assignedCoachSubs.has(c.sub))

  function addFellow() {
    if (!cohortId || !fellowPick) return
    assignFellow.mutate(
      { cohortId, fellowId: fellowPick },
      {
        onSuccess: () => {
          toast.success("Fellow assigned.")
          setFellowPick("")
        },
        onError: () => toast.error("Couldn't assign the fellow."),
      },
    )
  }

  function addCoach() {
    if (!cohortId || !coachPick) return
    assignCoach.mutate(
      { cohortId, coachSub: coachPick },
      {
        onSuccess: () => {
          toast.success("Coach assigned.")
          setCoachPick("")
        },
        onError: () => toast.error("Couldn't assign the coach."),
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{cohort?.name ?? "Cohort"}</SheetTitle>
          <SheetDescription>
            {cohort?.careerArea ? `${cohort.careerArea} · ` : ""}
            Assign or remove fellows and coaches.
          </SheetDescription>
        </SheetHeader>

        {isError ? (
          <div className="mt-4">
            <AdminUnavailable what="Cohort detail" />
          </div>
        ) : isLoading || !cohort ? (
          <div className="mt-4">
            <AdminLoading />
          </div>
        ) : (
          <div className="mt-5 space-y-7">
            {cohort.description && <p className="text-sm text-[#5b6678]">{cohort.description}</p>}

            {/* Fellows */}
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#18202f]">
                <Users className="h-4 w-4 text-[#1B2A4A]" /> Fellows ({cohort.members.length})
              </div>
              <div className="mb-3 flex gap-2">
                <select className={ADMIN_INPUT} value={fellowPick} onChange={(e) => setFellowPick(e.target.value)} aria-label="Assign fellow">
                  <option value="">Assign a fellow…</option>
                  {availableFellows.map((f) => (
                    <option key={f.id} value={f.id}>
                      {fellowName(f.firstName, f.lastName) || f.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E8792B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c9631a] disabled:opacity-50"
                  onClick={addFellow}
                  disabled={!fellowPick || assignFellow.isPending}
                >
                  <UserPlus className="h-4 w-4" /> Add
                </button>
              </div>
              {cohort.members.length === 0 ? (
                <p className="text-sm text-[#9299a6]">No fellows assigned yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {cohort.members.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-lg border border-[#eef1f4] px-3 py-2">
                      <span className="text-sm text-[#18202f]">{fellowName(f.firstName, f.lastName) || f.email}</span>
                      <button
                        type="button"
                        className={ICON_BTN_DANGER}
                        onClick={() => cohortId && unassignFellow.mutate({ cohortId, fellowId: f.id })}
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Coaches */}
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#18202f]">
                <Users className="h-4 w-4 text-[#E8792B]" /> Coaches ({cohort.coaches.length})
              </div>
              <div className="mb-3 flex gap-2">
                <select className={ADMIN_INPUT} value={coachPick} onChange={(e) => setCoachPick(e.target.value)} aria-label="Assign coach">
                  <option value="">Assign a coach…</option>
                  {availableCoaches.map((c) => (
                    <option key={c.sub} value={c.sub}>
                      {fellowName(c.firstName, c.lastName) || c.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1B2A4A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#22345c] disabled:opacity-50"
                  onClick={addCoach}
                  disabled={!coachPick || assignCoach.isPending}
                >
                  <UserPlus className="h-4 w-4" /> Add
                </button>
              </div>
              {cohort.coaches.length === 0 ? (
                <p className="text-sm text-[#9299a6]">No coaches assigned yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {cohort.coaches.map((c) => (
                    <li key={c.sub} className="flex items-center justify-between rounded-lg border border-[#eef1f4] px-3 py-2">
                      <span className="text-sm text-[#18202f]">
                        {fellowName(c.firstName, c.lastName) || c.email} <HonorPill tone="orange">{c.role}</HonorPill>
                      </span>
                      <button
                        type="button"
                        className={ICON_BTN_DANGER}
                        onClick={() => cohortId && unassignCoach.mutate({ cohortId, coachSub: c.sub })}
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
