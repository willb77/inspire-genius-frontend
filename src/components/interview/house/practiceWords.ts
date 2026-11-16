/**
 * House style (interview area): the words on the practice page that must match
 * what the page actually does.
 *
 * Today the setup line promises "no scores" while a tier with scored practice
 * switched on ends the practice with a result card. The wording follows the
 * same switch the result card does, so the promise and the outcome agree.
 * Scoring itself is not touched here.
 */

import { englishT, type TFn } from "@/components/interview/tFallback"

/** The one-line purpose under the practice page title. */
export function practiceIntro(scoredEnabled: boolean, t: TFn = englishT): string {
  return scoredEnabled
    ? t("house.practice.introScored", "Answer interview questions and get tips as you go. For standard questions you also get a practice result at the end. Only you see how it went. You choose how many questions.")
    : t("house.practice.introUnscored", "Answer interview questions and get tips as you go. There is no score, just tips to help your story land. Only you see how it went. You choose how many questions.")
}

/** Title of the read-out at the end of a practice. */
export function practiceResultsTitle(t: TFn = englishT): string {
  return t("house.practice.resultsTitle", "How it went")
}

/** The guide film's label on the interview pages. */
export function interviewGuideLabel(t: TFn = englishT): string {
  return t("house.practice.guideLabel", "Watch: Interviews guide")
}

/**
 * English values, kept as constants for the callers outside the interview
 * package (UserTopHeader, InterviewPracticePage) that have not moved to the
 * functions above yet.
 */
export const PRACTICE_RESULTS_TITLE = practiceResultsTitle()
export const INTERVIEW_GUIDE_LABEL = interviewGuideLabel()
