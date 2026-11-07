/**
 * House-style super-admin menu (Wave 1, area switch `admin`).
 *
 * Today the super-admin sidebar carries a flat 26-item "Administration" list
 * and a five-item "Role Views" list. When `isHouseStyleOn("admin")` is true,
 * SuperAdminLayout renders these sections instead: six groups plus a closed
 * "Advanced" group for engineering tools. Role Views leaves the menu and
 * becomes the "View as…" switcher (see VIEW_AS_OPTIONS).
 *
 * This is a DISPLAY change only. Every destination below is a route that the
 * classic menu already links to — nothing is added, removed or re-gated, and
 * the owner-only filter (OWNER_ONLY_NAV_ROUTES) is still applied by the
 * layout. `superAdminNav.test.ts` asserts that every classic route is still
 * reachable from this menu, so regrouping cannot silently drop a page.
 */
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { ROUTES } from "@/constants/routes"
import { INTAKE_PRESETS, intakePresetHref } from "@/constants/intake"
import { plain } from "@/lib/house/glossary"
import {
  Activity,
  BarChart3,
  BookHeart,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  GraduationCap,
  Handshake,
  Home,
  IdCard,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquarePlus,
  Network,
  SearchCheck,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Wand2,
} from "lucide-react"

/** Menu label and page title of the admin home — they must match. */
export const ADMIN_HOME_LABEL = "Admin home"

const intakeItem: NavItemDef = {
  to: ROUTES.SUPER_ADMIN.INTAKE,
  icon: Inbox,
  label: "Intake",
  children: INTAKE_PRESETS.map((preset) => ({
    to: intakePresetHref(preset),
    icon: Filter,
    label: preset.label,
  })),
}

/**
 * The six groups plus Advanced, in menu order. Labels are unique across the
 * whole sidebar: SidebarScaffold keys sections by label, and a duplicate label
 * collides during reconciliation.
 */
export const HOUSE_SUPER_ADMIN_SECTIONS: NavSectionDef[] = [
  {
    // Unlabelled: a single entry needs no group header.
    label: "",
    items: [{ to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: ADMIN_HOME_LABEL }],
  },
  {
    label: "People",
    collapsible: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.USERS, icon: UsersRound, label: "Users" },
      { to: ROUTES.SUPER_ADMIN.ORGANIZATIONS, icon: Building2, label: "Organizations" },
      { to: ROUTES.SUPER_ADMIN.BULK_IMPORT, icon: UserPlus, label: plain("bulk user import") },
      { to: ROUTES.SUPER_ADMIN.PRACTITIONER_REGISTRY, icon: IdCard, label: "Practitioners" },
      { to: ROUTES.SUPER_ADMIN.CLIENT_SIGNUP, icon: Handshake, label: "Client sign-up" },
      intakeItem,
    ],
  },
  {
    label: "Support",
    collapsible: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT, icon: LifeBuoy, label: "Help requests" },
      { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
    ],
  },
  {
    label: "PRISM",
    collapsible: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.PRISM_MANAGEMENT, icon: BookOpen, label: "PRISM scores" },
      { to: ROUTES.SUPER_ADMIN.PRISM_EXAM, icon: ClipboardCheck, label: "PRISM exam" },
      { to: ROUTES.SUPER_ADMIN.PRISM_ACCURACY_SCORER, icon: Target, label: "Accuracy check" },
      { to: ROUTES.SUPER_ADMIN.PRISM_CSV_CONVERTER, icon: FileSpreadsheet, label: "Convert a report" },
    ],
  },
  {
    label: "AI coaches",
    collapsible: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT, icon: Wand2, label: "Coach setup" },
      { to: ROUTES.SUPER_ADMIN.AGENT_TRAINER, icon: Brain, label: "Coach training" },
      { to: ROUTES.SUPER_ADMIN.KNOWLEDGE_BASE, icon: BookOpen, label: "Knowledge" },
      { to: ROUTES.SUPER_ADMIN.RESEARCH, icon: BookHeart, label: "Research" },
      { to: ROUTES.SUPER_ADMIN.RLHF_TRAINING, icon: MessageSquarePlus, label: plain("rlhf training") },
    ],
  },
  {
    label: "Reports",
    collapsible: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.ANALYTICS, icon: BarChart3, label: "Usage reports" },
      { to: ROUTES.SUPER_ADMIN.OBSERVABILITY, icon: Eye, label: plain("observability") },
      { to: ROUTES.SUPER_ADMIN.PRIVACY_COMPLIANCE, icon: ShieldCheck, label: plain("rtbf") },
    ],
  },
  {
    label: "Advanced",
    defaultCollapsed: true,
    items: [
      { to: ROUTES.SUPER_ADMIN.EXPLAINABILITY, icon: SearchCheck, label: plain("explainability") },
      { to: ROUTES.SUPER_ADMIN.AGENT_TRACE_CONSOLE, icon: Network, label: "Coach trace console" },
      // Owner-only: SuperAdminLayout removes it for every other super-admin.
      { to: ROUTES.SUPER_ADMIN.DEV_TRAFFIC_REPORT, icon: Activity, label: "Dev traffic report" },
      { to: ROUTES.SUPER_ADMIN.ASSET_LIBRARY, icon: FolderOpen, label: "Asset library" },
      { to: ROUTES.SUPER_ADMIN.CURRICULUM, icon: GraduationCap, label: "Curriculum" },
      { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
    ],
  },
]

export type ViewAsOption = {
  to: string
  label: string
  icon: NavItemDef["icon"]
}

/**
 * "View as…" — the same five destinations the classic "Role Views" menu links
 * to. Choosing one simply opens that role's home page, exactly as clicking the
 * classic menu entry does: no role, token or permission changes.
 */
export const VIEW_AS_OPTIONS: readonly ViewAsOption[] = [
  { to: ROUTES.HOME, icon: Home, label: "User" },
  { to: ROUTES.MANAGER.DASHBOARD, icon: Users, label: "Manager" },
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: Building2, label: "Company admin" },
  { to: ROUTES.PRACTITIONER.HOME, icon: UserCheck, label: "Practitioner" },
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: Briefcase, label: "Distributor" },
]
