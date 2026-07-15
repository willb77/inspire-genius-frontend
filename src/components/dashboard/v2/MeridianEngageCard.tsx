import { useState, type JSX } from "react"

import { ArrowRight, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { StarterQuestionGroup } from "@/constants/meridianStarterQuestions"

export type { StarterQuestionGroup }

export interface MeridianEngageCardProps {
  onAsk: (text: string) => void
  firstName?: string
  greeting?: string
  starterGroups?: StarterQuestionGroup[]
  onStarterQuestion?: (question: string) => void
  starterLabel?: string
  placeholder?: string
  /** Whether the Starter Questions dropdown starts expanded. Default: true. */
  defaultStarterOpen?: boolean
}

const DEFAULT_STARTER_LABEL = "Starter Questions"
const DEFAULT_PLACEHOLDER = "Ask Meridian anything…"

/**
 * MeridianEngageCard — the "Chat with Meridian" tile on HomeV2.
 *
 * Header: title + live green dot + one-line greeting. Body: a free-text ask box
 * with a navy send button, and a "Starter Questions" dropdown listing persona
 * starter prompts grouped by category. Selecting a starter question (or sending
 * a typed one) calls the parent, which routes into the Meridian chat with the
 * text prefilled and auto-submitted.
 */
export function MeridianEngageCard({
  onAsk,
  firstName,
  greeting,
  starterGroups,
  onStarterQuestion,
  starterLabel = DEFAULT_STARTER_LABEL,
  placeholder = DEFAULT_PLACEHOLDER,
  defaultStarterOpen = true,
}: MeridianEngageCardProps): JSX.Element {
  const [value, setValue] = useState<string>("")
  const [starterOpen, setStarterOpen] = useState<boolean>(defaultStarterOpen)

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

  const hasStarters = !!starterGroups && starterGroups.length > 0

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

      {/* Ask box + send + starter-questions toggle */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Chat with Meridian"
          placeholder={placeholder}
          className="h-14 min-w-0 flex-1 rounded-xl border border-[rgba(11,27,51,0.14)] bg-white px-4 text-base text-[#0B1B33] placeholder:text-[#7C93B5] focus:outline-none focus:ring-2 focus:ring-[#5B8A72]"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B1B33] text-[#FBF7F0] transition-colors hover:bg-[#3E6B55]"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {hasStarters && (
          <button
            type="button"
            onClick={() => setStarterOpen((open) => !open)}
            aria-expanded={starterOpen}
            className="inline-flex h-14 flex-shrink-0 items-center justify-between gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] px-4 text-[14px] font-medium text-[#0B1B33] transition-colors hover:bg-[#F3ECDD] sm:w-52"
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
        )}
      </div>

      {/* Grouped starter questions */}
      {hasStarters && starterOpen && (
        <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0]">
          {starterGroups!.map((group, groupIndex) => (
            <div
              key={group.category}
              className={cn(
                groupIndex > 0 && "border-t border-[rgba(11,27,51,0.10)]"
              )}
            >
              <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#7C93B5]">
                {group.category}
              </p>
              <ul>
                {group.questions.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={() => onStarterQuestion?.(question)}
                      className="flex w-full items-center px-4 py-2.5 text-left text-[13.5px] leading-snug text-[#0B1B33] transition-colors hover:bg-[#F3ECDD]"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
