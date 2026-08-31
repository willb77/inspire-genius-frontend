import { createContext } from "react";

export type SupportAgentContextValue = {
  /** True while the assistant popup is on screen. */
  isOpen: boolean;
  /** Show the assistant. Safe to call when already open. */
  open: () => void;
  /** Hide the assistant. Any in-flight speech is stopped by the popup. */
  close: () => void;
  /** Show if hidden, hide if shown. */
  toggle: () => void;
};

export const SupportAgentContext = createContext<SupportAgentContextValue | undefined>(
  undefined,
);
