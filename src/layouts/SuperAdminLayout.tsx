import React from "react";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import { useSuperAdminSections } from "@/hooks/nav/useSuperAdminSections";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Admin pages. The menu itself — owner filter, house style, Tools, My
 * Workspace — is built in useSuperAdminSections, which UserLayout's
 * super-admin branch shares, so the menu does not change between Home and an
 * admin page (RM-2).
 */
export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  const sections = useSuperAdminSections();

  return (
    <SidebarScaffold
      navItems={[]}
      navSections={sections}
      className={className}
    >
      {children}
    </SidebarScaffold>
  );
}
