/**
 * Summit — Goal Setting surface layout.
 *
 * A self-contained three-column surface (sub-nav · content · Meridian chat)
 * mirroring the delivered wireframe, rendered with platform Tailwind tokens.
 * Reached at /summit/* behind ProtectedRoute (user role).
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Compass,
  Layers,
  Brain,
  Flag,
  Users,
  FileText,
  TrendingUp,
  Mountain,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import SummitInterviewPanel from "@/components/summit/SummitInterviewPanel";
import { useAuth } from "@/context/useAuth";
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
    { to: ROUTES.SUMMIT.DASHBOARD, label: "Dashboard", icon: Compass, end: true },
    {
      to: ROUTES.SUMMIT.DISCOVERY,
      label: "Discovery",
      icon: Layers,
      badge: total ? `${explored}/${total}` : undefined,
    },
    { to: ROUTES.SUMMIT.PRISM, label: "PRISM Lens", icon: Brain },
    {
      to: ROUTES.SUMMIT.GOALS,
      label: "My Goals",
      icon: Flag,
      badge: goals > 0 ? String(goals) : undefined,
    },
    { to: ROUTES.SUMMIT.COACHES, label: "Coaches", icon: Users },
    { to: ROUTES.SUMMIT.DOCUMENTS, label: "Documents", icon: FileText },
    { to: ROUTES.SUMMIT.PROGRESS, label: "Progress", icon: TrendingUp },
  ];
}

/** Initials from a display name, for the avatar. "" when there's no name. */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function SummitLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: session } = useGoalSession();
  const categories = useSummitCategories(session);

  const explored = categories.filter((c) => c.status === "explored").length;
  const SECTIONS = sections(
    explored,
    categories.length,
    session?.goals?.length ?? 0
  );

  const displayName = (user?.name ?? user?.fullName ?? "").trim();
  const initials = initialsOf(displayName);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF7F0]">
      {/* Sub-nav */}
      <aside className="flex w-60 flex-shrink-0 flex-col bg-[#0B1B33] p-3.5 text-slate-100">
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#127A8A] to-[#0E5F6B] text-white">
            <Mountain className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-lg font-semibold leading-none">Summit</div>
            <div className="text-[10px] tracking-wide text-slate-400">Goal Setting</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#127A8A]/20 font-semibold text-[#7FD3DF]"
                    : "text-slate-300/70 hover:bg-white/5 hover:text-slate-100",
                )
              }
            >
              <s.icon className="h-[18px] w-[18px]" />
              <span>{s.label}</span>
              {s.badge && (
                <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {s.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-2.5 border-t border-white/10 pt-3.5">
          {/* The signed-in person. This block used to render a fictional name
              and job title from the wireframe for every user. */}
          {displayName && (
            <div className="mb-3 flex items-center gap-2.5 px-1">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#127A8A] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                {user?.email && (
                  <div className="truncate text-[11px] text-slate-400">{user.email}</div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[12.5px] text-slate-300 transition-colors hover:bg-white/10"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Home
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-[#FBF7F0] px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="text-slate-400">Summit</span>
            <span className="text-slate-300">/</span>
            <span>Goal Setting</span>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#0B1B33] px-3 py-1.5 text-[11px] font-bold text-[#7FD3DF]">
            <Mountain className="h-3 w-3" /> Goal Setting
          </span>
        </header>

        {/* The interview stacks under the content below `lg` rather than being
            hidden. It was `hidden lg:flex`, which was defensible when the panel
            was an optional chat companion — but the interview is the way goals
            get made, and hiding it made goal-setting a desktop-only feature. */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex-1 overflow-y-auto px-6 py-7 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <Outlet />
            </div>
          </div>
          <div className="flex w-full flex-shrink-0 border-t lg:w-[344px] lg:border-t-0">
            <SummitInterviewPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
