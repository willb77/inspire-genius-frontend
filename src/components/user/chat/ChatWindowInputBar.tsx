import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const recordingIconClass = cn(
    "size-5",
    isRecording ? "text-red-600 animate-pulse" : "text-black"
  );

  const inputPlaceholder = isRecording ? "" : "Ask Anything....";

  const muteAriaLabel = isMuted ? "Unmute Coach" : "Mute Coach";
  const isMuteDisabled = !!(hasAudio && !isAudioPaused);

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            disabled={false}
            onClick={() => onToggleRecording?.()}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            aria-pressed={!!isRecording}
            className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center"
          >
            {isRecording ? (
              <SquarePause className={recordingIconClass} />
            ) : (
              <Mic className={recordingIconClass} />
            )}
          </button>
          <Input
            placeholder={inputPlaceholder}
            className="cursor-pointer h-11 pl-10 pr-10 rounded-xl bg-gray-100"
            value={inputText}
            disabled={false}
            onChange={(e) => onInputTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSend();
              }
            }}
          />
          {isRecording ? (
            <div className="pointer-events-none absolute left-10 right-16 top-1/2 -translate-y-1/2 flex items-end gap-1 h-5">
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
                className="h-11 px-3"
              >
                {isAudioPaused ? (
                  <Play className="size-5" />
                ) : (
                  <Pause className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="text-xs">{isAudioPaused ? "Play" : "Pause"}</span>
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-3 hidden"
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
          className="bg-blue-primary hover:bg-blue-primary/90 h-11 px-3"
          onClick={onSend}
        >
          <Send className="size-5" />
        </Button>
      </div>
    </div>
  );
}
