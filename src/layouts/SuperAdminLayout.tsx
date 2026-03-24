import React from "react";
import { SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  return (
    <SidebarScaffold navItems={[]} navSections={SUPER_ADMIN_NAV_SECTIONS} className={className}>
      {children}
    </SidebarScaffold>
  );
}
