// Print one turn — the "Print" control next to "Export ▾" on a response.
//
// Deliberately shares `buildTurnHtml` with `exportTurn`, so what comes out of
// the printer is the same document as the Word and PDF downloads rather than a
// screenshot of the app chrome. "Printable" and "downloadable" should not be
// two different-looking artefacts.
//
// Rendered into a hidden same-origin iframe rather than `window.open`: a popup
// blocker silently swallows the second, and the user gets nothing with no error
// to explain it. The iframe is removed once the print dialog closes (or after a
// grace period on browsers that don't fire `afterprint`).

import { buildTurnHtml, type TurnExportInput } from "./exportTurn";

/** How long to keep the iframe alive when `afterprint` never fires. */
const CLEANUP_FALLBACK_MS = 60_000;

export function printTurn(input: TurnExportInput): void {
  if (!input.body?.trim()) {
    throw new Error("Nothing to print — this response has no text.");
  }
  const html = buildTurnHtml(input);

  const frame = document.createElement("iframe");
  // Off-screen rather than `display:none` — Safari refuses to print a frame
  // that was never laid out.
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";

  let cleanedUp = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    // Cancel the backstop when `afterprint` got there first — otherwise it
    // stays pending for a full minute after the frame is already gone.
    if (fallbackTimer !== undefined) clearTimeout(fallbackTimer);
    frame.remove();
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", cleanup);
    // Some browsers return from `print()` synchronously once the dialog is
    // dismissed and never fire `afterprint`; the timer is the backstop. It must
    // not be shorter than a person plausibly spends in the print dialog, or the
    // document is torn out from under them mid-preview.
    fallbackTimer = setTimeout(cleanup, CLEANUP_FALLBACK_MS);
    win.focus();
    win.print();
  };

  document.body.appendChild(frame);
  // srcdoc keeps this same-origin, so `contentWindow.print()` is reachable.
  frame.srcdoc = html;
}
