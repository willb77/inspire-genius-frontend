/**
 * Goals Studio — the person's own goals surface, inside the platform chrome.
 *
 * Replaces the standalone "Summit" layout (its own dark sidebar, hex colours,
 * a "Goal Setting" pill and a "Back to Home" button) on 2026-09-04 (request:
 * "renamed to Goals Studio … the look and feel as the rest of the IG
 * platform"). The pages render inside the same shell every other studio uses,
 * under a studio header and a pill row for the seven sections. The Summit
 * agent and its routes are unchanged — only the surface is renamed and
 * re-chromed.
 *
 * Reached at /my/goals/* behind ProtectedRoute and open to every role, so the
 * chrome is chosen by the signed-in role rather than fixed to one layout: a
 * manager keeps the manager menu (with "Goals Studio" lit under Tools), a user
 * keeps My Workspace.
 */
import { NavLink, Outlet } from "react-router-dom";
import { Compass, Layers, Flag, Mic, Share2, Users, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/useAuth";
import UserLayout from "@/layouts/UserLayout";
import UnifiedLayout from "@/layouts/UnifiedLayout";
import type { UserRole } from "@/types/roles";
import { useGoalSession, useSummitCategories } from "@/hooks/summit/useGoalSession";

type Section = { to: string; label: string; icon: typeof Compass; badge?: string; end?: boolean };

/**
 * Badges are derived from the live session, not fixed.
 *
 * They previously read "3/5", "4" and "6" for everybody — numbers belonging to
 * the wireframe's fictional user. A count you have not earned is worse than no
 * count: it tells a person who has done nothing that they are most of the way
 * through, and it never moves when they do the work.
 */
function sections(explored: number, total: number, goals: number): Section[] {
  return [
    {
      to: ROUTES.MY_GOALS.BASE,
      label: "My Goals",
      icon: Flag,
      end: true,
      badge: goals > 0 ? String(goals) : undefined,
    },
    { to: ROUTES.MY_GOALS.INTERVIEW, label: "Interview", icon: Mic },
    { to: ROUTES.MY_GOALS.SHARING, label: "Sharing", icon: Share2 },
    { to: ROUTES.MY_GOALS.OVERVIEW, label: "Overview", icon: Compass },
    {
      to: ROUTES.MY_GOALS.DISCOVERY,
      label: "Discovery",
      icon: Layers,
      badge: total ? `${explored}/${total}` : undefined,
    },
    { to: ROUTES.MY_GOALS.COACHES, label: "Coaches", icon: Users },
    // PRISM lens, Progress and Documents used to be three pages of sample
    // data. They are one honest page now (Goals offering, Phase 3).
    { to: ROUTES.MY_GOALS.COMING_SOON, label: "Coming soon", icon: Clock },
  ];
}

/**
 * The signed-in role's own chrome.
 *
 * `UserLayout` already knows how to render a super-admin on a user page (My
 * Workspace first, then Role Views, Tools, Administration — the order
 * SuperAdminLayout uses). Every other role gets `UnifiedLayout` with its own
 * menu and its Tools section, so the "Goals Studio" entry the person clicked
 * is the one that lights up. A missing role renders the plain user chrome.
 */
function RoleChrome({ role, children }: { role: UserRole | undefined; children: React.ReactNode }) {
  if (!role || role === "user" || role === "super-admin") {
    return <UserLayout>{children}</UserLayout>;
  }
  return <UnifiedLayout role={role}>{children}</UnifiedLayout>;
}

export default function GoalsStudioLayout() {
  const { user } = useAuth();
  const { data: session } = useGoalSession();
  const categories = useSummitCategories(session);

  const explored = categories.filter((c) => c.status === "explored").length;
  const SECTIONS = sections(explored, categories.length, session?.goals?.length ?? 0);
  const role = (user?.role ?? undefined) as UserRole | undefined;

  return (
    <RoleChrome role={role}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6" data-testid="goals-studio">
        <header className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Goals Studio</h1>
            <p className="text-sm text-muted-foreground">
              Your goals, the conversation that surfaces them, and who gets to see them.
            </p>
          </div>
        </header>

        <nav aria-label="Goals Studio sections" className="mb-6 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )
              }
            >
              <s.icon className="h-4 w-4" aria-hidden />
              {s.label}
              {s.badge && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  {s.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* The interview used to live in a rail on the right of every page.
            It is its own page (Interview above): the voice-first panel needs
            the width, and goal-setting stays usable on a phone. */}
        <Outlet />
      </div>
    </RoleChrome>
  );
}
