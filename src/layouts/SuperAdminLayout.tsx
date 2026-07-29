import React, { useMemo } from "react";
import {
  SUPER_ADMIN_NAV_SECTIONS,
  getUserNavItems,
  OWNER_ONLY_NAV_ROUTES,
  isPlatformOwner,
} from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import { useAgentEngine } from "@/lib/agentApi";
import {
  useVerticalLauncherSection,
  useWorkspaceNavItems,
} from "@/components/layout/useVerticalLauncher";
import GrantPreviewToggle from "@/components/grant/GrantPreviewToggle";
import { useAuth } from "@/context/useAuth";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  const agentEngineOn = useAgentEngine();
  // My Workspace = the user menu plus the workspace verticals (Job Fit, Lumen),
  // spliced in above Settings/Help — greyed when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));
  const launcherSection = useVerticalLauncherSection();
  const { user } = useAuth();
  // Owner-only nav routes (e.g. Dev Traffic Report) stay in their normal
  // section but are hidden from every super-admin except the platform owner.
  // The backend independently hard-403s any non-owner caller.
  const isOwner = isPlatformOwner(user?.email);

  /**
   * Section order (2026-07-28): **My Workspace → Role Views → Verticals →
   * Administration.** Verticals sits directly after the role views, and
   * Administration moved below it — day-to-day surfaces first, platform
   * plumbing last.
   *
   * Financial Aid (GRANT) no longer gets a bespoke top-level section; it is one
   * entry inside Verticals like every other vertical, with its nine aid pages
   * reached through `VerticalShell` once you enter. Verticals lists the FULL
   * catalogue — unentitled ones render greyed and non-navigating — and the
   * GRANT preview switch still flips entitlement live.
   */
  const sections: NavSectionDef[] = useMemo(() => {
    const gate = (items: NavSectionDef["items"]) =>
      isOwner ? items : items.filter((i) => !OWNER_ONLY_NAV_ROUTES.has(i.to));
    const bySection = (label: string) =>
      SUPER_ADMIN_NAV_SECTIONS.filter((s) => s.label === label).map((s) => ({
        ...s,
        items: gate(s.items),
      }));
    return [
      { label: "My Workspace", items: userNavItems, defaultCollapsed: true },
      ...bySection("Role Views"),
      ...(launcherSection
        ? [
            {
              label: launcherSection.label,
              items: launcherSection.items,
              defaultCollapsed: false,
            },
          ]
        : []),
      // Administration stays expanded — a super-admin on an admin page is mid-task.
      ...bySection("Administration").map((s) => ({ ...s, defaultCollapsed: false })),
    ];
  }, [userNavItems, launcherSection, isOwner]);

  return (
    <SidebarScaffold
      navItems={[]}
      navSections={sections}
      className={className}
      renderAfterContent={<GrantPreviewToggle />}
    >
      {children}
    </SidebarScaffold>
  );
}
