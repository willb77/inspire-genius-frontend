import React, { useMemo } from "react";
import { ROUTES } from "@/constants/routes";
import { USER_NAV_ITEMS, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import AlexFloating from "@/components/shared/AlexFloating";
import { useTour } from "@/context/useTour";
import { useAuth } from "@/context/useAuth";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function UserLayout({ children, className }: UserLayoutProps) {
  const { isRunning } = useTour();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";

  /** When a super-admin visits user pages via Role Views, show admin sections
   *  plus user nav items so they can navigate within the user experience. */
  const superAdminSections: NavSectionDef[] = useMemo(
    () => [
      ...SUPER_ADMIN_NAV_SECTIONS,
      { label: "User Pages", items: USER_NAV_ITEMS },
    ],
    [],
  );

  return (
    <SidebarScaffold
      navItems={isSuperAdmin ? [] : USER_NAV_ITEMS}
      navSections={isSuperAdmin ? superAdminSections : undefined}
      className={className}
      expandOnPath={ROUTES.HOME}
      renderAfterContent={!isRunning ? <AlexFloating /> : null}
    >
      {children}
    </SidebarScaffold>
  );
}
