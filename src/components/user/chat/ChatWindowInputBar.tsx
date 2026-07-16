import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Mic,
  Pause,
  Play,
  Send,
  SquarePause,
  Volume2,
  VolumeX,
} from "lucide-react";

type ChatWindowInputBarProps = {
  inputText: string;
  onInputTextChange: (value: string) => void;
  onSend: () => void;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  hasAudio?: boolean;
  isAudioPaused?: boolean;
  onToggleAudioPlayback?: () => void;
  isMuted?: boolean;
  onToggleMute?: (next: boolean) => void;
  muteTooltipText: string;
};

// Auto-grow ceiling (px). Past this the textarea scrolls internally.
const TEXTAREA_MAX_PX = 240;

export default function ChatWindowInputBar({
  inputText,
  onInputTextChange,
  onSend,
  onToggleRecording,
  isRecording,
  hasAudio,
  isAudioPaused,
  onToggleAudioPlayback,
  isMuted,
  onToggleMute,
  muteTooltipText,
}: ChatWindowInputBarProps) {
  const { t } = useTranslation("chat");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // IME composition guard. When a user is mid-composition (e.g. Japanese,
  // Chinese, Korean input) Enter should commit the composition, not the
  // chat message. We track both the React-supplied `onCompositionStart`
  // / `onCompositionEnd` events and `event.nativeEvent.isComposing` as a
  // belt-and-braces signal.
  const isComposingRef = useRef(false);

  const recordingIconClass = cn(
    "size-5",
    isRecording ? "text-red-600 animate-pulse" : "text-black",
  );

  const inputPlaceholder = isRecording
    ? ""
    : t("input.placeholder", { defaultValue: "Ask Anything…  (Enter to send · Shift+Enter for newline)" });

  const muteAriaLabel = isMuted
    ? t("input.unmuteCoach", { defaultValue: "Unmute Coach" })
    : t("input.muteCoach", { defaultValue: "Mute Coach" });
  const isMuteDisabled = !!(hasAudio && !isAudioPaused);

  // Resize the textarea to fit its content, capped at TEXTAREA_MAX_PX.
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset before measuring so shrinking works.
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_PX ? "auto" : "hidden";
  }, []);

  // Re-resize whenever the value changes (covers programmatic clears too).
  useEffect(() => {
    resizeTextarea();
  }, [inputText, resizeTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // Shift+Enter: insert newline (default).
    // Block submit while IME composition is in progress. The native
    // `isComposing` flag is set by the browser; `isComposingRef` covers
    // older browsers that don't surface the property on the synthetic event.
    const nativeComposing =
      (e.nativeEvent as KeyboardEvent | undefined)?.isComposing === true;
    if (nativeComposing || isComposingRef.current) return;
    e.preventDefault();
    onSend();
  };

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            disabled={false}
            onClick={() => onToggleRecording?.()}
            aria-label={isRecording ? t("input.stopRecording", { defaultValue: "Stop recording" }) : t("input.startRecording", { defaultValue: "Start recording" })}
            aria-pressed={!!isRecording}
            className="cursor-pointer absolute left-3 top-3 grid place-items-center h-10 w-10 -ml-2 -mt-1 rounded-md hover:bg-muted"
          >
            {isRecording ? (
              <SquarePause className={recordingIconClass} />
            ) : (
              <Mic className={recordingIconClass} />
            )}
          </button>
          <Textarea
            ref={textareaRef}
            placeholder={inputPlaceholder}
            // Tailwind: roomy single-row default, auto-grow handled in JS.
            // `field-sizing-content` from the shadcn textarea handles this
            // in modern browsers — JS resize is a fallback for the rest.
            className={cn(
              "min-h-11 max-h-60 pl-12 pr-3 py-3 rounded-xl bg-gray-100 resize-none",
              "leading-6",
            )}
            rows={1}
            value={inputText}
            disabled={false}
            onChange={(e) => onInputTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
          />
          {isRecording ? (
            <div className="pointer-events-none absolute left-12 right-3 top-3 flex items-end gap-1 h-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-blue-600/80"
                  initial={{ height: 6 }}
                  animate={{ height: [6, 18, 10, 22, 8, 16] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {hasAudio && onToggleAudioPlayback ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={false}
                type="button"
                onClick={onToggleAudioPlayback}
                variant="secondary"
                aria-label={isAudioPaused ? t("common.play", { defaultValue: "Play" }) : t("common.pause", { defaultValue: "Pause" })}
                className="h-10 w-10 p-0"
              >
                {isAudioPaused ? (
                  <Play className="size-5" />
                ) : (
                  <Pause className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="text-xs">{isAudioPaused ? t("common.play", { defaultValue: "Play" }) : t("common.pause", { defaultValue: "Pause" })}</span>
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-10 p-0 hidden"
              onClick={() => {
                if (hasAudio && !isAudioPaused) return;
                const next = !isMuted;
                onToggleMute?.(next);
              }}
              disabled={isMuteDisabled}
              aria-label={muteAriaLabel}
            >
              {isMuted ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-xs">{muteTooltipText}</span>
          </TooltipContent>
        </Tooltip>

        <Button
          disabled={false}
          className="bg-blue-primary hover:bg-blue-primary/90 h-10 w-10 p-0"
          aria-label={t("input.sendMessage", { defaultValue: "Send message" })}
          onClick={onSend}
        >
          <Send className="size-5" />
        </Button>
      </div>
    </div>
  );
}
