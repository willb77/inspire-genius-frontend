import React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader as SidebarSectionHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ROUTES, STORAGE_KEYS } from "@/constants/routes";
import { useSidebar } from "@/context/sidebar-context";
import { getUIFlag, setUIFlag } from "@/lib/storage";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  HelpCircle,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UserTopHeader from "@/components/shared/UserTopHeader";
// Import AlexFloating from "@/components/shared/AlexFloating";
// Import { useTour } from "@/context/useTour";

export type UserLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

type NavItemDef = { to: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

const NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.COACHES, icon: Users, label: "Coaches" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "My Documents" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
];

function NavItem({ to, icon: Icon, label }: NavItemDef) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen } = useSidebar();
  const isActive = location.pathname === to;
  const activeClasses = "cursor-pointer !bg-blue-primary !text-white [&>svg]:!text-white";
  const inactiveClasses = "cursor-pointer !bg-transparent !text-[#1A1A1A] [&>svg]:!text-[#1A1A1A]";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => {
          // If Home is clicked and sidebar is collapsed, open it first
          if (to === ROUTES.HOME && !open) {
            setOpen(true);
          }
          navigate(to);
        }}
        aria-label={label}
        className={cn(isActive ? activeClasses : inactiveClasses)}
      >
        <Icon className="shrink-0 " />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarOpenObserver() {
  const { open } = useSidebar();
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setUIFlag(STORAGE_KEYS.UI_SIDEBAR_OPEN, open);
  }, [open]);
  return null;
}

export default function UserLayout({ children, className }: UserLayoutProps) {
  // Const { isRunning } = useTour();
  // Read initial sidebar open state from localStorage
  const [initialSidebarOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return getUIFlag(STORAGE_KEYS.UI_SIDEBAR_OPEN);
  });
  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" data-tour="nav">
        {/* Persist sidebar open/close to localStorage */}
        <SidebarOpenObserver />
        <SidebarSectionHeader className="h-14 px-2 mt-2 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0 mr-auto">
            <img src="/inspire-genius-mobile-logo.svg" alt="logo" className="size-8" />
            <span className="font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">inspiresgenius</span>
          </div>
          <SidebarTrigger className="shrink-0" />
        </SidebarSectionHeader>
        <SidebarContent>
          <SidebarGroup>
            {/* <SidebarGroupLabel>Menu</SidebarGroupLabel> */}
            <SidebarGroupContent className="mt-2">
              <SidebarMenu>
                {(() => {
                  const groups: NavItemDef[][] = [];
                  for (let i = 0; i < NAV_ITEMS.length; i += 2) {
                    groups.push(NAV_ITEMS.slice(i, i + 2));
                  }
                  return groups.map((group, gi) => (
                    <React.Fragment key={`group-${gi}`}>
                      {group.map((item) => (
                        <NavItem key={item.label} {...item} />
                      ))}
                      {gi !== groups.length - 1 && (
                        <SidebarSeparator className="!w-[80%] mx-auto my-4" />
                      )}
                    </React.Fragment>
                  ));
                })()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator className="!w-[80%]" />
        <SidebarFooter>
          <SidebarMenu>
            {/* <NavItem to={"#"} icon={UserCircle2} label="Profile" /> */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button variant="ghost" className="w-full justify-start" type="button">
                  <LogOut className="mr-2 size-4" /> Logout
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={cn("", className)}>
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur">
          <div className="h-14 flex items-center gap-2 px-3">
            <UserTopHeader />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
        {/* {!isRunning && <AlexFloating />} */}
      </SidebarInset>
    </SidebarProvider>
  );
}
