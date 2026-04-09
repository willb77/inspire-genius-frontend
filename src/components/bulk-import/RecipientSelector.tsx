import { useState, useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImportedUser } from "@/types/bulk-import"

type RecipientSelectorProps = {
  users: ImportedUser[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onSend: () => void
  isSending: boolean
}

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  user: "default",
  manager: "secondary",
  "company-admin": "outline",
  "super-admin": "destructive",
}

export function RecipientSelector({
  users,
  selectedIds,
  onSelectedIdsChange,
  onSend,
  isSending,
}: RecipientSelectorProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const roles = useMemo(() => {
    const unique = new Set(users.map((u) => u.user_type))
    return Array.from(unique).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim()
    return users.filter((user) => {
      if (roleFilter !== "all" && user.user_type !== roleFilter) return false
      if (!query) return true
      const fullName = `${user.fname} ${user.lname}`.toLowerCase()
      return fullName.includes(query) || user.email1.toLowerCase().includes(query)
    })
  }, [users, search, roleFilter])

  const filteredIds = useMemo(() => new Set(filteredUsers.map((u) => u.user_id)), [filteredUsers])

  const selectedInView = selectedIds.filter((id) => filteredIds.has(id))
  const allInViewSelected = filteredUsers.length > 0 && selectedInView.length === filteredUsers.length
  const someInViewSelected = selectedInView.length > 0 && !allInViewSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      const newIds = new Set(selectedIds)
      for (const user of filteredUsers) {
        newIds.add(user.user_id)
      }
      onSelectedIdsChange(Array.from(newIds))
    } else {
      onSelectedIdsChange(selectedIds.filter((id) => !filteredIds.has(id)))
    }
  }

  function handleToggleUser(userId: string, checked: boolean) {
    if (checked) {
      onSelectedIdsChange([...selectedIds, userId])
    } else {
      onSelectedIdsChange(selectedIds.filter((id) => id !== userId))
    }
  }

  function handleSendClick() {
    setConfirmOpen(true)
  }

  function handleConfirmSend() {
    setConfirmOpen(false)
    onSend()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Recipients</CardTitle>
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} of {users.length} selected
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filter controls */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select all header */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
            <Checkbox
              checked={allInViewSelected ? true : someInViewSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
              aria-label="Select all visible users"
            />
            <span className="text-sm font-medium">
              {allInViewSelected
                ? "Deselect All"
                : `Select All (${filteredUsers.length})`}
            </span>
          </div>

          {/* User list */}
          <div className="max-h-[400px] overflow-y-auto rounded-md border">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No users match the current filters.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.user_id)
                return (
                  <div
                    key={user.user_id}
                    className={cn(
                      "flex items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggleUser(user.user_id, checked === true)
                      }
                      aria-label={`Select ${user.fname} ${user.lname}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.fname} {user.lname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email1}
                      </p>
                    </div>
                    <Badge variant={ROLE_BADGE_VARIANT[user.user_type] ?? "default"}>
                      {user.user_type}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>

          {/* Send button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSendClick}
              disabled={selectedIds.length === 0 || isSending}
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invitations
              {selectedIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedIds.length}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invitations</DialogTitle>
            <DialogDescription>
              Send invitations to {selectedIds.length} user
              {selectedIds.length !== 1 ? "s" : ""}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSend} disabled={isSending}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
