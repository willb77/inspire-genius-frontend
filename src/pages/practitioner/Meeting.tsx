import type React from "react"
import { Video, ScreenShare, CircleDot, FileText } from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Button } from "@/components/ui/button"

type ComingSoonFeature = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  detail: string
}

const COMING_SOON: ComingSoonFeature[] = [
  {
    icon: ScreenShare,
    label: "Screen sharing",
    detail: "Share your screen with a client during a live session.",
  },
  {
    icon: CircleDot,
    label: "Recording",
    detail: "Capture the session for later review and note-taking.",
  },
  {
    icon: FileText,
    label: "Transcription",
    detail: "Automatic transcripts feed the client's coaching record.",
  },
]

export default function PractitionerMeeting() {
  return (
    <PractitionerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Meeting</h1>
      <p className="text-[13px] text-[#6b7280] mb-1">
        Live video coaching sessions with your clients.
      </p>

      <DataCard title="Live meeting">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-[10px] bg-[#EEF1FF] flex items-center justify-center shrink-0">
            <Video className="w-[22px] h-[22px] text-[#3B5BFF]" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#111827]">
              Live video meeting with screen sharing, powered by LiveKit.
            </p>
            <p className="text-[13px] text-[#6b7280] mt-1">
              Meet one-on-one with a client, share your screen, and keep the session
              on the record — all inside Inspire Genius.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-2">
          <Button
            type="button"
            disabled
            className="bg-[#3B5BFF] hover:bg-[#2A47CC] text-white disabled:opacity-50"
          >
            <Video className="w-4 h-4" />
            Start meeting
          </Button>
          <p className="text-[12px] text-[#6b7280]">
            Meetings activate once the IG Live Meetings service is provisioned.
          </p>
        </div>
      </DataCard>

      <DataCard title="Coming soon">
        <ul className="space-y-3">
          {COMING_SOON.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#6b7280]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#111827]">{label}</p>
                <p className="text-[12px] text-[#6b7280]">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </DataCard>
    </PractitionerLayout>
  )
}
