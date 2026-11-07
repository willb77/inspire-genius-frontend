/**
 * House style (interview area): the words on the practice page that must match
 * what the page actually does.
 *
 * Today the setup line promises "no scores" while a tier with scored practice
 * switched on ends the practice with a result card. The wording follows the
 * same switch the result card does, so the promise and the outcome agree.
 * Scoring itself is not touched here.
 */

/** The one-line purpose under the practice page title. */
export function practiceIntro(scoredEnabled: boolean): string {
  return scoredEnabled
    ? "Answer interview questions and get tips as you go. For standard questions you also get a " +
        "practice result at the end. Only you see how it went. You choose how many questions."
    : "Answer interview questions and get tips as you go. There is no score, just tips to help " +
        "your story land. Only you see how it went. You choose how many questions."
}

/** Title of the read-out at the end of a practice. */
export const PRACTICE_RESULTS_TITLE = "How it went"

/** The guide film's label on the interview pages. */
export const INTERVIEW_GUIDE_LABEL = "Watch: Interviews guide"
