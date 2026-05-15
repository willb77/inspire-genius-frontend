import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS } from "@/types/roles"
import type { UserRole } from "@/types/roles"
import { Users, Shield, Building2, UserCheck, Briefcase, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_ICONS: Record<string, typeof Users> = {
  user: Users,
  manager: LayoutDashboard,
  "company-admin": Building2,
  practitioner: UserCheck,
  distributor: Briefcase,
  "super-admin": Shield,
}

const ROLE_COLORS: Record<string, string> = {
  user: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
  manager: "border-green-200 hover:border-green-400 hover:bg-green-50",
  "company-admin": "border-purple-200 hover:border-purple-400 hover:bg-purple-50",
  practitioner: "border-amber-200 hover:border-amber-400 hover:bg-amber-50",
  distributor: "border-pink-200 hover:border-pink-400 hover:bg-pink-50",
  "super-admin": "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50",
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  user: "Coaching and personal development",
  manager: "Team management and oversight",
  "company-admin": "Organization-level administration",
  practitioner: "PRISM coaching practice",
  distributor: "Credit distribution management",
  "super-admin": "Full platform access",
}

type RoleSelectorProps = {
  open: boolean
  roles: UserRole[]
  onSelect: (role: UserRole) => void
}

export default function RoleSelector({ open, roles, onSelect }: RoleSelectorProps) {
  const [selected, setSelected] = useState<UserRole | null>(null)

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Choose Your Role</DialogTitle>
          <DialogDescription>
            Your account has multiple roles. Select which role you'd like to use for this session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role] ?? Users
            const isSelected = selected === role
            return (
              <button
                key={role}
                onClick={() => setSelected(role)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : ROLE_COLORS[role] ?? "border-gray-200 hover:border-gray-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full",
                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{ROLE_LABELS[role] ?? role}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role] ?? ""}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full"
        >
          Continue as {selected ? ROLE_LABELS[selected] : "..."}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
