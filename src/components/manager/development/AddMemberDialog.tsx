/**
 * Add team members to the Development Studio roster — single form + bulk CSV.
 *
 * Members are created under the calling manager (growth-service
 * `POST /v1/growth/members` and `/members/bulk`); the roster query is
 * invalidated on success so new cards appear immediately.
 *
 * T1: "Find a person" picks someone with an account and sends their id as
 * `memberSub`. The server adds a person who has an account only for their
 * manager, a company admin of their organisation or a super admin, and says
 * so in words otherwise — that refusal is rendered here, never swallowed.
 */
import { useRef, useState } from "react"
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
import type { MemberCreateInput } from "@/types/development"
import { PersonLookup } from "./PersonLookup"

/** Parse a simple `name,email,title,department` CSV (optional header row). */
export function parseMemberCsv(text: string): MemberCreateInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  const hasHeader = lines[0].toLowerCase().replace(/\s/g, "").startsWith("name")
  const rows = hasHeader ? lines.slice(1) : lines
  return rows
    .map((line) => {
      const cells = line.split(",").map((c) => c.trim())
      const [name, email, title, department] = cells
      return {
        name: name || "",
        email: email || undefined,
        title: title || undefined,
        department: department || undefined,
      } as MemberCreateInput
    })
    .filter((m) => m.name)
}

export function AddMemberDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false)
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
      toast.error("Name is required")
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
          `Added ${name.trim()} to your team, but not linked to their account: ${result.identity.reason}`,
        )
      } else {
        toast.success(`Added ${name.trim()} to your team`)
      }
      resetSingle()
      setOpen(false)
    } catch (err) {
      const message = apiErrorMessage(err, "Couldn't add the member. Please try again.")
      setAddError(message)
      toast.error(message)
    }
  }

  const submitBulk = async () => {
    const members = parseMemberCsv(csv)
    if (members.length === 0) {
      toast.error("No valid rows found. Use: name, email, title, department")
      return
    }
    try {
      const result = await addBulk.mutateAsync(members)
      const created = result?.created ?? 0
      const failed = result?.failed ?? 0
      const refused = result?.refused ?? 0
      toast.success(
        `Added ${created} member${created === 1 ? "" : "s"}${failed ? ` — ${failed} skipped` : ""}`,
      )
      if (refused) {
        toast.error(
          `${refused} ${refused === 1 ? "person has" : "people have"} an account you can't add: ` +
            "only their manager, a company admin of their organisation or a super admin can.",
        )
      }
      setCsv("")
      setOpen(false)
    } catch {
      toast.error("Bulk add failed. Please try again.")
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
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add team members</DialogTitle>
          <DialogDescription>
            Add a direct report to your development roster. A card is created for
            each new member.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">Bulk upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 pt-3">
            <PersonLookup selected={picked} onSelect={pick} />
            <div className="space-y-1.5">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="member-title">Title</Label>
                <Input
                  id="member-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-dept">Department</Label>
                <Input
                  id="member-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Engineering"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Email (optional)</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@company.com"
              />
            </div>
            {addError && (
              <p role="alert" className="text-sm text-destructive">
                {addError}
              </p>
            )}
            <DialogFooter>
              <Button onClick={submitSingle} disabled={addOne.isPending}>
                {addOne.isPending ? "Adding…" : "Add member"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Paste or upload a CSV, one member per line:
              <br />
              <code className="text-xs">name, email, title, department</code>
            </p>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={7}
              placeholder={"Jordan Lee, jordan@co.com, Engineer, Platform\nSam Rivera, sam@co.com, Designer, Product"}
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
              >
                Upload CSV file
              </Button>
              <span className="text-xs text-muted-foreground">
                {parseMemberCsv(csv).length} member(s) detected
              </span>
            </div>
            <DialogFooter>
              <Button onClick={submitBulk} disabled={addBulk.isPending}>
                {addBulk.isPending ? "Adding…" : "Add members"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default AddMemberDialog
