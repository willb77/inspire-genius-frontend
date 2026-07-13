import React, { useMemo } from "react";
import {
  SUPER_ADMIN_NAV_SECTIONS,
  getUserNavItems,
  OWNER_NAV_SECTION,
  isPlatformOwner,
} from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import { useAgentEngine } from "@/lib/agentApi";
import { GRANT_SIDEBAR_SECTION } from "@/constants/sidebar-sections";
import { useVerticalAccess } from "@/hooks/grant/useVerticalAccess";
import GrantPreviewToggle from "@/components/grant/GrantPreviewToggle";
import { useAuth } from "@/context/useAuth";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  const agentEngineOn = useAgentEngine();
  const userNavItems = getUserNavItems(agentEngineOn);
  const { hasAccess: hasGrantAccess } = useVerticalAccess("grant");
  const { user } = useAuth();
  // Owner-only sections (e.g. Dev Traffic Report) are surfaced solely to the
  // platform owner. The backend independently hard-403s any non-owner caller.
  const isOwner = isPlatformOwner(user?.email);

  /** On admin pages, keep Administration expanded (the user is mid-task) but
   *  still surface "My Workspace" so they can hop back to the user experience.
   *  The owner also gets a dedicated "Owner" section no one else can see.
   *  Entitlement-gated vertical sections are appended after the admin ones and
   *  toggle live via the preview switch (GrantPreviewToggle). */
  const sections: NavSectionDef[] = useMemo(
    () => [
      { label: "My Workspace", items: userNavItems, defaultCollapsed: true },
      ...(isOwner ? [OWNER_NAV_SECTION] : []),
      ...SUPER_ADMIN_NAV_SECTIONS.map((s) =>
        s.label === "Administration" ? { ...s, defaultCollapsed: false } : s,
      ),
      ...(hasGrantAccess
        ? [
            {
              label: GRANT_SIDEBAR_SECTION.label,
              items: GRANT_SIDEBAR_SECTION.items,
              defaultCollapsed: false,
            },
          ]
        : []),
    ],
    [userNavItems, hasGrantAccess, isOwner],
  );

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
