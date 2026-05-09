import {
  LayoutDashboard,
  MessageSquare,
  Star,
  Users,
  UserPlus,
  User,
  Briefcase,
  Clock,
  BookOpen,
  Activity,
  UsersRound,
  Award,
  Building2,
  Grid3x3,
  BarChart3,
  Home,
  PlusCircle,
  FileText,
  Target,
  Settings,
  MessageSquarePlus,
} from "lucide-react"
import type { UserRole } from "@/types/roles"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"

export type SidebarSection = {
  id: string
  label: string
  roles: UserRole[]
  items: SidebarNavItem[]
}

export type SidebarNavItem = NavItemDef & { badge?: number | string }

/** Sidebar sections matching the HTML reference designs */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "main",
    label: "Main",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/home", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/dashboard", icon: MessageSquare, label: "Chat", badge: 3 },
      { to: "/coaches", icon: Star, label: "PRISM Report" },
    ],
  },
  {
    id: "manager",
    label: "Manager",
    roles: ["manager", "super-admin"],
    items: [
      { to: "/manager/dashboard", icon: LayoutDashboard, label: "Manager Dashboard" },
      { to: "/manager/team", icon: Users, label: "My Team", badge: 14 },
      { to: "/manager/hiring", icon: UserPlus, label: "Hiring" },
      { to: "/manager/candidates", icon: User, label: "Candidates" },
      { to: "/manager/interviews", icon: Briefcase, label: "Interviews" },
      { to: "/manager/job-dna", icon: Clock, label: "Job DNA" },
      { to: "/manager/training", icon: BookOpen, label: "Training" },
      { to: "/manager/career-mgmt", icon: Activity, label: "Career Mgmt" },
      { to: "/manager/team-building", icon: UsersRound, label: "Team Building" },
      { to: "/manager/leadership", icon: Award, label: "Leadership" },
      { to: "/manager/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "company",
    label: "Company",
    roles: ["company-admin", "super-admin"],
    items: [
      { to: "/company-admin/dashboard", icon: Building2, label: "Company Dashboard" },
      { to: "/company-admin/users", icon: Users, label: "Team Management" },
      { to: "/company-admin/costs", icon: BarChart3, label: "Costs & Expenses" },
      { to: "/company-admin/organization", icon: Grid3x3, label: "Organization" },
      { to: "/company-admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "distributor",
    label: "Distributor",
    roles: ["distributor", "super-admin"],
    items: [
      { to: "/distributor/dashboard", icon: Home, label: "Distributor Home" },
      { to: "/distributor/practitioners", icon: User, label: "Practitioners" },
      { to: "/distributor/credits", icon: PlusCircle, label: "Credits" },
      { to: "/distributor/territory", icon: BarChart3, label: "Allocate Credits" },
      { to: "/distributor/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "practitioner",
    label: "Practitioner",
    roles: ["practitioner", "super-admin"],
    items: [
      { to: "/practitioner/dashboard", icon: Home, label: "Practitioner Home" },
      { to: "/practitioner/clients", icon: Users, label: "My Clients", badge: 24 },
      { to: "/practitioner/credits", icon: PlusCircle, label: "Credits" },
      { to: "/practitioner/conversations", icon: MessageSquare, label: "Conversations" },
      { to: "/practitioner/follow-up", icon: Clock, label: "Follow-Up", badge: 5 },
      { to: "/practitioner/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/documents", icon: FileText, label: "Documents" },
      { to: "/goals", icon: Target, label: "Goals" },
      { to: "/feedback", icon: MessageSquarePlus, label: "Feedback" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "account",
    label: "Account",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
]

/** Get sidebar sections visible for a given role (or roles) */
export function getSectionsForRole(role: UserRole | UserRole[]): SidebarSection[] {
  const roles = Array.isArray(role) ? role : [role]
  return SIDEBAR_SECTIONS.filter((s) => s.roles.some((r) => roles.includes(r)))
}
