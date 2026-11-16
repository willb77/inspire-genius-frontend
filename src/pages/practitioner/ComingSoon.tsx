import type { ComponentType } from "react"
import { useTranslation } from "react-i18next"
import { CalendarDays, Video } from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DashboardFrame from "@/components/dashboard/DashboardFrame"
import DataCard from "@/components/dashboard/DataCard"

type Variant = {
  title: string
  blurb: string
  icon: ComponentType<{ className?: string }>
}

export type PractitionerComingSoonProps = { variant: "schedule" | "meeting" }

/**
 * Clickable placeholders for the Practitioner nav items whose full surfaces land
 * in later phases (Schedule = Phase 4, Meeting = Phase 5). Keeps the menu fully
 * navigable without pretending the feature exists yet.
 */
export default function PractitionerComingSoon({ variant }: PractitionerComingSoonProps) {
  const { t } = useTranslation("practitionerPages")
  const VARIANTS: Record<"schedule" | "meeting", Variant> = {
    schedule: {
      title: t("comingSoon.schedule.title", { defaultValue: "Schedule" }),
      blurb:
        t("comingSoon.schedule.blurb", { defaultValue: "Bulk-schedule sessions with clients — pick a cohort, set start time, duration and spacing, add a topic and message, and email .ics invites (with you cc'd). Wiring to the shared coach scheduling backend lands in a later phase." }),
      icon: CalendarDays,
    },
    meeting: {
      title: t("comingSoon.meeting.title", { defaultValue: "Meeting" }),
      blurb:
        t("comingSoon.meeting.blurb", { defaultValue: "Launch a live video meeting room with screen sharing (LiveKit). This surface activates once the IG Live Meetings service is provisioned." }),
      icon: Video,
    },
  }
  const v = VARIANTS[variant]
  const Icon = v.icon
  return (
    <PractitionerLayout>
      <DashboardFrame
        title={v.title}
        subtitle={t("comingSoon.subtitle", { defaultValue: "Wireframe — coming soon" })}
        primary={
          <DataCard title={v.title}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-[#111827] mb-1">{t("comingSoon.onTheWay", { title: v.title, defaultValue: "{{title}} is on the way" })}</p>
              <p className="text-sm text-muted-foreground max-w-md">{v.blurb}</p>
            </div>
          </DataCard>
        }
      />
    </PractitionerLayout>
  )
}
