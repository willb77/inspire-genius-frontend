import React, { useMemo } from "react";
import { ROUTES } from "@/constants/routes";
import { getUserNavItems, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
// AlexFloating retired (monolith sunset): its device-id call hit the deprecated
// monolith route GET /v1/chat/AlexChat/device-id, which 404s + fails CORS on the
// API Gateway. The floating Alex assistant is no longer rendered.
import { useAuth } from "@/context/useAuth";
import { useAgentEngine } from "@/lib/agentApi";
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function UserLayout({ children, className }: UserLayoutProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";
  const agentEngineOn = useAgentEngine();
  // My Workspace = the user menu plus any entitled workspace vertical
  // (Job Fit, Lumen), spliced in above Settings/Help.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));

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
    >
      {children}
    </SidebarScaffold>
  );
}
