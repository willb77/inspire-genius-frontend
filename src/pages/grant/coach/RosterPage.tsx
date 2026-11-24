import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  useBulkInviteStudents,
  useCoachRoster,
  useCreateStudent,
  useInviteStudent,
  useRemoveStudent,
} from "@/hooks/grant/useCoachRoster"
import type {
  BulkInviteResult,
  BulkInviteRowResult,
  CoachStudent,
  CoachStudentStatus,
} from "@/types/grant/coach"
import { formatDate } from "../_format"
import { GrantCard, GrantEmptyState, GrantMeter, GrantPageHeader, GrantPill } from "../_shared"
import { CsvImportModal } from "./CsvImportModal"

/** Status → GrantPill tone + label. */
function StatusBadge({ status }: { status: CoachStudentStatus }) {
  const { t } = useTranslation("grantPages")
  if (status === "linked") return <GrantPill tone="green">{t("roster.statusLinked", "Linked")}</GrantPill>
  if (status === "invited") return <GrantPill tone="amber">{t("roster.statusInvited", "Invited")}</GrantPill>
  return <GrantPill tone="gray">{t("roster.statusManaged", "Managed")}</GrantPill>
}

/** Shared "keep co-access" toggle used by both the single and bulk invite flows. */
function CoAccessToggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  const { t } = useTranslation("grantPages")
  return (
    <div className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium text-[#1f2937]">
          {t("roster.coAccessLabel", "Keep co-access after they claim their account")}
        </Label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="data-[state=checked]:bg-[#3B5BFF]"
        />
      </div>
      <p className="mt-1.5 text-xs text-[#6b7280]">
        {checked
          ? t("roster.coAccessOn", "On — you stay on their roster and can still open their profile.")
          : t(
              "roster.coAccessOff",
              "Off — full hand-off. You'll no longer see this student after they claim their account."
            )}
      </p>
    </div>
  )
}

