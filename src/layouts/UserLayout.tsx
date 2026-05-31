import React, { useMemo } from "react";
import { ROUTES } from "@/constants/routes";
import { getUserNavItems, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import AlexFloating from "@/components/shared/AlexFloating";
import { useTour } from "@/context/useTour";
import { useAuth } from "@/context/useAuth";
import { useAgentEngine } from "@/lib/agentApi";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function UserLayout({ children, className }: UserLayoutProps) {
  const { isRunning } = useTour();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";
  const agentEngineOn = useAgentEngine();
  const userNavItems = getUserNavItems(agentEngineOn);

  /** Super-admin viewing user pages: lead with "My Workspace" (user nav) so
   *  the simpler user experience is primary; Administration + Role Views
   *  remain available as collapsed sections beneath. */
  const superAdminSections: NavSectionDef[] = useMemo(
    () => [
      { label: "My Workspace", items: userNavItems },
      ...SUPER_ADMIN_NAV_SECTIONS,
    ],
    [userNavItems],
  );

  return (
    <SidebarScaffold
      navItems={isSuperAdmin ? [] : userNavItems}
      navSections={isSuperAdmin ? superAdminSections : undefined}
      className={className}
      expandOnPath={ROUTES.HOME}
      renderAfterContent={!isRunning ? <AlexFloating /> : null}
    >
      {children}
    </SidebarScaffold>
  );
}
