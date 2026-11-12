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
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher";
import { useToolsSection } from "@/hooks/nav/useToolsSection";
import GrantPreviewToggle from "@/components/grant/GrantPreviewToggle";
import { useAuth } from "@/context/useAuth";
import { isHouseStyleOn } from "@/lib/house/areaSwitch";
import { HOUSE_SUPER_ADMIN_SECTIONS } from "@/constants/house/superAdminNav";
import { groupAdministrationItems } from "@/constants/house/administrationCategories";
import { useSavedJobsEnabled } from "@/hooks/job-fit/useSavedJobs";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  const agentEngineOn = useAgentEngine();
  // Read before the nav build below — My Workspace's owner-gated Goals entry
  // needs the viewer's email.
  const { user } = useAuth();
  // My Workspace = the user menu plus the workspace verticals (Career Fit),
  // spliced in above Settings/Help — omitted when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn));
  // The single consolidated Tools section — see hooks/nav/useToolsSection.
  const toolsSection = useToolsSection("super-admin");
  // Owner-only nav routes (e.g. Dev Traffic Report) stay in their normal
  // section but are hidden from every super-admin except the platform owner.
  // The backend independently hard-403s any non-owner caller.
  const isOwner = isPlatformOwner(user?.email);
  // House style (area `admin`, default OFF): six groups plus Advanced, and the
  // Role Views group gives way to the "View as…" switcher on Admin home.
  // Display only — the same destinations, the same owner-only filter.
  const houseStyle = isHouseStyleOn("admin");
  // JF-13 admin: `job_fit_v2` shows Administration in the house categories.
  // Only a server `true` is on; loading, an error and false keep today's list.
  const jobFitV2 = useSavedJobsEnabled();

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
    if (houseStyle) {
      return [
        ...HOUSE_SUPER_ADMIN_SECTIONS.map((s) => ({ ...s, items: gate(s.items) })),
        ...(toolsSection ? [toolsSection] : []),
        // Collapsed here (wireframe); SidebarScaffold still opens it on any
        // page it holds, e.g. Home, where super-admins land.
        { label: "My Workspace", items: userNavItems, defaultCollapsed: true },
      ];
    }
    return [
      // Always visible: a plain group, no header toggle (Bill, 2026-10-12).
      { label: "My Workspace", items: userNavItems },
      ...bySection("Role Views"),
      // ONE "Tools" section, assembled in useToolsSection rather than here.
      // Two groups both labelled "Tools" used to be built inline; duplicate
      // labels collide on SidebarScaffold's `key={section.label}`, and that
      // reconciliation clash is what made a Tools group surface only after the
      // Administration section was toggled. Building the list in one shared
      // hook is what stops that recurring in the next layout, rather than
      // fixing it only in this one.
      ...(toolsSection ? [toolsSection] : []),
      // Administration keeps its closed default (2026-10-12). It still opens on
      // any admin page, because SidebarScaffold opens the group holding the page.
      // With job_fit_v2 on, the same (owner-gated) entries in categories.
      ...bySection("Administration").map((s) =>
        jobFitV2 ? { ...s, items: groupAdministrationItems(s.items) } : s,
      ),
    ];
  }, [userNavItems, toolsSection, isOwner, houseStyle, jobFitV2]);

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
