import React from "react";
import { SUPER_ADMIN_NAV_ITEMS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";

export type SuperAdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SuperAdminLayout({ children, className }: SuperAdminLayoutProps) {
  return (
    <SidebarScaffold navItems={SUPER_ADMIN_NAV_ITEMS} className={className}>
      {children}
    </SidebarScaffold>
  );
}
