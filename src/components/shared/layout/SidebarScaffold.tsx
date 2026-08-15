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
import { ChevronDown, ChevronRight, Lock, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UserTopHeader from "@/components/shared/UserTopHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/context/useAuth";
import VoiceDeskWidget from "@/components/shared/VoiceDeskWidget";
import { SupportAgentProvider } from "@/context/SupportAgentProvider";
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
  /**
   * Visible but not usable — the item renders greyed out with a lock and does
   * not navigate. Used for verticals the user has no entitlement for: the
   * catalogue stays discoverable and the gate is legible rather than invisible.
   */
  disabled?: boolean;
  /**
   * Why the item is disabled, shown as its hover title. Defaults to the
   * entitlement wording ("not included in your plan"), which was the only
   * reason an item could be locked until 2026-08-04. Items switched off for
   * other reasons must set this — otherwise the menu tells the user something
   * untrue about their plan.
   */
  disabledReason?: string;
  /**
   * Treat the item as active for any route under this prefix, instead of only
   * on an exact `to` match. A vertical's launcher entry links to its *home*
   * page, so without this it stops looking active the moment you navigate to
   * any other page inside that vertical.
   */
  activePrefix?: string;
};

export type NavSectionDef = {
  label: string;
  items: NavItemDef[];
  /** Render as a clickable header, starting CLOSED. */
  defaultCollapsed?: boolean;
  /**
   * Render as a clickable header starting OPEN. `defaultCollapsed` already
   * implies collapsible-and-closed; this is the other half — used by the active
   * vertical's sub-nav, which opens on arrival but can still be rolled up.
   * Ignored when `defaultCollapsed` is true.
   */
  collapsible?: boolean;
};

export type SidebarScaffoldProps = {
  navItems: NavItemDef[];
  /** Optional grouped sections — if provided, navItems is ignored */
  navSections?: NavSectionDef[];
  children: React.ReactNode;
  className?: string;
  expandOnPath?: string;
  renderAfterContent?: React.ReactNode;
  /**
   * Start with the nav rail collapsed regardless of the stored preference —
   * for content-dense pages that want the width (Meridian Chat). The forced
   * state is not persisted, so other pages keep the user's own setting.
   */
  collapseOnMount?: boolean;
};

function NavItem({ to, icon: Icon, label, state, disabled, disabledReason, activePrefix, expandOnPath }: NavItemDef & { expandOnPath?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen } = useSidebar();
  const isActive = activePrefix
    ? location.pathname.startsWith(activePrefix)
    : location.pathname === to;
  const activeClasses = "cursor-pointer !bg-ink !text-white [&>svg]:!text-white";
  const inactiveClasses = "cursor-pointer !bg-transparent !text-[#1A1A1A] [&>svg]:!text-[#1A1A1A] glow-border-hover";
  // Locked (no entitlement): still listed so the catalogue is discoverable, but
  // greyed, non-navigating, and announced as disabled to assistive tech.
  const lockedClasses =
    "!bg-transparent !text-[#1A1A1A]/40 [&>svg]:!text-[#1A1A1A]/40 cursor-not-allowed hover:!bg-transparent";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={!disabled && isActive}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        title={disabled ? disabledReason ?? `${label} — not included in your plan` : undefined}
        onClick={() => {
          if (disabled) return;
          if (expandOnPath && to === expandOnPath && !open) {
            setOpen(true);
          }
          navigate(to, state ? { state } : undefined);
        }}
        aria-label={label}
        className={cn("py-2.5", disabled ? lockedClasses : isActive ? activeClasses : inactiveClasses)}
      >
        <Icon className="shrink-0 " />
        <span>{label}</span>
        {disabled && (
          <Lock className="ms-auto size-3.5 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
        )}
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
  // `defaultCollapsed` wins: a section is either collapsible-and-closed or
  // (via `collapsible`) collapsible-and-open.
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

function SidebarOpenObserver({ skipFirstWrite }: { skipFirstWrite?: boolean }) {
  const { open } = useSidebar();
  // When a page force-collapses the sidebar on mount (`collapseOnMount`), the
  // forced state is a per-page presentation choice, NOT a preference change —
  // persisting it would leave every other page collapsed too. Skip that first
  // write; any subsequent toggle IS the user's intent and persists normally.
  const skipped = React.useRef(!skipFirstWrite);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!skipped.current) {
      skipped.current = true;
      return;
    }
    setUIFlag(STORAGE_KEYS.UI_SIDEBAR_OPEN, open);
  }, [open]);
  return null;
}

export default function SidebarScaffold({ navItems, navSections, children, className, expandOnPath, renderAfterContent, collapseOnMount }: SidebarScaffoldProps) {
  const [initialSidebarOpen] = React.useState(() => {
    if (collapseOnMount) return false;
    if (typeof window === 'undefined') return true;
    return getUIFlag(STORAGE_KEYS.UI_SIDEBAR_OPEN);
  });
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  // Toast on newly-arrived broadcast alerts (mounted once, app-wide).
  useNotificationToasts();
  return (
    <SupportAgentProvider userLabel={user?.name || undefined}>
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" data-tour="nav">
        <SidebarOpenObserver skipFirstWrite={collapseOnMount} />
        <SidebarSectionHeader className="h-14 px-2 mt-2 flex items-center gap-2 justify-between">
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            aria-label="Go to home"
            className="flex items-center gap-2 min-w-0 mr-auto hover:opacity-80 transition-opacity"
          >
            <img src="/Icon-Dark.svg" alt="Inspire Genius" className="size-8" />
            <span className="font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">inspiresgenius</span>
          </button>
          <SidebarTrigger className="shrink-0" />
        </SidebarSectionHeader>
        <SidebarContent>
          {navSections ? (
            navSections.map((section, si) => {
              const showSeparator = si < navSections.length - 1;
              if (section.defaultCollapsed || section.collapsible) {
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
                    // Hidden in icon mode, same as CollapsibleNavSection's
                    // header — otherwise the label clips to "MY WOR" / "VERT"
                    // in the 48px rail. Newly load-bearing: Meridian Chat now
                    // opens with the rail collapsed.
                    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
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
      {/* The warm tan (#FBF7F0) was HomeV2's own page background; as of
          2026-08-06 it is the app background for every page rendered through
          this scaffold, on request. Applied here rather than page-by-page so a
          new page inherits it instead of quietly shipping on white.
          HomeV2's own wrapper was removed at the same time — nesting the same
          colour twice just paid for an extra rounded box. */}
      <SidebarInset className={cn("bg-[#FBF7F0]", className)}>
        <div className="sticky top-0 z-20 bg-[#FBF7F0]/80 backdrop-blur">
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
    </SupportAgentProvider>
  );
}
