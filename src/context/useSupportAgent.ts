import { useContext } from "react";

import { SupportAgentContext } from "./support-agent-context";

/**
 * Open the floating Meridian support assistant from any page.
 *
 *   const { open } = useSupportAgent()
 *   <Button onClick={open}>Speak with Support</Button>
 *
 * Falls back to a no-op outside the provider rather than throwing: the trigger
 * is a convenience affordance and a page that renders it in a bare test
 * harness should not crash. `isOpen` is always false in that case.
 */
export function useSupportAgent() {
  const ctx = useContext(SupportAgentContext);
  if (!ctx) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
