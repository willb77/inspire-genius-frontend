import type { CompareCopy, ScenarioCopy } from "@/components/prism/studio/ports"

/**
 * Team Development Studio's words for the shared PRISM studio panels.
 *
 * The Character Lab's copy says "character" throughout, because its profiles
 * are invented. Every one of those sentences is wrong here: these are named
 * colleagues, and a manager reading "pick at least two characters" about their
 * own team would rightly stop trusting the surface.
 *
 * The panels carry no wording of their own precisely so this file has to exist
 * — see `@/components/prism/studio/ports`.
 */

/** The one line that must never be lost: this is a development input. */
const NOT_A_JUDGEMENT =
  "A development input, never a selection, promotion or performance decision."

export const TEAM_STUDIO_COMPARE_COPY: CompareCopy = {
  groupNoun: "your team",
  castTitle: "Choose who to compare",
  castEmpty:
    "Nobody on your team has PRISM on file yet. Invite them from the roster — this list only shows people whose scores exist, because a reading built from no scores would look exactly like a real one.",
  errorNeedTwo: "Choose at least two people.",
  errorNeedOne: "Choose at least one person.",
  errorNeedOneToAsk: "Choose at least one person first.",
  compareLabel: "Compare them",
  comparingLabel: "Comparing…",
  compareFailed: "The comparison failed",
  questionsFailed: "Could not fetch questions",
  askFailed: "Could not answer that",
  startersBlurb:
    "Generated from these people's own PRISM scores, not a fixed list — each one names what makes it worth asking. Click to ask it.",
  askPlaceholder: "Who is best placed to lead the handover?",
  askBlurb: `Answers are grounded in the scores on file. Where the scores cannot settle a question, the answer says which scale would have. ${NOT_A_JUDGEMENT}`,
  metaLabel: "People",
  comparisonSubtitle: "PRISM team comparison",
  answerSubtitle: "PRISM team Q&A",
}

export const TEAM_STUDIO_SCENARIO_COPY: ScenarioCopy = {
  castTitle: "Rehearse a situation",
  castEmpty:
    "Nobody on your team has PRISM on file yet. Invite them from the roster — this list only shows people whose scores exist.",
  castBlurb: `Each person is read on their own first, then as a group. Behaviour is inferred from PRISM scores and is a prediction about tendencies, not a statement about what someone did or will do. ${NOT_A_JUDGEMENT}`,
  errorNeedOne: "Choose at least one person.",
  errorNeedSituation: "Describe the situation first.",
  saveFailed: "Could not save the scenario",
  presets: [
    "A deadline has moved forward by two weeks and something has to give.",
    "A handover to another team, with the detail still incomplete.",
    "A decision the group disagreed on has to be made this week.",
    "A piece of work came back with substantial changes requested.",
  ],
  subtitle: "PRISM team scenario",
  metaLabel: "People",
  // Team Studio passes no `store`, so the saved-scenarios card never renders
  // and this string is unreachable today. It is stated rather than left empty
  // so that turning the store on later cannot ship a blank explanation.
  savedBlurb:
    "Each run keeps the names as they were at the time, so it still reads correctly after someone leaves the team.",
}

export { NOT_A_JUDGEMENT }
