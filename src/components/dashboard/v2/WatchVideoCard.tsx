import { useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { Clock, Play } from "lucide-react"

import { cn } from "@/lib/utils"

export interface DashboardVideo {
  id: string
  title: string
  src: string
  duration?: string
}

interface WatchVideoCardProps {
  videos: DashboardVideo[]
  onSelect?: (video: DashboardVideo) => void
}

export function WatchVideoCard({
  videos,
  onSelect,
}: WatchVideoCardProps): JSX.Element {
  const { t } = useTranslation("dashboard")
  const [selectedId, setSelectedId] = useState<string>(videos[0]?.id ?? "")

  const selected =
    videos.find((video) => video.id === selectedId) ?? videos[0] ?? null

  const handleSelect = (video: DashboardVideo): void => {
    setSelectedId(video.id)
    onSelect?.(video)
  }

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-4 shadow-sm">
      <h3 className="font-serif text-base text-[#0B1B33]">
        {t("homeV2.watchVideo", { defaultValue: "Watch a Video" })}
      </h3>

      {selected ? (
        <>
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video
              key={selected.id}
              src={selected.src}
              controls
              preload="metadata"
              playsInline
              className="h-full w-full bg-black object-contain"
              aria-label={selected.title}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {videos.map((video) => {
              const isActive = video.id === selected.id
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleSelect(video)}
                  aria-pressed={isActive}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-xl border border-[rgba(11,27,51,0.10)] bg-white text-left transition",
                    isActive
                      ? "ring-2 ring-[#5B8A72]"
                      : "hover:border-[rgba(91,138,114,0.4)]"
                  )}
                >
                  <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#13294B] to-[#3E6B55]">
                    <Play className="size-4 fill-white/90 text-white/90" />
                  </div>
                  <div className="min-w-0 p-2">
                    <p className="truncate text-xs font-medium text-[#0B1B33]">
                      {video.title}
                    </p>
                    {video.duration ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#4b5f80]">
                        <Clock className="size-3 text-[#7C93B5]" />
                        {video.duration}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="mt-3 flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-[rgba(11,27,51,0.10)] bg-[#FBF7F0]">
          <p className="text-sm text-[#7C93B5]">
            {t("homeV2.noVideos", { defaultValue: "No videos available yet." })}
          </p>
        </div>
      )}
    </div>
  )
}
