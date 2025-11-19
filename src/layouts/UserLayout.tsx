import React from "react";
import { ROUTES } from "@/constants/routes";
import {
  Home,
  FileText,
  Settings,
  HelpCircle,
  Bot,
  TableProperties,
} from "lucide-react";
import SidebarScaffold, { type NavItemDef } from "@/components/shared/layout/SidebarScaffold";
import AlexFloating from "@/components/shared/AlexFloating";
import { useTour } from "@/context/useTour";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon:Bot, label: "Chat with Coaches" },
  { to: ROUTES.COACHES, icon: TableProperties, label: "Manage Coaches" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "My Documents" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
];
export default function UserLayout({ children, className }: UserLayoutProps) {
  const { isRunning } = useTour();
  return (
    <SidebarScaffold
      navItems={NAV_ITEMS}
      className={className}
      expandOnPath={ROUTES.HOME}
      renderAfterContent={!isRunning ? <AlexFloating /> : null}
    >
      {children}
    </SidebarScaffold>
  );
}
