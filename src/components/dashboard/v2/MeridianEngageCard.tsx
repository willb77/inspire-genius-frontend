import { useState, type JSX } from "react"

import { ArrowRight, Bot, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

export interface MeridianEngageCardProps {
  onAsk: (text: string) => void
  onAssessment: () => void
  heroPrompt?: string
  engagesLabel?: string
  title?: string
  assessmentLabel?: string
}

const DEFAULT_HERO_PROMPT =
  "I don't know what I want to do — how do I even start?"
const DEFAULT_ENGAGES_LABEL = "MERIDIAN ENGAGES: ALEX · AURA · BRIDGE · ECHO"
const DEFAULT_TITLE = "What would you like to ask Meridian?"
const DEFAULT_ASSESSMENT_LABEL = "Take your PRISM assessment"

export function MeridianEngageCard({
  onAsk,
  onAssessment,
  heroPrompt = DEFAULT_HERO_PROMPT,
  engagesLabel = DEFAULT_ENGAGES_LABEL,
  title = DEFAULT_TITLE,
  assessmentLabel = DEFAULT_ASSESSMENT_LABEL,
}: MeridianEngageCardProps): JSX.Element {
  const [value, setValue] = useState<string>(heroPrompt)

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

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E8932B] text-white"
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#C9711A]">
            {engagesLabel}
          </span>
          <h3 className="font-serif text-lg text-[#0B1B33]">{title}</h3>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Sparkles
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C9711A]"
          />
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={title}
            className="h-12 w-full rounded-xl border border-[rgba(11,27,51,0.10)] bg-white pl-9 pr-3 text-base text-[#0B1B33] placeholder:text-[#7C93B5] focus:outline-none focus:ring-2 focus:ring-[#5B8A72]"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B1B33] text-[#FBF7F0] transition-colors hover:bg-[#3E6B55]"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onAssessment}
        className={cn(
          "mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#E8932B] px-4 py-3 text-sm font-semibold text-white transition-colors",
          "hover:bg-[#C9711A] focus:outline-none focus:ring-2 focus:ring-[#5B8A72]"
        )}
      >
        {assessmentLabel}
      </button>
    </div>
  )
}
