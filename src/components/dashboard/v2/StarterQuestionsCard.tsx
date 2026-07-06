import { useState, type JSX } from "react"

import { Send } from "lucide-react"

import { cn } from "@/lib/utils"

export interface StarterQuestionsCardProps {
  onAsk: (text: string) => void
  questions: string[]
  onSelectQuestion: (question: string) => void
  engagesLabel?: string
  placeholder?: string
}

const DEFAULT_ENGAGES_LABEL = "MERIDIAN ENGAGES: ALEX · AURA · BRIDGE · ECHO"
const DEFAULT_PLACEHOLDER = "What would you like to ask Meridian?"

export function StarterQuestionsCard({
  onAsk,
  questions,
  onSelectQuestion,
  engagesLabel = DEFAULT_ENGAGES_LABEL,
  placeholder = DEFAULT_PLACEHOLDER,
}: StarterQuestionsCardProps): JSX.Element {
  const [value, setValue] = useState<string>("")

  const submit = (): void => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAsk(trimmed)
    setValue("")
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
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-br from-[#E8932B] to-[#C9711A]"
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#7C93B5]">
          {engagesLabel}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-lg text-[#0B1B33]">{placeholder}</h3>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] px-3 py-2 text-sm text-[#0B1B33] placeholder:text-[#7C93B5] focus:outline-none focus:ring-2 focus:ring-[#5B8A72]"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B1B33] text-[#FBF7F0] transition-colors hover:bg-[#3E6B55]"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {questions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onSelectQuestion(question)}
              className={cn(
                "w-full rounded-full border border-[rgba(11,27,51,0.10)] bg-[#5B8A72]/10 px-4 py-2 text-left text-sm text-[#0B1B33] transition-colors",
                "hover:bg-[#5B8A72]/20"
              )}
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
