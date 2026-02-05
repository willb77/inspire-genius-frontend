import React from "react";
import { Loader2, Pause, Volume2 } from "lucide-react";
import type { TourSpeechPhase } from "@/hooks/useTourSpeech";

export const getSpotlightBox = (
  r: DOMRect | null,
  p: number,
  vpW: number,
  vpH: number
) => {
  if (!r) return null;
  return {
    left: Math.max(8, r.left - p),
    top: Math.max(8, r.top - p),
    width: Math.min(vpW - 16, r.width + p * 0.1),
    height: Math.min(vpH - 16, r.height + p * 0),
  };
};

export const isTourOverlayInteractiveTarget = (target: HTMLElement) => {
  return Boolean(
    target.closest("[data-tour-tooltip]") ||
      target.closest("[data-tour-spotlight]")
  );
};

export const handleTourAudioButtonClick = (args: {
  stepId?: string;
  phase: TourSpeechPhase;
  play: (id: string) => void;
  pause: () => void;
  resume: () => void;
}) => {
  const { stepId, phase, play, pause, resume } = args;
  if (!stepId) return;
  if (phase === "speaking") {
    pause();
    return;
  }
  if (phase === "paused") {
    resume();
    return;
  }
  if (phase === "starting") return;
  play(stepId);
};

export const getTourAudioUiState = (phase: TourSpeechPhase, stepId?: string) => {
  let audioAriaLabel = "Play audio";
  if (phase === "speaking") {
    audioAriaLabel = "Pause audio";
  } else if (phase === "paused") {
    audioAriaLabel = "Resume audio";
  } else if (phase === "starting") {
    audioAriaLabel = "Loading audio";
  }

  const audioPulseClassName = phase === "starting" ? "animate-pulse" : "";
  const isAudioButtonDisabled = phase === "starting" || !stepId;

  let audioTooltipText = "Play";
  if (phase === "speaking") {
    audioTooltipText = "Pause";
  } else if (phase === "paused") {
    audioTooltipText = "Resume";
  } else if (phase === "starting") {
    audioTooltipText = "Loading";
  }

  let audioIcon: React.ReactNode = <Volume2 className="w-4 h-4" />;
  if (phase === "starting") {
    audioIcon = <Loader2 className="w-4 h-4 animate-spin" />;
  } else if (phase === "speaking") {
    audioIcon = <Pause className="w-4 h-4" />;
  }

  return {
    audioAriaLabel,
    audioPulseClassName,
    isAudioButtonDisabled,
    audioTooltipText,
    audioIcon,
  };
};
