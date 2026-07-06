import { useState, type JSX } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MeridianQuickChip {
  label: string;
  prompt: string;
}

interface MeridianPanelProps {
  firstName: string;
  onSend: (text: string) => void;
  quickChips: MeridianQuickChip[];
  onQuickChip: (chip: MeridianQuickChip) => void;
  greeting?: string;
}

export function MeridianPanel({
  firstName,
  onSend,
  quickChips,
  onQuickChip,
  greeting,
}: MeridianPanelProps): JSX.Element {
  const [text, setText] = useState<string>("");

  const resolvedGreeting =
    greeting ??
    `Hi ${firstName} — I'm Meridian, and I'll be your guide across everything here.`;

  const submit = (): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] p-4 text-[#0B1B33] shadow-sm">
      {/* mer-head */}
      <div className="flex items-center justify-between border-b border-[rgba(11,27,51,0.10)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#E8932B] to-[#C9711A] text-[#0B1B33] shadow-[0_0_0_4px_rgba(232,147,43,0.16)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
            </svg>
          </div>
          <div>
            <div className="font-serif text-[15px] font-semibold text-[#0B1B33]">
              Meridian
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#7C93B5]">
              <span className="inline-block size-[7px] rounded-full bg-emerald-500" />
              Your mentor · online
            </div>
          </div>
        </div>
      </div>

      {/* mer-body */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        <div className="max-w-[92%] self-start rounded-2xl rounded-bl-sm border border-[rgba(11,27,51,0.10)] bg-[#5B8A72]/10 px-3.5 py-3 text-[13.5px] leading-relaxed text-[#13294B]">
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(232,147,43,0.12)] px-1.5 py-0.5 text-[10.5px] font-bold text-[#C9711A]">
            Meridian
          </span>
          <p>{resolvedGreeting}</p>
        </div>
      </div>

      {/* mer-quick */}
      {quickChips.length > 0 && (
        <div className="flex flex-wrap gap-[7px] pt-3">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onQuickChip(chip)}
              className={cn(
                "rounded-full border border-[rgba(11,27,51,0.10)] bg-white px-2.5 py-1.5 text-left text-[12px] text-[#13294B] transition-colors",
                "hover:border-[#E8932B] hover:text-[#C9711A]",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* mer-input */}
      <div className="flex items-center gap-2.5 pt-3.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message Meridian…"
          aria-label="Message Meridian"
          className="flex-1 rounded-xl border-[1.5px] border-[rgba(11,27,51,0.10)] bg-white px-3.5 py-2.5 text-[14px] text-[#0B1B33] outline-none focus:border-[#E8932B]"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="grid size-[42px] flex-shrink-0 place-items-center rounded-xl bg-[#E8932B] text-[#0B1B33] transition-colors hover:bg-[#C9711A]"
        >
          <Send size={18} />
        </button>
      </div>

      {/* mer-tip */}
      <p className="pt-3 text-center text-[10.5px] text-[#7C93B5]">
        Starter chips send as text — they never trigger voice.
      </p>
    </aside>
  );
}
