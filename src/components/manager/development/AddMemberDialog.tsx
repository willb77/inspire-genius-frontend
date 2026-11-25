/**
 * "Add people" — the Development Studio's one way in (U7): add a person, import
 * a file and, for a manager, answer requests to join the team.
 *
 * Members are created under the calling manager (growth-service
 * `POST /v1/growth/members` and `/members/bulk`); the roster query is
 * invalidated on success so new cards appear immediately.
 *
 * T1: "Find a person" picks someone with an account and sends their id as
 * `memberSub`. The server adds a person who has an account only for their
 * manager, a company admin of their organisation or a super admin, and says
 * so in words otherwise — that refusal is rendered here, never swallowed.
 *
 * U7: the Requests tab exists only for the manager audience held by a manager,
 * and only while a request waits (or while it is the open tab, so the answer to
 * the last one stays on screen). A 403 / 404 from the list hides it, as it hid
 * the old inline panel. The practitioner's dialog is the two tabs it had, and
 * the add and import payloads are unchanged.
 */
import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useAddTeamMember,
  useBulkAddTeamMembers,
  type PersonOption,
} from "@/hooks/manager/development"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { PersonLookup } from "./PersonLookup"
import { parseMemberCsv } from "./memberCsv"
import { LinkRequestsPanel } from "./LinkRequestsPanel"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ROUTES } from "@/constants/routes"
import {
  useCanSeeLinkRequests,
  useWaitingLinkRequestCount,
  type StudioAudience,
} from "@/hooks/manager/development/useWaitingLinkRequests"
import { useTranslation } from "react-i18next"

export type AddPeopleTab = "single" | "bulk" | "requests"

