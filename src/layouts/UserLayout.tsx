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
import { useToolsSection } from "@/hooks/nav/useToolsSection";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Start with the nav rail collapsed (not persisted) — for content-dense
   * pages such as Meridian Chat that want the horizontal room.
   */
  collapseSidebarOnMount?: boolean;
};

export default function UserLayout({
  children,
  className,
  collapseSidebarOnMount,
}: UserLayoutProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";
  const agentEngineOn = useAgentEngine();
  // My Workspace = the user menu plus the workspace verticals (Job Fit, Lumen),
  // spliced in above Settings/Help — greyed when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));
  // The consolidated Tools section — null for every role except super-admin
  // (2026-08-12, request). Bio Capture and the vertical catalogue moved inside
  // it, so a plain user no longer gets a Tools group here at all.
  const toolsSection = useToolsSection(isSuperAdmin ? "super-admin" : "user");

  const toolsSections: NavSectionDef[] = useMemo(
    () => (toolsSection ? [toolsSection] : []),
    [toolsSection],
  );

  /** Plain user: the flat workspace menu, with no Tools group beneath it —
   *  `navItems` already carries the same list, so returning undefined here
   *  leaves SidebarScaffold rendering the flat menu rather than an empty
   *  header-less section wrapper. */
  const userSections: NavSectionDef[] | undefined = useMemo(
    () =>
      toolsSections.length
        ? [{ label: "", items: userNavItems }, ...toolsSections]
        : undefined,
    [userNavItems, toolsSections],
  );

  /** Super-admin viewing user pages: lead with "My Workspace" (user nav) so the
   *  simpler user experience is primary, then Role Views → Verticals →
   *  Administration — the same order SuperAdminLayout uses, so the menu does not
   *  reshuffle as they move between user and admin pages. */
  const superAdminSections: NavSectionDef[] = useMemo(() => {
    const bySection = (label: string) =>
      SUPER_ADMIN_NAV_SECTIONS.filter((s) => s.label === label);
    return [
      { label: "My Workspace", items: userNavItems },
      ...bySection("Role Views"),
      ...toolsSections,
      ...bySection("Administration"),
    ];
  }, [userNavItems, toolsSections]);

  return (
    <SidebarScaffold
      navItems={isSuperAdmin ? [] : userNavItems}
      navSections={isSuperAdmin ? superAdminSections : userSections}
      className={className}
      expandOnPath={ROUTES.HOME}
      collapseOnMount={collapseSidebarOnMount}
    >
      {children}
    </SidebarScaffold>
  );
}
