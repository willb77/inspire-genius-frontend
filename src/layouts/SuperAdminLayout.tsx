import React, { useMemo } from "react";
import { SUPER_ADMIN_NAV_SECTIONS, getUserNavItems } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import { useAgentEngine } from "@/lib/agentApi";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  const agentEngineOn = useAgentEngine();
  const userNavItems = getUserNavItems(agentEngineOn);

  /** On admin pages, keep Administration expanded (the user is mid-task) but
   *  still surface "My Workspace" so they can hop back to the user experience. */
  const sections: NavSectionDef[] = useMemo(
    () => [
      { label: "My Workspace", items: userNavItems, defaultCollapsed: true },
      ...SUPER_ADMIN_NAV_SECTIONS.map((s) =>
        s.label === "Administration" ? { ...s, defaultCollapsed: false } : s,
      ),
    ],
    [userNavItems],
  );

  return (
    <SidebarScaffold navItems={[]} navSections={sections} className={className}>
      {children}
    </SidebarScaffold>
  );
}
