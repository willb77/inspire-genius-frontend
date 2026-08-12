import React, { useMemo } from "react";
import {
  SUPER_ADMIN_NAV_SECTIONS,
  SUPER_ADMIN_TOOLS_SECTION,
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
  // Read before the nav build below — My Workspace's owner-gated Goals entry
  // needs the viewer's email.
  const { user } = useAuth();
  // My Workspace = the user menu plus the workspace verticals (Job Fit, Lumen),
  // spliced in above Settings/Help — greyed when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));
  const launcherSection = useVerticalLauncherSection();
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
      // ONE "Tools" rollup. The vertical catalogue (launcherSection) and the
      // utility surfaces (Team Development, Interview Practice — from
      // SUPER_ADMIN_TOOLS_SECTION) were previously two separate sections that
      // BOTH carried the label "Tools". Duplicate section labels collide on
      // SidebarScaffold's `key={section.label}`, and that reconciliation clash
      // is what made the Team-Development "Tools" group surface only when the
      // Administration section was toggled. Merging them into a single section
      // gives one stable, correctly-keyed "Tools" rollup, above Administration.
      ...(() => {
        const toolsItems = [
          ...(launcherSection?.items ?? []),
          ...(SUPER_ADMIN_TOOLS_SECTION?.items ?? []),
        ];
        return toolsItems.length
          ? [
              {
                label: "Tools",
                items: toolsItems,
                defaultCollapsed:
                  launcherSection?.defaultCollapsed ??
                  SUPER_ADMIN_TOOLS_SECTION?.defaultCollapsed ??
                  true,
              },
            ]
          : [];
      })(),
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
