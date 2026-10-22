// Fit — the two palettes a fit figure is drawn in. Component-free so the
// react-refresh rule stays happy.
//
// Career Fit is teal-branded and uses fixed hex colours; Direction Setting is
// calm and neutral and uses the theme's tokens. FIT-5a moved both here
// unchanged (from `pages/job-fit/MatchesPage.tsx` and
// `pages/direction-setting/MatchesPage.tsx`); which one a surface uses is its
// component's `variant`, never a choice made per call site.

import type { Tone } from "./fit"

/** Career Fit: tone → fit-figure text colour. */
export const CAREER_PCT_COLOR: Record<string, string> = {
  green: "text-[#15803d]",
  teal: "text-[#0f766e]",
  amber: "text-[#b45309]",
  red: "text-[#b91c1c]",
  gray: "text-[#6b7280]",
}

/** Direction Setting: tone → text colour. */
export const DS_TONE_TEXT: Record<Tone, string> = {
  green: "text-emerald-600",
  teal: "text-teal-600",
  amber: "text-amber-600",
  red: "text-rose-600",
  gray: "text-muted-foreground",
}
