import { useState, type JSX } from "react"

import { ArrowRight, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export interface MeridianQuickChip {
  label: string
  prompt: string
}

export interface MeridianEngageCardProps {
  onAsk: (text: string) => void
  firstName?: string
  greeting?: string
  quickChips?: MeridianQuickChip[]
  onQuickChip?: (chip: MeridianQuickChip) => void
  starterLabel?: string
  placeholder?: string
}

const DEFAULT_STARTER_LABEL = "Starter Questions"
const DEFAULT_PLACEHOLDER = "Ask Meridian anything…"

/**
 * MeridianEngageCard — the "Chat with Meridian" tile on HomeV2.
 *
 * Header: title + live green dot + one-line greeting. Body: a free-text ask
 * box with a navy send button, and a "Starter Questions" dropdown (open by
 * default) listing quick-start categories. Each category calls onQuickChip so
 * the parent can route into the Meridian chat with a prefilled prompt.
 */
export function MeridianEngageCard({
  onAsk,
  firstName,
  greeting,
  quickChips,
  onQuickChip,
  starterLabel = DEFAULT_STARTER_LABEL,
  placeholder = DEFAULT_PLACEHOLDER,
}: MeridianEngageCardProps): JSX.Element {
  const [value, setValue] = useState<string>("")
  const [starterOpen, setStarterOpen] = useState<boolean>(true)

  const resolvedGreeting =
    greeting ??
    `Hi ${firstName ?? "there"} — I'm Meridian, and I'll be your guide across everything here.`

  const submit = (): void => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAsk(trimmed)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      submit()
    }
  }

  const hasChips = !!quickChips && quickChips.length > 0

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-4 shadow-sm md:p-5">
      {/* Header: title + live dot + greeting */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-serif text-lg font-semibold text-[#0B1B33]">
          Chat with Meridian
        </h3>
        <span
          aria-hidden="true"
          className="inline-block size-[8px] flex-shrink-0 rounded-full bg-emerald-500"
        />
        <p className="min-w-0 text-[13px] leading-relaxed text-[#7C93B5]">
          {resolvedGreeting}
        </p>
      </div>

      {/* Ask box + send + starter questions */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Chat with Meridian"
            placeholder={placeholder}
            className="h-14 w-full rounded-xl border border-[rgba(11,27,51,0.14)] bg-white px-4 text-base text-[#0B1B33] placeholder:text-[#7C93B5] focus:outline-none focus:ring-2 focus:ring-[#5B8A72]"
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Send"
            className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B1B33] text-[#FBF7F0] transition-colors hover:bg-[#3E6B55]"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {hasChips && (
          <div className="w-full flex-shrink-0 md:w-60">
            <button
              type="button"
              onClick={() => setStarterOpen((open) => !open)}
              aria-expanded={starterOpen}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] px-4 py-3 text-[14px] font-medium text-[#0B1B33] transition-colors hover:bg-[#F3ECDD]"
            >
              {starterLabel}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 text-[#7C93B5] transition-transform",
                  starterOpen && "rotate-180"
                )}
              />
            </button>
            {starterOpen && (
              <ul className="mt-2 overflow-hidden rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0]">
                {quickChips!.map((chip, index) => (
                  <li key={chip.label}>
                    <button
                      type="button"
                      onClick={() => onQuickChip?.(chip)}
                      className={cn(
                        "flex w-full items-center px-4 py-3 text-left text-[14px] text-[#0B1B33] transition-colors hover:bg-[#F3ECDD]",
                        index > 0 && "border-t border-[rgba(11,27,51,0.08)]"
                      )}
                    >
                      {chip.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