/** The Requests tab trigger, with the waiting count. Mounted only for a manager. */
function RequestsTabTrigger({ active }: { active: boolean }) {
  const { t } = useTranslation("managerPages")
  const count = useWaitingLinkRequestCount()
  if (count === 0 && !active) return null
  return (
    <TabsTrigger value="requests" data-testid="add-people-requests-tab">
      {t("addMemberDialog.tabRequests", { defaultValue: "Requests" })}
      {count > 0 && (
        <span
          className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
          data-testid="add-people-requests-count"
        >
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}

export interface AddMemberDialogProps {
  triggerClassName?: string
  /** Which Studio this sits on. Only "manager" can show the Requests tab. */
  audience?: StudioAudience
  /** Controlled open state (the page's notice opens the dialog on Requests). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  tab?: AddPeopleTab
  onTabChange?: (tab: AddPeopleTab) => void
}

export function AddMemberDialog({
  triggerClassName,
  audience,
  open: openProp,
  onOpenChange,
  tab: tabProp,
  onTabChange,
}: AddMemberDialogProps) {
  const { t } = useTranslation("managerPages")
  const canSeeRequests = useCanSeeLinkRequests(audience)
  const [openState, setOpenState] = useState(false)
  const [tabState, setTabState] = useState<AddPeopleTab>("single")
  const open = openProp ?? openState
  const tab = tabProp ?? tabState
  const setTab = (next: AddPeopleTab) => {
    if (tabProp === undefined) setTabState(next)
    onTabChange?.(next)
  }
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    if (next && tabProp === undefined) setTabState("single")
    onOpenChange?.(next)
  }
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [csv, setCsv] = useState("")
  const [picked, setPicked] = useState<PersonOption | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addOne = useAddTeamMember()
  const addBulk = useBulkAddTeamMembers()

  const resetSingle = () => {
    setName("")
    setEmail("")
    setTitle("")
    setDepartment("")
    setPicked(null)
    setAddError(null)
  }

  const pick = (person: PersonOption | null) => {
    setPicked(person)
    setAddError(null)
    if (!person) return
    setName(person.name)
    setEmail(person.email ?? "")
    setTitle(person.title ?? "")
    setDepartment(person.department ?? "")
  }

  const submitSingle = async () => {
    if (!name.trim()) {
      toast.error(t("addMemberDialog.nameIsRequired", { defaultValue: "Name is required" }))
      return
    }
    setAddError(null)
    try {
      const result = await addOne.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        title: title.trim() || undefined,
        department: department.trim() || undefined,
        memberSub: picked?.id,
      })
      if (picked && result?.identity && result.identity.resolvedAccount === false) {
        // Resolution is scoped to the caller's own organisation, so a person
        // picked from another one is added as a card that is not linked to
        // their account. Say so rather than imply the link was made.
        toast.success(
          t("addMemberDialog.addedToYourTeamBut", { defaultValue: "Added {{name}} to your team, but not linked to their account: {{reason}}", name: name.trim(), reason: result.identity.reason }),
        )
      } else {
        toast.success(t("addMemberDialog.addedToYourTeam", { defaultValue: "Added {{name}} to your team", name: name.trim() }))
      }
      resetSingle()
      setOpen(false)
    } catch (err) {
      const message = apiErrorMessage(err, t("addMemberDialog.couldnTAddTheMemberPlease", { defaultValue: "Couldn't add the member. Please try again." }))
      setAddError(message)
      toast.error(message)
    }
  }

  const submitBulk = async () => {
    const members = parseMemberCsv(csv)
    if (members.length === 0) {
      toast.error(t("addMemberDialog.noValidRowsFoundUse", { defaultValue: "No valid rows found. Use: name, email, title, department" }))
      return
    }
    try {
      const result = await addBulk.mutateAsync(members)
      const created = result?.created ?? 0
      const failed = result?.failed ?? 0
      const refused = result?.refused ?? 0
      toast.success(
        (created === 1 ? t("addMemberDialog.addedMemberOne", { defaultValue: "Added {{created}} member", created }) : t("addMemberDialog.addedMemberOther", { defaultValue: "Added {{created}} members", created })) + (failed ? t("addMemberDialog.skippedSuffix", { defaultValue: " — {{failed}} skipped", failed }) : ""),
      )
      if (refused) {
        toast.error(
          (refused === 1 ? t("addMemberDialog.refusedOne", { defaultValue: "{{refused}} person has an account you can't add: ", refused }) : t("addMemberDialog.refusedOther", { defaultValue: "{{refused}} people have an account you can't add: ", refused })) +
            t("addMemberDialog.onlyTheirManagerACompanyAdmin", { defaultValue: "only their manager, a company admin of their organisation or a super admin can." }),
        )
      }
      setCsv("")
      setOpen(false)
    } catch {
      toast.error(t("addMemberDialog.bulkAddFailedPleaseTry", { defaultValue: "Bulk add failed. Please try again." }))
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsv(String(reader.result ?? ""))
    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />{t("addMemberDialog.addPeople", { defaultValue: "Add people" })}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addMemberDialog.addPeople", { defaultValue: "Add people" })}</DialogTitle>
          <DialogDescription>{t("addMemberDialog.addADirectReportTo", { defaultValue: "Add a direct report to your development roster. A card is created for each new member." })}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as AddPeopleTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="single">{t("addMemberDialog.tabAddPerson", { defaultValue: "Add a person" })}</TabsTrigger>
            <TabsTrigger value="bulk">{t("addMemberDialog.tabImportFile", { defaultValue: "Import a file" })}</TabsTrigger>
            {canSeeRequests && (
              <ErrorBoundary fallback={() => null}>
                <RequestsTabTrigger active={tab === "requests"} />
              </ErrorBoundary>
            )}
          </TabsList>

          <TabsContent value="single" className="space-y-3 pt-3">
            <PersonLookup selected={picked} onSelect={pick} />
            <div className="space-y-1.5">
              <Label htmlFor="member-name">{t("addMemberDialog.name", { defaultValue: "Name" })}</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("addMemberDialog.jordanLee", { defaultValue: "Jordan Lee" })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="member-title">{t("addMemberDialog.title", { defaultValue: "Title" })}</Label>
                <Input
                  id="member-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("addMemberDialog.softwareEngineer", { defaultValue: "Software Engineer" })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-dept">{t("addMemberDialog.department", { defaultValue: "Department" })}</Label>
                <Input
                  id="member-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={t("addMemberDialog.engineering", { defaultValue: "Engineering" })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">{t("addMemberDialog.emailOptional", { defaultValue: "Email (optional)" })}</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("addMemberDialog.jordanCompanyCom", { defaultValue: "jordan@company.com" })}
              />
            </div>
            {addError && (
              <p role="alert" className="text-sm text-destructive">
                {addError}
              </p>
            )}
            <DialogFooter>
              <Button onClick={submitSingle} disabled={addOne.isPending}>
                {addOne.isPending ? t("addMemberDialog.adding", { defaultValue: "Adding…" }) : t("addMemberDialog.addMember", { defaultValue: "Add member" })}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">{t("addMemberDialog.pasteOrUploadACsv", { defaultValue: "Paste or upload a CSV, one member per line:" })}<br />
              <code className="text-xs">{t("addMemberDialog.nameEmailTitleDepartment", { defaultValue: "name, email, title, department" })}</code>
              <br />
              {t("addMemberDialog.csvQuoteHint", { defaultValue: "Put a value in double quotes if it contains a comma." })}
            </p>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={7}
              placeholder={t("addMemberDialog.jordanLeeJordanCoCom", { defaultValue: "Jordan Lee, jordan@co.com, Engineer, Platform\nSam Rivera, sam@co.com, Designer, Product" })}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={onFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >{t("addMemberDialog.uploadCsvFile", { defaultValue: "Upload CSV file" })}</Button>
              <span className="text-xs text-muted-foreground">{t("addMemberDialog.memberSDetected", { defaultValue: "{{length}} member(s) detected", length: parseMemberCsv(csv).length })}</span>
            </div>
            <DialogFooter>
              <Button onClick={submitBulk} disabled={addBulk.isPending}>
                {addBulk.isPending ? t("addMemberDialog.adding", { defaultValue: "Adding…" }) : t("addMemberDialog.addMembers", { defaultValue: "Add members" })}
              </Button>
            </DialogFooter>
          </TabsContent>

          {canSeeRequests && (
            <TabsContent value="requests" className="space-y-3 pt-3">
              <LinkRequestsPanel
                audience="manager"
                emptyText={t("addMemberDialog.noRequestsWaiting", { defaultValue: "No requests are waiting." })}
              />
              <p className="text-xs text-muted-foreground">
                <Link
                  to={ROUTES.MANAGER.JOIN_REQUESTS}
                  className="underline underline-offset-2"
                  data-testid="add-people-org-join-requests-link"
                >
                  {t("addMemberDialog.orgJoinRequestsLink", { defaultValue: "Requests to join your organisation" })}
                </Link>
              </p>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default AddMemberDialog
