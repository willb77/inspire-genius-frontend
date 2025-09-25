import { createContext } from "react";

export type TourStep = {
  selector: string;
  title: string;
  description: string;
  image?: string;
  padding?: number;
  // Optional route to ensure before showing this step
  route?: string;
  // Optional Tailwind classes to position the tooltip container
  tooltipClassName?: string;
  // Optional Tailwind classes to position/size the illustration image
  imageClassName?: string;
  increasePadding?: string;
};

export type TourContextValue = {
  start: (steps?: TourStep[]) => void;
  stop: () => void;
  isRunning: boolean;
  step: TourStep | null;
};

export const TourContext = createContext<TourContextValue | null>(null);
