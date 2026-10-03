import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useDevConsoleMe } from "@/hooks/dev-console/useDevConsole";
import { canSeeDevConsole } from "./devConsoleView";

const DevConsolePanel = lazy(() => import("./DevConsolePanel"));

interface SupportTabsProps {
  /** The ticket queue, rendered unchanged on the Tickets tab. */
  tickets: ReactNode;
}

/**
 * Help & Support → Tickets | Claude Code.
 *
 * The ticket queue never waits on the access probe: it renders immediately,
 * and the tab bar appears only once the probe says the caller may use the
 * console. Landing on the console route without access sends the caller back
 * to the queue.
 */
export function SupportTabs({ tickets }: SupportTabsProps) {
  const { t } = useTranslation("devConsole");
  const onConsole = Boolean(useMatch(ROUTES.SUPER_ADMIN.SUPPORT_CLAUDE_CODE));
  const { data: me, isLoading } = useDevConsoleMe();
  const allowed = canSeeDevConsole(me);
  const i18nReady = useDevConsoleI18n(allowed);

  if (onConsole && !allowed) {
    if (isLoading) return <Skeleton className="h-40 w-full" />;
    return <Navigate to={ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT} replace />;
  }

  if (onConsole && !i18nReady) return <Skeleton className="h-40 w-full" />;

  return (
    <>
      {allowed && i18nReady ? (
        <nav aria-label={t("tabs.label")} className="mb-4 flex gap-1 border-b">
          <TabLink to={ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT} active={!onConsole}>
            {t("tabs.tickets")}
          </TabLink>
          <TabLink to={ROUTES.SUPER_ADMIN.SUPPORT_CLAUDE_CODE} active={onConsole}>
            {t("tabs.console")}
          </TabLink>
        </nav>
      ) : null}
      {onConsole && me ? (
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <DevConsolePanel me={me} />
        </Suspense>
      ) : (
        tickets
      )}
    </>
  );
}

/**
 * The namespace's 21 locale bundles are fetched only once access is granted,
 * so a super admin without access downloads nothing extra on this page.
 */
function useDevConsoleI18n(allowed: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    import("@/i18n/devConsole")
      .then((mod) => mod.registerDevConsoleI18n())
      // A failed chunk load must not strand the console route on a skeleton;
      // the labels then fall back to their keys, which is ugly but visible.
      .catch(() => undefined)
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [allowed]);
  return ready;
}

function TabLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
