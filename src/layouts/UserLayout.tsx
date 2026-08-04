import React, { useMemo } from "react";
import { BookOpenText } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getUserNavItems, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
// AlexFloating retired (monolith sunset): its device-id call hit the deprecated
// monolith route GET /v1/chat/AlexChat/device-id, which 404s + fails CORS on the
// API Gateway. The floating Alex assistant is no longer rendered.
import { useAuth } from "@/context/useAuth";
import { useAgentEngine } from "@/lib/agentApi";
import {
  useVerticalLauncherSection,
  useWorkspaceNavItems,
} from "@/components/layout/useVerticalLauncher";

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
  // Full vertical catalogue; unentitled entries render greyed + non-navigating.
  const launcherSection = useVerticalLauncherSection();

  // Bio Capture lives in the "Tools" rollup (moved out of the flat workspace
  // menu 2026-08-04). It is not a vertical, so it is spliced in at the top of the
  // Tools section rather than coming from the registry-driven launcher.
  const bioCaptureToolItem: NavItemDef = useMemo(
    () => ({ to: ROUTES.BIO_CAPTURE, icon: BookOpenText, label: "Bio Capture" }),
    [],
  );

  const verticalsSection: NavSectionDef[] = useMemo(
    () =>
      launcherSection
        ? [
            {
              label: launcherSection.label,
              items: [bioCaptureToolItem, ...launcherSection.items],
              // Honour the section's own default (rolled up as of 2026-07-31)
              // rather than forcing it open here — otherwise the roll-up set in
              // useVerticalLauncher applies on vertical pages but not on user
              // pages, and the section would expand and collapse as you move
              // between them.
              defaultCollapsed: launcherSection.defaultCollapsed ?? false,
            },
          ]
        : [],
    [launcherSection, bioCaptureToolItem],
  );

  /** Plain user: the flat workspace menu as a header-less group, with the
   *  Verticals catalogue beneath it. */
  const userSections: NavSectionDef[] | undefined = useMemo(
    () =>
      verticalsSection.length
        ? [{ label: "", items: userNavItems }, ...verticalsSection]
        : undefined,
    [userNavItems, verticalsSection],
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
      ...verticalsSection,
      ...bySection("Administration"),
    ];
  }, [userNavItems, verticalsSection]);

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
