import type {
  CompareCopy,
  ImportCopy,
  LibraryCopy,
  ScenarioCopy,
} from "@/components/prism/studio/ports"
import { SYNTHETIC_NARRATIVE_PREFIX, syntheticFooter } from "@/lib/prismExportLabels"

/**
 * The export identity these documents have always carried.
 *
 * Stated rather than left to a default: the exporters used to hard-code it,
 * and the point of the change was that the same code now also writes about
 * real colleagues. `fallbackNotice` is empty on purpose — the Character Lab's
 * notice comes from the server's rubric, and printing an invented one here
 * would put words in the model's mouth.
 */
const SYNTHETIC_EXPORT = {
  filePrefix: SYNTHETIC_NARRATIVE_PREFIX,
  footer: syntheticFooter,
  fallbackNotice: "",
} as const

/**
 * Character Lab's words for the shared PRISM studio panels.
 *
 * The panels carry no wording of their own — see
 * `@/components/prism/studio/ports`. Every noun here says "character" on
 * purpose: these profiles are invented, and a surface that reads a REAL direct
 * report must supply its own copy rather than inherit fiction's.
 *
 * In their own file because the panels' entry points export components only
 * (react-refresh/only-export-components), and because a reviewer comparing
 * Character Lab's words with Team Studio's should be able to read them side by
 * side rather than buried in two component files.
 */

export const CHARACTER_LAB_COMPARE_COPY: CompareCopy = {
  groupNoun: "the cast",
  castTitle: "Choose the cast",
  castEmpty: undefined,
  castCapHint: undefined,
  errorNeedTwo: "Pick at least two characters.",
  errorNeedOne: "Pick at least one character.",
  errorNeedOneToAsk: "Pick at least one character first.",
  compareLabel: "Compare them",
  comparingLabel: "Comparing…",
  compareFailed: "The comparison failed",
  questionsFailed: "Could not fetch questions",
  askFailed: "Could not answer that",
  startersBlurb:
    "Generated from these characters' actual scores, not a fixed list — each one names what makes it worth asking. Click to ask it.",
  askPlaceholder: "Which of them would you put in front of a hostile client?",
  askBlurb:
    "Answers are grounded in the saved scores. Where the scores cannot settle a question, the answer says which scale would have.",
  metaLabel: "Characters",
  comparisonSubtitle: "PRISM character comparison",
  answerSubtitle: "PRISM character Q&A",
  ...SYNTHETIC_EXPORT,
}

export const CHARACTER_LAB_SCENARIO_COPY: ScenarioCopy = {
  castTitle: "Put them in a situation",
  castEmpty: undefined,
  castCapHint: undefined,
  castBlurb:
    "Each character is read on their own first, then as a group. Behaviour is derived from the scores — where the profile predicts something the character is not famous for, the write-up says so.",
  errorNeedOne: "Pick at least one character.",
  errorNeedSituation: "Describe the situation first.",
  saveFailed: "Could not save the scenario",
  presets: [
    "A negotiation that is going badly, with a deadline in an hour.",
    "A team member has made a serious mistake and hidden it for a week.",
    "The plan they argued for has just failed in public.",
    "A rival offers them something they want, in exchange for something small.",
  ],
  // The string the shared panel used to hardcode. It was always correct HERE —
  // the defect was that Team Studio inherited it.
  titlePlaceholder: "The hospital scene",
  runningLabel: "Running the scene…",
  subtitle: "PRISM character scenario",
  metaLabel: "Characters",
  savedBlurb:
    "Each run keeps the character names as they were at the time, so it still reads correctly after a profile is renamed or deleted.",
  ...SYNTHETIC_EXPORT,
}

export const CHARACTER_LAB_LIBRARY_COPY: LibraryCopy = {
  empty: (
    <>
      Nothing saved yet. Build a character on the <strong>Build</strong> tab, then press
      <strong> Save to library</strong>.
    </>
  ),
  loadError:
    "The saved characters could not be loaded. This is a load failure, not an empty library — do not assume nothing is saved.",
  editTitle: "Edit character",
  editDescription:
    "Changes the record, not the scores. Add what you know, then load the character and rebuild — the next run scores against these notes.",
  notesLabel: "What else do we know about them?",
  notesPlaceholder:
    "Scenes, decisions, how they behave under pressure. Treated as evidence about the character.",
  errorNoName: "A character needs a name.",
  saveFailed: "Could not save the change",
  deleteDescription:
    "This removes the saved profile. Scenarios that used this character keep their own record of the run and are not deleted.",
}

export const CHARACTER_LAB_IMPORT_COPY: ImportCopy = {
  blurb: (
    <>
      Wide-format PRISM exports — the layout <strong>Wide CSV</strong> writes. Scores are taken
      exactly as authored; the brain map is derived from the eight behaviour preferences.
      Re-importing a corrected file updates that character.
    </>
  ),
  imported: (count) => `Imported ${count} character${count === 1 ? "" : "s"}`,
}
