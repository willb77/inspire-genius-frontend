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
import { STORAGE_KEYS } from "@/constants/routes";
import { useSidebar } from "@/context/sidebar-context";
import { getUIFlag, setUIFlag } from "@/lib/storage";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UserTopHeader from "@/components/shared/UserTopHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/context/useAuth";

export type NavItemDef = { to: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

export type NavSectionDef = { label: string; items: NavItemDef[] };

export type SidebarScaffoldProps = {
  navItems: NavItemDef[];
  /** Optional grouped sections — if provided, navItems is ignored */
  navSections?: NavSectionDef[];
  children: React.ReactNode;
  className?: string;
  expandOnPath?: string;
  renderAfterContent?: React.ReactNode;
};

function NavItem({ to, icon: Icon, label, expandOnPath }: NavItemDef & { expandOnPath?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen } = useSidebar();
  const isActive = location.pathname === to;
  const activeClasses = "cursor-pointer !bg-blue-primary !text-white [&>svg]:!text-white";
  const inactiveClasses = "cursor-pointer !bg-transparent !text-[#1A1A1A] [&>svg]:!text-[#1A1A1A] glow-border-hover";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => {
          if (expandOnPath && to === expandOnPath && !open) {
            setOpen(true);
          }
          navigate(to);
        }}
        aria-label={label}
        className={cn("py-2.5",isActive ? activeClasses : inactiveClasses)}
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

export default function SidebarScaffold({ navItems, navSections, children, className, expandOnPath, renderAfterContent }: SidebarScaffoldProps) {
  const [initialSidebarOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return getUIFlag(STORAGE_KEYS.UI_SIDEBAR_OPEN);
  });
  const { logout } = useAuth();
  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" data-tour="nav">
        <SidebarOpenObserver />
        <SidebarSectionHeader className="h-14 px-2 mt-2 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0 mr-auto">
            <img src="/inspire-genius-mobile-logo.svg" alt="logo" className="size-8" />
            <span className="font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">inspiresgenius</span>
          </div>
          <SidebarTrigger className="shrink-0" />
        </SidebarSectionHeader>
        <SidebarContent>
          {navSections ? (
            navSections.map((section, si) => (
              <SidebarGroup key={section.label}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <NavItem key={item.to} {...item} expandOnPath={expandOnPath} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
                {si < navSections.length - 1 && (
                  <SidebarSeparator className="!w-[80%] mx-auto my-2" />
                )}
              </SidebarGroup>
            ))
          ) : (
            <SidebarGroup>
              <SidebarGroupContent className="mt-2">
                <SidebarMenu>
                  {navItems.map((item) => (
                    <NavItem key={item.to} {...item} expandOnPath={expandOnPath} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarSeparator className="!w-[80%]" />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <ConfirmDialog
                title="Log out"
                description="Are you sure you want to log out?"
                confirmText="Log out"
                onConfirm={logout}
                trigger={
                  <SidebarMenuButton asChild>
                    <Button variant="ghost" className="w-full justify-start" type="button">
                      <LogOut className="mr-2 size-4" /> Logout
                    </Button>
                  </SidebarMenuButton>
                }
              />
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
        <div className="flex-1 p-4 md:p-6">{children}</div>
        {renderAfterContent}
      </SidebarInset>
    </SidebarProvider>
  );
}
