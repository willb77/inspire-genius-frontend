import React, { useMemo } from "react";
import { ROUTES } from "@/constants/routes";
import { getUserNavItems } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import UnifiedLayout from "@/layouts/UnifiedLayout";
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
import { useSuperAdminSections } from "@/hooks/nav/useSuperAdminSections";

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

/**
 * The roles that see their OWN menu on a UserLayout page (RM-1). A user and a
 * super-admin keep the chrome below; every other role gets UnifiedLayout with
 * its own menu, so opening Help, Résumé Writer, Document Library or Meridian
 * chat no longer swaps the role's sidebar for the user one. Display only: the
 * route, its guard (ProtectedRoute) and every data call are unchanged.
 */
function ownMenuRole(role: string | null | undefined): UserRole | null {
  if (!isUserRole(role) || role === "user" || role === "super-admin") return null;
  return role;
}

export default function UserLayout(props: UserLayoutProps) {
  const { user } = useAuth();
  // Branch to a separate component rather than returning early, so no tree's
  // hook order depends on the role.
  const roleWithOwnMenu = ownMenuRole(user?.role);
  if (roleWithOwnMenu) {
    return (
      <UnifiedLayout
        role={roleWithOwnMenu}
        className={props.className}
        expandOnPath={ROUTES.HOME}
        collapseSidebarOnMount={props.collapseSidebarOnMount}
      >
        {props.children}
      </UnifiedLayout>
    );
  }
  if (user?.role === "super-admin") return <SuperAdminChrome {...props} />;
  return <UserChrome {...props} />;
}

/**
 * Super-admin on a user page (RM-2): the same menu as on admin pages, from the
 * same hook, so it no longer reshuffles between Home and an admin page and the
 * owner-only filter applies here too. My Workspace stays open here — the
 * workspace is what these pages are.
 */
function SuperAdminChrome({ children, className, collapseSidebarOnMount }: UserLayoutProps) {
  const sections = useSuperAdminSections({ workspaceExpanded: true });
  return (
    <SidebarScaffold
      navItems={[]}
      navSections={sections}
      className={className}
      expandOnPath={ROUTES.HOME}
      collapseOnMount={collapseSidebarOnMount}
    >
      {children}
    </SidebarScaffold>
  );
}

/** The user chrome (and legacy role labels), unchanged by RM-1 and RM-2. */
function UserChrome({
  children,
  className,
  collapseSidebarOnMount,
}: UserLayoutProps) {
  const { user } = useAuth();
  const agentEngineOn = useAgentEngine();
  // My Workspace = the user menu plus the workspace verticals (Career Fit),
  // spliced in above Settings/Help — omitted when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));
  // The consolidated Tools section, gated by the SIGNED-IN role. useToolsSection
  // owns the gate and returns null for user, company-admin and distributor.
  const signedInRole = user?.role;
  const role: UserRole = isUserRole(signedInRole) ? signedInRole : "user";
  const toolsSection = useToolsSection(role);

  const toolsSections: NavSectionDef[] = useMemo(
    () => (toolsSection ? [toolsSection] : []),
    [toolsSection],
  );

  /** Plain user: the flat workspace menu, with no Tools group beneath it —
   *  `navItems` already carries the same list, so returning undefined here
   *  leaves SidebarScaffold rendering the flat menu rather than an empty
   *  header-less section wrapper. If Tools is ever shown here, any workspace
   *  row whose destination Tools already lists is dropped from the workspace
   *  half, so each destination appears once. */
  const userSections: NavSectionDef[] | undefined = useMemo(() => {
    if (!toolsSections.length) return undefined;
    const inTools = new Set(toolsSections.flatMap((s) => destinations(s.items)));
    return [
      { label: "", items: userNavItems.filter((item) => !inTools.has(item.to)) },
      ...toolsSections,
    ];
  }, [userNavItems, toolsSections]);

  return (
    <SidebarScaffold
      navItems={userNavItems}
      navSections={userSections}
      className={className}
      expandOnPath={ROUTES.HOME}
      collapseOnMount={collapseSidebarOnMount}
    >
      {children}
    </SidebarScaffold>
  );
}
