import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { toast } from "sonner"
import {
  CheckCircle2,
  Loader2,
  MailPlus,
  MinusCircle,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ROUTES } from "@/constants/routes"
import {
  useCoachRoster,
  useCreateStudent,
  useInviteStudent,
  useRemoveStudent,
} from "@/hooks/grant/useCoachRoster"
import type { CoachStudent, CoachStudentStatus } from "@/types/grant/coach"
import { formatDate } from "../_format"
import { GrantCard, GrantEmptyState, GrantMeter, GrantPageHeader, GrantPill } from "../_shared"
import { CsvImportModal } from "./CsvImportModal"

/** Status → GrantPill tone + label. */
function StatusBadge({ status }: { status: CoachStudentStatus }) {
  if (status === "linked") return <GrantPill tone="green">Linked</GrantPill>
  if (status === "invited") return <GrantPill tone="amber">Invited</GrantPill>
  return <GrantPill tone="gray">Managed</GrantPill>
}

export default function RosterPage() {
  const navigate = useNavigate()
  const { data: students = [], isLoading } = useCoachRoster()
  const inviteMutation = useInviteStudent()
  const removeMutation = useRemoveStudent()

  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<CoachStudent | null>(null)
  const [removeTarget, setRemoveTarget] = useState<CoachStudent | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => s.fullName.toLowerCase().includes(q))
  }, [students, query])

  function openStudent(student: CoachStudent) {
    navigate(ROUTES.GRANT.coachStudentIntake(student.id))
  }

  function confirmInvite() {
    if (!inviteTarget) return
    const target = inviteTarget
    inviteMutation.mutate(target.id, {
      onSuccess: (res) =>
        res.status === "noop"
          ? toast.error(res.message)
          : toast.success(`Invitation sent to ${target.fullName}`),
      onError: () => toast.error("Couldn't send the invitation. Please try again."),
    })
    setInviteTarget(null)
  }

  function confirmRemove() {
    if (!removeTarget) return
    const target = removeTarget
    removeMutation.mutate(target.id, {
      onSuccess: () => toast.success(`Removed ${target.fullName} from your roster`),
      onError: () => toast.error("Couldn't remove this student. Please try again."),
    })
    setRemoveTarget(null)
  }

  return (
    <div className="max-w-5xl">
      <GrantPageHeader
        icon={Users}
        title="My Students"
        description="Import and manage the students you're building aid profiles for, then convert them into their own Inspire Genius login."
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            aria-label="Search students"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="gap-2 bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add student
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Users className="h-4 w-4" /> Import CSV
        </Button>
      </div>

      {isLoading ? (
        <GrantEmptyState>Loading your roster…</GrantEmptyState>
      ) : students.length === 0 ? (
        <GrantEmptyState>
          <p className="mb-3 font-medium text-[#6b7280]">No students yet</p>
          <p className="mb-4 text-sm">Add a student or import a roster to get started.</p>
          <div className="flex justify-center gap-2">
            <Button className="gap-2 bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add student
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Users className="h-4 w-4" /> Import CSV
            </Button>
          </div>
        </GrantEmptyState>
      ) : filtered.length === 0 ? (
        <GrantEmptyState>No students match “{query}”.</GrantEmptyState>
      ) : (
        <GrantCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-48">Completeness</th>
                  <th className="px-4 py-3">Ready</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openStudent(s)}
                        className="text-left font-medium text-[#1f2937] hover:text-[#3B5BFF]"
                      >
                        {s.fullName}
                      </button>
                      <div className="text-xs text-[#9ca3af]">
                        {[s.stateOfResidence, s.gradeLevel].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <GrantMeter
                        value={s.completeness}
                        tone={s.completeness >= 100 ? "green" : "blue"}
                        right={`${s.completeness}%`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {s.readyToSearch ? (
                        <span className="inline-flex items-center gap-1 text-[#0f766e]">
                          <CheckCircle2 className="h-4 w-4" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#9ca3af]">
                          <MinusCircle className="h-4 w-4" /> Not yet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDate(s.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openStudent(s)}>
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-[#3B5BFF] hover:bg-[rgba(59,91,255,0.08)] hover:text-[#3B5BFF]"
                          disabled={!s.email || s.status !== "managed"}
                          title={
                            !s.email
                              ? "Add an email to invite this student"
                              : s.status !== "managed"
                                ? "Already invited"
                                : "Invite to Inspire Genius"
                          }
                          onClick={() => setInviteTarget(s)}
                        >
                          <MailPlus className="h-4 w-4" /> Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove ${s.fullName}`}
                          className="text-[#9ca3af] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#b91c1c]"
                          onClick={() => setRemoveTarget(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GrantCard>
      )}

      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} />
      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />

      {/* Invite confirmation */}
      <AlertDialog
        open={inviteTarget !== null}
        onOpenChange={(o) => !o && setInviteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invite {inviteTarget?.fullName} to Inspire Genius?</AlertDialogTitle>
            <AlertDialogDescription>
              We&apos;ll email {inviteTarget?.email} a secure set-password / magic link so they can
              sign in and take over their own aid profile. You keep co-access and can still open
              their profile from this roster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3B5BFF] hover:bg-[#2f49cc]"
              onClick={confirmInvite}
            >
              Send invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the student from your roster. Their profile data is not deleted if they
              already have their own linked login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#b91c1c] hover:bg-[#991b1b]"
              onClick={confirmRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Add-student dialog ───────────────────────────────────────────────────────

const addStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.union([z.string().email("Enter a valid email"), z.literal("")]).optional(),
  state: z.string().optional(),
  gradeLevel: z.string().optional(),
})

type AddStudentValues = z.infer<typeof addStudentSchema>

function AddStudentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateStudent()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddStudentValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: { firstName: "", lastName: "", email: "", state: "", gradeLevel: "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function onSubmit(values: AddStudentValues) {
    createMutation.mutate(
      {
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        email: values.email?.trim() || undefined,
        state: values.state?.trim() || undefined,
        gradeLevel: values.gradeLevel?.trim() || undefined,
      },
      {
        onSuccess: (student) => {
          toast.success(`Added ${student.fullName}`)
          reset()
          onOpenChange(false)
        },
        onError: () => toast.error("Couldn't add the student. Please try again."),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            Create a managed profile. You can open it to complete the aid questionnaire next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoFocus {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-[#dc2626]">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-[#dc2626]">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="e.g. CA" {...register("state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gradeLevel">Grade level</Label>
              <Input id="gradeLevel" placeholder="e.g. 12" {...register("gradeLevel")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn("bg-[#3B5BFF] hover:bg-[#2f49cc]")}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Add student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
