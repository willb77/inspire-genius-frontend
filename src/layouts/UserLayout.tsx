import React from "react";
import { ROUTES } from "@/constants/routes";
import { USER_NAV_ITEMS } from "@/constants/navigation";
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold";
import AlexFloating from "@/components/shared/AlexFloating";
import { useTour } from "@/context/useTour";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export default function UserLayout({ children, className }: UserLayoutProps) {
  const { isRunning } = useTour();
  return (
    <SidebarScaffold
      navItems={USER_NAV_ITEMS}
      className={className}
      expandOnPath={ROUTES.HOME}
      renderAfterContent={!isRunning ? <AlexFloating /> : null}
    >
      {children}
    </SidebarScaffold>
  );
}
