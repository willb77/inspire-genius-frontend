import React from "react";
import { ROUTES } from "@/constants/routes";
import { LayoutDashboard, Users, Bot, UsersRound } from "lucide-react";
import SidebarScaffold, { type NavItemDef } from "@/components/shared/layout/SidebarScaffold";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.SUPER_ADMIN.TEAM, icon: Users, label: "Team Management" },
  { to: ROUTES.SUPER_ADMIN.COACHES, icon: Bot, label: "Coach Management" },
  { to: ROUTES.SUPER_ADMIN.ORGANIZATIONS, icon: UsersRound, label: "Organizational Management" },
];

export default function SuperAdminLayout({ children, className }: UserLayoutProps) {
  return (
    <SidebarScaffold navItems={NAV_ITEMS} className={className}>
      {children}
    </SidebarScaffold>
  );
}
