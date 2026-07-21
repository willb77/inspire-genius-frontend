import { useState } from "react"
import { Settings2, Layers, Users, IdCard, Briefcase, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { HonorPageHeader } from "./_shared"
import { CohortsTab } from "./admin/CohortsTab"
import { CoachesTab } from "./admin/CoachesTab"
import { FellowsTab } from "./admin/FellowsTab"
import { CareerAreasTab } from "./admin/CareerAreasTab"

/**
 * Honor Coach Workbench — Administration (super-admin only).
 *
 * A tabbed console over the agent-engine admin API (`/v1/agents/honor/admin`):
 * Cohorts (with an assignment slide-over), Coaches, Fellows, and Career Areas.
 * Each tab is a list + CRUD; every list is read-safe — if its query errors
 * because the admin API isn't deployed in this environment yet, it shows an
 * inline "backend not available" panel instead of crashing.
 *
 * The nav item + route are super-admin gated (see HonorShell + the route guard),
 * so this component assumes the caller already passed that check.
 */

type TabKey = "cohorts" | "coaches" | "fellows" | "career-areas"

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "cohorts", label: "Cohorts", icon: Layers },
  { key: "coaches", label: "Coaches", icon: Users },
  { key: "fellows", label: "Fellows", icon: IdCard },
  { key: "career-areas", label: "Career Areas", icon: Briefcase },
]

export default function HonorAdministration() {
  const [tab, setTab] = useState<TabKey>("cohorts")

  return (
    <div>
      <HonorPageHeader
        icon={Settings2}
        title="Administration"
        description="Manage cohorts, coaches, fellows, and career areas. Assign fellows and coaches to cohorts, and bulk-import rosters."
      />

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-[#dfe4ec]">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-[#E8792B] text-[#1B2A4A]"
                  : "border-b-2 border-transparent text-[#5b6678] hover:text-[#1B2A4A]",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "cohorts" && <CohortsTab />}
      {tab === "coaches" && <CoachesTab />}
      {tab === "fellows" && <FellowsTab />}
      {tab === "career-areas" && <CareerAreasTab />}
    </div>
  )
}
