import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Lightbulb } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MERIDIAN_STARTER_GROUPS,
  type StarterQuestionGroup,
} from "@/constants/meridianStarterQuestions";

type StarterQuestionsDropdownProps = {
  /**
   * Called with the chosen question. The Meridian chat page injects it into the
   * composer and submits it in one step, so picking a question starts the turn
   * rather than merely prefilling it.
   */
  onSelect: (question: string) => void;
  /** Override the library (tests, future server-resolved ordering). */
  groups?: StarterQuestionGroup[];
  /** Disabled while a turn is in flight — a second send would be dropped. */
  disabled?: boolean;
  className?: string;
};

/**
 * Starter Questions dropdown for the Meridian chat header row.
 *
 * The same persona-grouped library HomeV2 offers on its "Chat with Meridian"
 * tile, brought into the conversation itself: on HomeV2 a starter question is
 * how you *open* a chat, and once you are in the chat the prompts were gone
 * exactly when a stuck user needs them most.
 *
 * Behaviour difference worth noting: HomeV2 navigates to the chat carrying
 * `prefillPrompt` + `autoSubmit` in history state, because it has to change
 * page first. Here we are already on the page, so the parent sends directly —
 * no navigation, no history-state round trip.
 */
export default function StarterQuestionsDropdown({
  onSelect,
  groups = MERIDIAN_STARTER_GROUPS,
  disabled = false,
  className,
}: StarterQuestionsDropdownProps) {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);

  const label = t("meridian.starterQuestions.label", {
    defaultValue: "Starter Questions",
  });

  if (groups.length === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          title={label}
          data-testid="meridian-starter-questions-trigger"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-normal text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <Lightbulb className="size-4" aria-hidden />
          <span>{label}</span>
          <ChevronDown
            aria-hidden
            className={cn("size-4 opacity-60 transition-transform", open && "rotate-180")}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 w-[22rem] overflow-y-auto p-0"
        data-testid="meridian-starter-questions-menu"
      >
        {groups.map((group, groupIndex) => (
          <div
            key={group.category}
            className={cn(groupIndex > 0 && "border-t border-hairline")}
          >
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </p>
            <ul>
              {group.questions.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelect(question);
                    }}
                    className="flex w-full items-start px-3 py-2 text-start text-[13.5px] leading-snug text-foreground transition-colors hover:bg-muted"
                  >
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
