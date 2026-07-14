/**
 * The Honor Foundation — Coach Workbench shell (reskin chrome).
 *
 * A self-contained, co-branded navy surface mirroring the delivered THF
 * wireframe: navy topbar (THF wordmark + "Powered by Inspires Genius" + coach
 * chip) and a grouped navy sidebar (Overview · Work with members · Member
 * workspace · Account), wrapping the routed page in `<Outlet/>`. Modeled on the
 * Summit vertical's self-contained layout, but reskinned to the THF identity.
 *
 * The whole surface is wrapped in `.vertical-honor` so the reskin tokens
 * (navy/orange/Inter) apply here and never leak into the rest of the app. The
 * FUNCTIONAL components rendered inside (PRISM snapshot, Meridian chat panel,
 * documents) are the platform's real components — only this chrome is new.
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Shield,
  LayoutDashboard,
  Users,
  UserPlus,
  Sparkles,
  Activity,
  CalendarDays,
  IdCard,
  Settings2,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useAuth } from "@/context/useAuth"
import { MOCK_COACH } from "@/hooks/honor/mocks"
import { initials } from "./_format"

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: ROUTES.HONOR.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
      { to: ROUTES.HONOR.CASELOAD, label: "My Members", icon: Users },
      { to: ROUTES.HONOR.ONBOARD, label: "Onboarding", icon: UserPlus },
    ],
  },
  {
    label: "Work with members",
    items: [
      { to: ROUTES.HONOR.EVALUATE, label: "Evaluate Member", icon: Sparkles },
      { to: ROUTES.HONOR.ACTIVITY, label: "Activity", icon: Activity },
      { to: ROUTES.HONOR.SCHEDULE, label: "Schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Member workspace",
    items: [{ to: ROUTES.HONOR.MEMBER, label: "Member Profile", icon: IdCard }],
  },
  {
    label: "Account",
    items: [{ to: ROUTES.HONOR.ADMINISTRATION, label: "Administration", icon: Settings2 }],
  },
]

export default function HonorShell() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const coachName = user?.fullName || user?.name || MOCK_COACH.name
  const coachTitle = MOCK_COACH.title
  const coachInitials = initials(coachName) || MOCK_COACH.initials

  return (
    <div className="vertical-honor flex h-screen flex-col overflow-hidden bg-[#f6f7f9] text-[#18202f]">
      {/* Topbar */}
      <header className="flex h-16 flex-shrink-0 items-center gap-4 bg-[#1B2A4A] px-5 text-white">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#E8792B] text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">The Honor Foundation</div>
            <div className="text-[10px] uppercase tracking-wide text-white/60">Coach Workbench</div>
          </div>
        </div>

        <div className="ml-3 hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 sm:flex">
          <span className="text-[10px] uppercase tracking-wide text-white/50">Powered by</span>
          <span className="text-xs font-semibold text-[#7Fb0d6]">Inspires Genius</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold">Coach · {coachName}</div>
            <div className="text-[11px] text-white/60">{coachTitle}</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#E8792B] text-sm font-bold text-white">
            {coachInitials}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-60 flex-shrink-0 flex-col overflow-y-auto bg-[#22345c] p-3.5 text-slate-100">
          <nav className="flex flex-1 flex-col gap-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group.label}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[#E8792B] font-semibold text-white"
                            : "text-slate-200/75 hover:bg-white/5 hover:text-white"
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-3 border-t border-white/10 pt-3.5">
            <p className="mb-3 px-1 text-[11px] leading-relaxed text-white/45">
              Meridian orchestrates all AI output. Members see one voice; you see the agent trace.
            </p>
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[12.5px] text-slate-200 transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Inspire Genius
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-7 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
