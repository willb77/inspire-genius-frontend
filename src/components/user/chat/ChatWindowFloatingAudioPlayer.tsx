import { AudioPlayer } from "@/components/shared/audio-player/audio-player";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type ChatWindowFloatingAudioPlayerProps = {
  audioPlayerBuffer?: AudioBuffer | null;
  showAudioPlayer?: boolean;
  onCloseAudioPlayer?: () => void;
};

export default function ChatWindowFloatingAudioPlayer({
  audioPlayerBuffer,
  showAudioPlayer,
  onCloseAudioPlayer,
}: ChatWindowFloatingAudioPlayerProps) {
  const { t } = useTranslation("chat");
  if (!audioPlayerBuffer || !showAudioPlayer) return null;

  return (
    <div className="px-3">
      <div className="relative">
        <button
          type="button"
          aria-label={t("audio.close", { defaultValue: "Close audio player" })}
          className="cursor-pointer p-0.5 absolute z-10 -right-0.5 bg-blue-900 rounded-full -top-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => onCloseAudioPlayer?.()}
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <AudioPlayer audioBuffer={audioPlayerBuffer} autoPlay deferReloadWhilePlaying />
      </div>
    </div>
  );
}
