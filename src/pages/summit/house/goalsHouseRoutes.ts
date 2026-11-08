/**
 * House style, goals area (S2b) — which of the seven Goals Studio sections
 * survive as the three house-style pills, and where the other four go.
 *
 * Display only. Every route stays registered; with the `goals` switch OFF
 * nothing here is consulted and all seven sections render as today. With it
 * ON the layout shows three pills and sends the four folded paths on:
 *   - Overview and Discovery fold into "Talk it through" (the interview, with
 *     the progress strip above it), so they go to the interview;
 *   - Coaches and Coming soon go, so they land on My goals.
 */
import { ROUTES } from "@/constants/routes";

export const HOUSE_GOALS_REDIRECTS: Readonly<Record<string, string>> = {
  [ROUTES.MY_GOALS.OVERVIEW]: ROUTES.MY_GOALS.INTERVIEW,
  [ROUTES.MY_GOALS.DISCOVERY]: ROUTES.MY_GOALS.INTERVIEW,
  [ROUTES.MY_GOALS.COACHES]: ROUTES.MY_GOALS.BASE,
  [ROUTES.MY_GOALS.COMING_SOON]: ROUTES.MY_GOALS.BASE,
};

/** Where a folded section's path goes with the switch on, or null to stay. */
export function houseGoalsRedirectFor(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return HOUSE_GOALS_REDIRECTS[path] ?? null;
}
