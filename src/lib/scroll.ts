export type ScrollTarget = string | Element | null | undefined;

export function scrollToTarget(target: ScrollTarget, behavior: ScrollBehavior = "smooth"): void {
  let el: Element | null = null;
  if (!target) return;
  if (typeof target === "string") {
    el = document.querySelector(target);
  } else if (target instanceof Element) {
    el = target;
  }
  if (!el) return;
  try {
    (el as HTMLElement).scrollIntoView({ behavior, block: "center", inline: "center" });
  } catch {
    // no-op
  }
}