export default function RosterPage() {
  const { t } = useTranslation("grantPages")
  const navigate = useNavigate()
  const { data: students = [], isLoading } = useCoachRoster()
  const inviteMutation = useInviteStudent()
  const bulkInviteMutation = useBulkInviteStudents()
  const removeMutation = useRemoveStudent()

  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<CoachStudent | null>(null)
  const [inviteKeepAccess, setInviteKeepAccess] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<CoachStudent | null>(null)

  // Bulk-invite selection + flow.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkKeepAccess, setBulkKeepAccess] = useState(true)
  const [bulkResult, setBulkResult] = useState<BulkInviteResult | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => s.fullName.toLowerCase().includes(q))
  }, [students, query])

  // Only non-linked rows can be (re)invited; linked students already own their login.
  const selectableRows = useMemo(() => filtered.filter((s) => s.status !== "linked"), [filtered])
  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds]
  )
  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((s) => selectedIds.has(s.id))
  const someSelectableSelected = selectableRows.some((s) => selectedIds.has(s.id))
  const headerCheckState: boolean | "indeterminate" = allSelectableSelected
    ? true
    : someSelectableSelected
      ? "indeterminate"
      : false
  const selectedAllHaveEmail = selectedStudents.every((s) => !!s.email)
  const canBulkInvite = selectedStudents.length > 0 && selectedAllHaveEmail

  function toggleOne(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev)
      if (next) set.add(id)
      else set.delete(id)
      return set
    })
  }

  function toggleAll(next: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev)
      if (next) selectableRows.forEach((s) => set.add(s.id))
      else selectableRows.forEach((s) => set.delete(s.id))
      return set
    })
  }

  function openStudent(student: CoachStudent) {
    navigate(ROUTES.GRANT.coachStudentIntake(student.id))
  }

  function openInvite(student: CoachStudent) {
    setInviteKeepAccess(true)
    setInviteTarget(student)
  }

  function confirmInvite() {
    if (!inviteTarget) return
    const target = inviteTarget
    inviteMutation.mutate(
      { id: target.id, keepCoachAccess: inviteKeepAccess },
      {
        onSuccess: (res) =>
          res.status === "noop"
            ? toast.error(res.message)
            : toast.success(
                t("roster.toastInvitationSent", {
                  name: target.fullName,
                  defaultValue: "Invitation sent to {{name}}",
                })
              ),
        onError: () =>
          toast.error(t("roster.toastInviteError", "Couldn't send the invitation. Please try again.")),
      }
    )
    setInviteTarget(null)
  }

  function openBulkInvite() {
    setBulkKeepAccess(true)
    setBulkOpen(true)
  }

  function confirmBulkInvite() {
    const ids = selectedStudents.map((s) => s.id)
    if (ids.length === 0) return
    bulkInviteMutation.mutate(
      { studentIds: ids, keepCoachAccess: bulkKeepAccess },
      {
        onSuccess: (res) => {
          setBulkResult(res)
          setSelectedIds(new Set())
          toast.success(
            ids.length === 1
              ? t("roster.toastBulkInvitedOne", {
                  converted: res.converted,
                  total: ids.length,
                  defaultValue: "Invited {{converted}} of {{total}} student",
                })
              : t("roster.toastBulkInvitedOther", {
                  converted: res.converted,
                  total: ids.length,
                  defaultValue: "Invited {{converted}} of {{total}} students",
                })
          )
        },
        onError: () =>
          toast.error(t("roster.toastBulkInviteError", "Couldn't send the invitations. Please try again.")),
      }
    )
    setBulkOpen(false)
  }

  function confirmRemove() {
    if (!removeTarget) return
    const target = removeTarget
    removeMutation.mutate(target.id, {
      onSuccess: () =>
        toast.success(
          t("roster.toastRemoved", {
            name: target.fullName,
            defaultValue: "Removed {{name}} from your roster",
          })
        ),
      onError: () => toast.error(t("roster.toastRemoveError", "Couldn't remove this student. Please try again.")),
    })
    setRemoveTarget(null)
  }

  return (
    <div className="max-w-5xl">
      <GrantPageHeader
        icon={Users}
        title={t("roster.title", "My Students")}
        description={t(
          "roster.description",
          "Import and manage the students you're building aid profiles for, then convert them into their own InspiresGenius login."
        )}
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            aria-label={t("roster.searchAria", "Search students")}
            placeholder={t("roster.searchPlaceholder", "Search by name")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2 border-[#3B5BFF] text-[#3B5BFF] hover:bg-[rgba(59,91,255,0.08)] hover:text-[#3B5BFF]"
          disabled={!canBulkInvite}
          title={
            selectedStudents.length === 0
              ? t("roster.inviteTitleNone", "Select students to invite")
              : !selectedAllHaveEmail
                ? t("roster.inviteTitleNoEmail", "Every selected student needs an email to invite")
                : t("roster.inviteTitleSelected", {
                    count: selectedStudents.length,
                    defaultValue: "Invite {{count}} selected to InspiresGenius",
                  })
          }
          onClick={openBulkInvite}
        >
          <MailPlus className="h-4 w-4" />{" "}
          {t("roster.inviteSelected", {
            count: selectedStudents.length,
            defaultValue: "Invite selected to IG ({{count}})",
          })}
        </Button>
        <Button className="gap-2 bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> {t("roster.addStudent", "Add student")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Users className="h-4 w-4" /> {t("roster.importCsv", "Import CSV")}
        </Button>
      </div>

      {isLoading ? (
        <GrantEmptyState>{t("roster.loading", "Loading your roster…")}</GrantEmptyState>
      ) : students.length === 0 ? (
        <GrantEmptyState>
          <p className="mb-3 font-medium text-[#6b7280]">{t("roster.emptyTitle", "No students yet")}</p>
          <p className="mb-4 text-sm">
            {t("roster.emptyBody", "Add a student or import a roster to get started.")}
          </p>
          <div className="flex justify-center gap-2">
            <Button className="gap-2 bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> {t("roster.addStudent", "Add student")}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Users className="h-4 w-4" /> {t("roster.importCsv", "Import CSV")}
            </Button>
          </div>
        </GrantEmptyState>
      ) : filtered.length === 0 ? (
        <GrantEmptyState>
          {t("roster.noMatch", { query, defaultValue: "No students match “{{query}}”." })}
        </GrantEmptyState>
      ) : (
        <GrantCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      aria-label={t("roster.selectAll", "Select all students")}
                      checked={headerCheckState}
                      disabled={selectableRows.length === 0}
                      onCheckedChange={(c) => toggleAll(c === true)}
                    />
                  </th>
                  <th className="px-4 py-3">{t("roster.colStudent", "Student")}</th>
                  <th className="px-4 py-3">{t("roster.colStatus", "Status")}</th>
                  <th className="px-4 py-3 w-48">{t("roster.colCompleteness", "Completeness")}</th>
                  <th className="px-4 py-3">{t("roster.colReady", "Ready")}</th>
                  <th className="px-4 py-3">{t("roster.colUpdated", "Updated")}</th>
                  <th className="px-4 py-3 text-right">{t("roster.colActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="px-4 py-3">
                      <Checkbox
                        aria-label={t("roster.selectStudent", { name: s.fullName, defaultValue: "Select {{name}}" })}
                        checked={selectedIds.has(s.id)}
                        disabled={s.status === "linked"}
                        onCheckedChange={(c) => toggleOne(s.id, c === true)}
                      />
                    </td>
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
                          <CheckCircle2 className="h-4 w-4" /> {t("roster.ready", "Ready")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#9ca3af]">
                          <MinusCircle className="h-4 w-4" /> {t("roster.notYet", "Not yet")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDate(s.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openStudent(s)}>
                          {t("roster.open", "Open")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-[#3B5BFF] hover:bg-[rgba(59,91,255,0.08)] hover:text-[#3B5BFF]"
                          disabled={!s.email || s.status !== "managed"}
                          title={
                            !s.email
                              ? t("roster.rowInviteNoEmail", "Add an email to invite this student")
                              : s.status !== "managed"
                                ? t("roster.rowInviteAlready", "Already invited")
                                : t("roster.rowInviteTitle", "Invite to InspiresGenius")
                          }
                          onClick={() => openInvite(s)}
                        >
                          <MailPlus className="h-4 w-4" /> {t("roster.invite", "Invite")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t("roster.removeStudent", { name: s.fullName, defaultValue: "Remove {{name}}" })}
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
            <AlertDialogTitle>
              {t("roster.inviteDialogTitle", {
                name: inviteTarget?.fullName,
                defaultValue: "Invite {{name}} to InspiresGenius?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("roster.inviteDialogBody", {
                email: inviteTarget?.email,
                defaultValue:
                  "We'll email {{email}} a secure set-password / magic link so they can sign in and take over their own aid profile.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <CoAccessToggle
            id="invite-keep-access"
            checked={inviteKeepAccess}
            onCheckedChange={setInviteKeepAccess}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3B5BFF] hover:bg-[#2f49cc]"
              onClick={confirmInvite}
            >
              {t("roster.sendInvitation", "Send invitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk invite confirmation */}
      <AlertDialog open={bulkOpen} onOpenChange={(o) => !o && setBulkOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStudents.length === 1
                ? t("roster.bulkDialogTitleOne", {
                    count: selectedStudents.length,
                    defaultValue: "Invite {{count}} student to InspiresGenius?",
                  })
                : t("roster.bulkDialogTitleOther", {
                    count: selectedStudents.length,
                    defaultValue: "Invite {{count}} students to InspiresGenius?",
                  })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "roster.bulkDialogBody",
                "Each selected student gets an email with a secure set-password / magic link so they can sign in and take over their own aid profile."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <CoAccessToggle
            id="bulk-keep-access"
            checked={bulkKeepAccess}
            onCheckedChange={setBulkKeepAccess}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={confirmBulkInvite}>
              {selectedStudents.length === 1
                ? t("roster.sendBulkOne", {
                    count: selectedStudents.length,
                    defaultValue: "Send {{count}} invitation",
                  })
                : t("roster.sendBulkOther", {
                    count: selectedStudents.length,
                    defaultValue: "Send {{count}} invitations",
                  })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk invite result report */}
      <BulkInviteReport
        result={bulkResult}
        students={students}
        onClose={() => setBulkResult(null)}
      />

      {/* Remove confirmation */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("roster.removeDialogTitle", {
                name: removeTarget?.fullName,
                defaultValue: "Remove {{name}}?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "roster.removeDialogBody",
                "This removes the student from your roster. Their profile data is not deleted if they already have their own linked login."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#b91c1c] hover:bg-[#991b1b]"
              onClick={confirmRemove}
            >
              {t("roster.remove", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Bulk invite result report ────────────────────────────────────────────────

/** Per-row status → pill tone. */
function bulkRowTone(status: BulkInviteRowResult["status"]): "green" | "amber" | "gray" | "red" {
  if (status === "invited" || status === "linked") return "green"
  if (status === "skipped" || status === "noop") return "amber"
  if (status === "error" || status === "forbidden") return "red"
  return "gray"
}

function BulkInviteReport({
  result,
  students,
  onClose,
}: {
  result: BulkInviteResult | null
  students: CoachStudent[]
  onClose: () => void
}) {
  const { t } = useTranslation("grantPages")
  const nameFor = (id: string) => students.find((s) => s.id === id)?.fullName ?? id
  return (
    <Dialog open={result !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roster.bulkResultsTitle", "Bulk invite results")}</DialogTitle>
          <DialogDescription>
            {t("roster.bulkResultsBody", "Here's how each selected student was handled.")}
          </DialogDescription>
        </DialogHeader>
        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[#e5e7eb] bg-[#f0fdf4] p-3">
                <div className="text-lg font-semibold text-[#0f766e]">{result.converted}</div>
                <div className="text-xs text-[#6b7280]">{t("roster.converted", "Converted")}</div>
              </div>
              <div className="rounded-md border border-[#e5e7eb] bg-[#fffbeb] p-3">
                <div className="text-lg font-semibold text-[#b45309]">{result.skipped}</div>
                <div className="text-xs text-[#6b7280]">{t("roster.skipped", "Skipped")}</div>
              </div>
              <div className="rounded-md border border-[#e5e7eb] bg-[#fef2f2] p-3">
                <div className="text-lg font-semibold text-[#b91c1c]">{result.errors}</div>
                <div className="text-xs text-[#6b7280]">{t("roster.errors", "Errors")}</div>
              </div>
            </div>
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto text-sm">
              {result.results.map((r) => (
                <li
                  key={r.studentId}
                  className="flex items-center justify-between gap-3 rounded-md border border-[#f3f4f6] px-3 py-2"
                >
                  <span className="truncate font-medium text-[#1f2937]">{nameFor(r.studentId)}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.message && <span className="text-xs text-[#9ca3af]">{r.message}</span>}
                    <GrantPill tone={bulkRowTone(r.status)}>{r.status}</GrantPill>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <DialogFooter>
          <Button className="bg-[#3B5BFF] hover:bg-[#2f49cc]" onClick={onClose}>
            {t("common.done", "Done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add-student dialog ───────────────────────────────────────────────────────

/** Built per render so the validation messages follow the active language. */
function makeAddStudentSchema(t: TFunction) {
  return z.object({
    firstName: z.string().min(1, t("roster.firstNameRequired", "First name is required")),
    lastName: z.string().optional(),
    email: z
      .union([z.string().email(t("roster.invalidEmail", "Enter a valid email")), z.literal("")])
      .optional(),
    state: z.string().optional(),
    gradeLevel: z.string().optional(),
  })
}

type AddStudentValues = z.infer<ReturnType<typeof makeAddStudentSchema>>

function AddStudentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation("grantPages")
  const createMutation = useCreateStudent()
  const addStudentSchema = useMemo(() => makeAddStudentSchema(t), [t])
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
          toast.success(t("roster.toastAdded", { name: student.fullName, defaultValue: "Added {{name}}" }))
          reset()
          onOpenChange(false)
        },
        onError: () => toast.error(t("roster.toastAddError", "Couldn't add the student. Please try again.")),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roster.addDialogTitle", "Add a student")}</DialogTitle>
          <DialogDescription>
            {t(
              "roster.addDialogBody",
              "Create a managed profile. You can open it to complete the aid questionnaire next."
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("roster.firstName", "First name")}</Label>
              <Input id="firstName" autoFocus {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-[#dc2626]">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("roster.lastName", "Last name")}</Label>
              <Input id="lastName" {...register("lastName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("roster.emailOptional", "Email (optional)")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-[#dc2626]">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="state">{t("roster.state", "State")}</Label>
              <Input id="state" placeholder={t("roster.statePlaceholder", "e.g. CA")} {...register("state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gradeLevel">{t("roster.gradeLevel", "Grade level")}</Label>
              <Input id="gradeLevel" placeholder={t("roster.gradePlaceholder", "e.g. 12")} {...register("gradeLevel")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              className={cn("bg-[#3B5BFF] hover:bg-[#2f49cc]")}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t("roster.addStudent", "Add student")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
