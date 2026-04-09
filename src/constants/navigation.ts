import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole, RoleConfig } from "@/types/roles"
import { ROUTES } from "@/constants/routes"
import {
  Home,
  FileText,
  Settings,
  HelpCircle,
  Bot,
  LayoutDashboard,
  UsersRound,
  MessageSquarePlus,
  Wand2,
  Shield,
  Users,
  Building2,
  UserCheck,
  Map,
  Briefcase,
  Brain,
  BarChart3,
  MessageCircle,
  Mic,
  GitBranch,
  UserPlus,
} from "lucide-react"

/** Navigation items for the regular user role */
export const USER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon: Bot, label: "Chat with Coaches" },
  { to: ROUTES.PRISM_ASSESSMENT, icon: Brain, label: "Request Assessment" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "My Documents" },
  { to: ROUTES.FEEDBACK, icon: MessageCircle, label: "Feedback" },
  { to: ROUTES.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
]

/** Navigation items for the super-admin role */
export const SUPER_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.SUPER_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  { to: ROUTES.SUPER_ADMIN.COACHES, icon: Bot, label: "Coach Management" },
  { to: ROUTES.SUPER_ADMIN.RLHF_TRAINING, icon: MessageSquarePlus, label: "RLHF Training" },
  { to: ROUTES.SUPER_ADMIN.PROMPT_BUILDER, icon: Wand2, label: "Prompt Builder" },
  { to: ROUTES.SUPER_ADMIN.AUDIT_LOG, icon: Shield, label: "Audit Log" },
  { to: ROUTES.SUPER_ADMIN.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.SUPER_ADMIN.VOICE_SETTINGS, icon: Mic, label: "Voice Settings" },
  { to: ROUTES.SUPER_ADMIN.AGENT_TRAINER, icon: Brain, label: "Agent Trainer" },
  { to: ROUTES.SUPER_ADMIN.PROCESS_BUILDER, icon: GitBranch, label: "Process Builder" },
  { to: ROUTES.SUPER_ADMIN.BULK_IMPORT, icon: UserPlus, label: "Bulk Import" },
  { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.SUPER_ADMIN.PROJECT_LOG, icon: FileText, label: "Project Log" },
]

/** Navigation items for the manager role */
export const MANAGER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.MANAGER.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.MANAGER.TEAM, icon: Users, label: "Team Management" },
  { to: ROUTES.MANAGER.PRISM_TEAM, icon: Brain, label: "PRISM Team" },
  { to: ROUTES.MANAGER.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.MANAGER.SETTINGS, icon: Settings, label: "Settings" },
]

/** Navigation items for the company-admin role */
export const COMPANY_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.COMPANY_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  { to: ROUTES.COMPANY_ADMIN.ORGANIZATION, icon: Building2, label: "Organization" },
  { to: ROUTES.COMPANY_ADMIN.BULK_IMPORT, icon: UserPlus, label: "Bulk Import" },
  { to: ROUTES.COMPANY_ADMIN.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.COMPANY_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
]

/** Navigation items for the practitioner role */
export const PRACTITIONER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.PRACTITIONER.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.PRACTITIONER.CLIENTS, icon: UserCheck, label: "Clients" },
  { to: ROUTES.PRACTITIONER.PRISM_CLIENTS, icon: Brain, label: "PRISM Clients" },
  { to: ROUTES.PRACTITIONER.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.PRACTITIONER.SETTINGS, icon: Settings, label: "Settings" },
]

/** Navigation items for the distributor role */
export const DISTRIBUTOR_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.DISTRIBUTOR.PRACTITIONERS, icon: Briefcase, label: "Practitioners" },
  { to: ROUTES.DISTRIBUTOR.TERRITORY, icon: Map, label: "Territory" },
  { to: ROUTES.DISTRIBUTOR.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.DISTRIBUTOR.SETTINGS, icon: Settings, label: "Settings" },
]

/** Role-view links — lets super-admin jump to any role's dashboard */
const ROLE_VIEW_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "User Home" },
  { to: ROUTES.MANAGER.DASHBOARD, icon: Users, label: "Manager" },
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: Building2, label: "Company Admin" },
  { to: ROUTES.PRACTITIONER.DASHBOARD, icon: UserCheck, label: "Practitioner" },
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: Briefcase, label: "Distributor" },
]

/** Sectioned navigation for super-admin (admin tools + role views) */
export const SUPER_ADMIN_NAV_SECTIONS: NavSectionDef[] = [
  { label: "Administration", items: SUPER_ADMIN_NAV_ITEMS },
  { label: "Role Views", items: ROLE_VIEW_ITEMS },
]

/** Lookup from role to its nav items */
export const NAV_ITEMS_BY_ROLE: Record<UserRole, NavItemDef[]> = {
  user: USER_NAV_ITEMS,
  manager: MANAGER_NAV_ITEMS,
  "company-admin": COMPANY_ADMIN_NAV_ITEMS,
  practitioner: PRACTITIONER_NAV_ITEMS,
  distributor: DISTRIBUTOR_NAV_ITEMS,
  "super-admin": SUPER_ADMIN_NAV_ITEMS,
}

/** Home route each role should land on after login */
export const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
  user: ROUTES.HOME,
  manager: ROUTES.MANAGER.DASHBOARD,
  "company-admin": ROUTES.COMPANY_ADMIN.DASHBOARD,
  practitioner: ROUTES.PRACTITIONER.DASHBOARD,
  distributor: ROUTES.DISTRIBUTOR.DASHBOARD,
  "super-admin": ROUTES.SUPER_ADMIN.DASHBOARD,
}

/** Full default config per role */
export const DEFAULT_ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  user: {
    role: "user",
    label: "User",
    description: "End user receiving AI coaching",
    homeRoute: ROUTES.HOME,
    navItems: USER_NAV_ITEMS,
  },
  manager: {
    role: "manager",
    label: "Manager",
    description: "Supervisory role with direct-report visibility",
    homeRoute: ROUTES.MANAGER.DASHBOARD,
    navItems: MANAGER_NAV_ITEMS,
  },
  "company-admin": {
    role: "company-admin",
    label: "Company Admin",
    description: "Organization-level administrator",
    homeRoute: ROUTES.COMPANY_ADMIN.DASHBOARD,
    navItems: COMPANY_ADMIN_NAV_ITEMS,
  },
  practitioner: {
    role: "practitioner",
    label: "Practitioner",
    description: "PRISM-accredited coach managing clients",
    homeRoute: ROUTES.PRACTITIONER.DASHBOARD,
    navItems: PRACTITIONER_NAV_ITEMS,
  },
  distributor: {
    role: "distributor",
    label: "Distributor",
    description: "Regional wholesaler of PRISM credits to Practitioners",
    homeRoute: ROUTES.DISTRIBUTOR.DASHBOARD,
    navItems: DISTRIBUTOR_NAV_ITEMS,
  },
  "super-admin": {
    role: "super-admin",
    label: "Super Admin",
    description: "Platform owner with full access",
    homeRoute: ROUTES.SUPER_ADMIN.DASHBOARD,
    navItems: SUPER_ADMIN_NAV_ITEMS,
  },
}
