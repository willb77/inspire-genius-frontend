// Onboarding component related types

export interface OnboardingScreenProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  nextPath: string;
  overlays?: React.ReactNode; // absolute-positioned overlays relative to image container
}

export interface OnboardingCalloutProps {
  title: string;
  positionClass: string; // e.g., "top-6 left-6". Must be relative to parent container.
  className?: string; // optional extra styles for the bubble container
  icon?: React.ReactNode; // optional icon node
}

export interface OnboardingImageProps {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

export interface ProgressBarProps {
  current: number; // current step (1-indexed)
  total: number;   // total steps
  className?: string;
}

export interface CoachCardProps {
  title: string;
  gender: string;
  accent: string;
  tone: string;
  extraCount?: number; // e.g., 3 for "3+"
  onEdit?: () => void;
}
