import React, { useMemo } from "react";
import { ROUTES } from "@/constants/routes";
import { getUserNavItems, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import { isUserRole } from "@/types/roles";
import type { UserRole } from "@/types/roles";
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

/** Every destination a list reaches, including the children of a group row. */
function destinations(items: NavItemDef[]): string[] {
  return items.flatMap((item) => [item.to, ...destinations(item.children ?? [])]).filter(Boolean);
}

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
  // The consolidated Tools section, gated by the SIGNED-IN role. Until
  // 2026-10-07 this passed "user" for everyone but super-admin, so a manager or
  // practitioner lost their Tools section the moment they opened Home, My
  // Workspace or Chat — it existed only on their own role pages (request:
  // "make it visible at all times"). useToolsSection owns the gate and still
  // returns null for user, company-admin and distributor, whose sidebars are
  // unchanged.
  const signedInRole = user?.role;
  const role: UserRole = isUserRole(signedInRole) ? signedInRole : "user";
  const toolsSection = useToolsSection(isSuperAdmin ? "super-admin" : role);

  const toolsSections: NavSectionDef[] = useMemo(
    () => (toolsSection ? [toolsSection] : []),
    [toolsSection],
  );

  /** Plain user: the flat workspace menu, with no Tools group beneath it —
   *  `navItems` already carries the same list, so returning undefined here
   *  leaves SidebarScaffold rendering the flat menu rather than an empty
   *  header-less section wrapper.
   *
   *  Manager / practitioner: the workspace menu, then Tools. Any workspace row
   *  whose destination Tools already lists (Goals Studio; Interview Practice,
   *  which Tools carries as "Practice Interview" under Interview Studio) is
   *  dropped from the workspace half, so each destination appears once. Tools
   *  keeps it because Tools is the one place these roles find it on every page,
   *  including their own role pages where the workspace menu is not shown. */
  const userSections: NavSectionDef[] | undefined = useMemo(() => {
    if (!toolsSections.length) return undefined;
    const inTools = new Set(toolsSections.flatMap((s) => destinations(s.items)));
    return [
      { label: "", items: userNavItems.filter((item) => !inTools.has(item.to)) },
      ...toolsSections,
    ];
  }, [userNavItems, toolsSections]);

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
