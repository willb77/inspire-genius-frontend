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
import { ChevronDown, ChevronRight, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UserTopHeader from "@/components/shared/UserTopHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/context/useAuth";
import VoiceDeskWidget from "@/components/shared/VoiceDeskWidget";
import { BroadcastAlertBanner } from "@/components/shared/BroadcastAlertBanner";
import { useNotificationToasts } from "@/hooks/useNotificationInbox";

export type NavItemDef = {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /**
   * Optional route state forwarded to react-router on navigation.
   * Used e.g. by the "Chat with Meridian" nav entry to pass
   * `{ autoLoadPrism: true }` so MeridianChat auto-attaches the
   * user's most recent PRISM CSV on mount.
   */
  state?: Record<string, unknown>;
};

export type NavSectionDef = {
  label: string;
  items: NavItemDef[];
  /** When true, the section renders as a clickable header that expands/collapses its items. */
  defaultCollapsed?: boolean;
};

export type SidebarScaffoldProps = {
  navItems: NavItemDef[];
  /** Optional grouped sections — if provided, navItems is ignored */
  navSections?: NavSectionDef[];
  children: React.ReactNode;
  className?: string;
  expandOnPath?: string;
  renderAfterContent?: React.ReactNode;
};

function NavItem({ to, icon: Icon, label, state, expandOnPath }: NavItemDef & { expandOnPath?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen } = useSidebar();
  const isActive = location.pathname === to;
  const activeClasses = "cursor-pointer !bg-ink !text-white [&>svg]:!text-white";
  const inactiveClasses = "cursor-pointer !bg-transparent !text-[#1A1A1A] [&>svg]:!text-[#1A1A1A] glow-border-hover";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => {
          if (expandOnPath && to === expandOnPath && !open) {
            setOpen(true);
          }
          navigate(to, state ? { state } : undefined);
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

function CollapsibleNavSection({
  section,
  showSeparator,
  expandOnPath,
}: {
  section: NavSectionDef;
  showSeparator: boolean;
  expandOnPath?: string;
}) {
  const [open, setOpen] = React.useState(!section.defaultCollapsed);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <SidebarGroup>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
      >
        <span>{section.label}</span>
        <Chevron className="size-3.5 shrink-0" />
      </button>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu>
            {section.items.map((item) => (
              <NavItem key={item.to} {...item} expandOnPath={expandOnPath} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
      {showSeparator && <SidebarSeparator className="!w-[80%] mx-auto my-2" />}
    </SidebarGroup>
  );
}

function MobileMenuTrigger() {
  const { toggleSidebar, isMobile } = useSidebar();
  if (!isMobile) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Open menu"
      className="md:hidden size-11 shrink-0"
    >
      <Menu className="size-5" />
    </Button>
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
  const { logout, user } = useAuth();
  // Toast on newly-arrived broadcast alerts (mounted once, app-wide).
  useNotificationToasts();
  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" data-tour="nav">
        <SidebarOpenObserver />
        <SidebarSectionHeader className="h-14 px-2 mt-2 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0 mr-auto">
            <img src="/Icon-Dark.svg" alt="Inspire Genius" className="size-8" />
            <span className="font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">inspiresgenius</span>
          </div>
          <SidebarTrigger className="shrink-0" />
        </SidebarSectionHeader>
        <SidebarContent>
          {navSections ? (
            navSections.map((section, si) => {
              const showSeparator = si < navSections.length - 1;
              if (section.defaultCollapsed) {
                return (
                  <CollapsibleNavSection
                    key={section.label}
                    section={section}
                    showSeparator={showSeparator}
                    expandOnPath={expandOnPath}
                  />
                );
              }
              return (
                <SidebarGroup key={section.label || `group-${si}`}>
                  {section.label && (
                    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </div>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <NavItem key={item.to} {...item} expandOnPath={expandOnPath} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  {showSeparator && (
                    <SidebarSeparator className="!w-[80%] mx-auto my-2" />
                  )}
                </SidebarGroup>
              );
            })
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
            <MobileMenuTrigger />
            <UserTopHeader />
          </div>
          <BroadcastAlertBanner />
        </div>
        <div className="flex-1 p-4 md:p-6">{children}</div>
        {renderAfterContent}
        <VoiceDeskWidget userId={user?.id} role={user?.role as string | undefined} />
      </SidebarInset>
    </SidebarProvider>
  );
}
