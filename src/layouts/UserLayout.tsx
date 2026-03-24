import React from "react";
import { ROUTES } from "@/constants/routes";
import { USER_NAV_ITEMS, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
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

  return (
    <SidebarScaffold
      navItems={isSuperAdmin ? [] : USER_NAV_ITEMS}
      navSections={isSuperAdmin ? SUPER_ADMIN_NAV_SECTIONS : undefined}
      className={className}
      expandOnPath={ROUTES.HOME}
      renderAfterContent={!isRunning ? <AlexFloating /> : null}
    >
      {children}
    </SidebarScaffold>
  );
}
