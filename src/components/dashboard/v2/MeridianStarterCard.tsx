import { useState, type JSX } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PersonaChip {
  label: string; // e.g. "Setting goals"
  prompt: string; // the prefilled prompt text to send
}

export interface MeridianStarterCardProps {
  onAsk: (text: string) => void; // fired when user submits the free-text starter
  personas: PersonaChip[]; // quick-start persona chips
  onPersona: (chip: PersonaChip) => void; // fired when a chip is clicked
  placeholder?: string; // default "What would you like to ask Meridian?"
}

export function MeridianStarterCard({
  onAsk,
  personas,
  onPersona,
  placeholder = "What would you like to ask Meridian?",
}: MeridianStarterCardProps): JSX.Element {
  const [value, setValue] = useState<string>("");

  const submit = (): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onAsk(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border border-[rgba(11,27,51,0.10)] rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5B8A72]/12 text-[#3E6B55]">
          <Bot className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B5]">
            Start a conversation
          </div>
          <h2 className="font-serif text-[#0B1B33] text-lg leading-tight">
            {placeholder}
          </h2>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Ask Meridian"
          className={cn(
            "h-11 w-full min-w-0 flex-1 rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] px-4 text-sm text-[#0B1B33] outline-none",
            "placeholder:text-[#7C93B5]",
            "focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/40",
          )}
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send to Meridian"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1B33] text-[#FBF7F0] transition-colors outline-none",
            "hover:bg-[#3E6B55] focus-visible:ring-2 focus-visible:ring-[#5B8A72]/50",
          )}
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {personas.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onPersona(chip)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-[rgba(11,27,51,0.10)] bg-[#5B8A72]/8 px-3 py-1.5 text-sm text-[#0B1B33] transition-colors outline-none",
              "hover:bg-[#5B8A72]/16 focus-visible:ring-2 focus-visible:ring-[#5B8A72]/40",
            )}
          >
            <Sparkles className="size-3.5 text-[#3E6B55]" aria-hidden="true" />
            {chip.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[#4b5f80]">
        Tap a starter, or just tell me what&apos;s on your mind.
      </p>
    </div>
  );
}
