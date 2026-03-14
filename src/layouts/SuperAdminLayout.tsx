import React from "react";
import { ROUTES } from "@/constants/routes";
import { LayoutDashboard, Bot, UsersRound, Settings, FileText, MessageSquarePlus, Wand2, Shield } from "lucide-react";
import SidebarScaffold, { type NavItemDef } from "@/components/shared/layout/SidebarScaffold";
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.SUPER_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  // { to: ROUTES.SUPER_ADMIN.TEAM, icon: Users, label: "Team Management" },
  { to: ROUTES.SUPER_ADMIN.COACHES, icon: Bot, label: "Coach Management" },
  // { to: ROUTES.SUPER_ADMIN.ORGANIZATIONS, icon: UsersRound, label: "Organizational Management" },
  { to: ROUTES.SUPER_ADMIN.RLHF_TRAINING, icon: MessageSquarePlus, label: "RLHF Training" },
  { to: ROUTES.SUPER_ADMIN.PROMPT_BUILDER, icon: Wand2, label: "Prompt Builder" },
  { to: ROUTES.SUPER_ADMIN.AUDIT_LOG, icon: Shield, label: "Audit Log" },
  { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.SUPER_ADMIN.PROJECT_LOG, icon: FileText, label: "Project Log" },
];

export default function SuperAdminLayout({ children, className }: UserLayoutProps) {
  usePageViewAudit("admin");
  return (
    <SidebarScaffold navItems={NAV_ITEMS} className={className}>
      {children}
    </SidebarScaffold>
  );
}
