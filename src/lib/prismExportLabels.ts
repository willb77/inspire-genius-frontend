/**
 * What a PRISM export is allowed to call itself.
 *
 * The exporters were written for the Character Lab, where every profile is
 * invented, so "synthetic profile" was hard-coded into the PDF footer and
 * "PRISM_Character_" into the filename. The same exporters now serve the Team
 * Development Studio, where the subject is a named colleague — and a document
 * that leaves the building describing a real person's assessment as a
 * synthetic profile is wrong in the one place nobody will check twice.
 *
 * Both are now parameters. This module holds the two sets of labels so that a
 * reader can see, side by side, exactly what each kind of export claims about
 * its subject.
 */

/** Character Lab. Invented people; the file says so. */
export const SYNTHETIC_FILE_PREFIX = 'PRISM_Character_'
export const SYNTHETIC_NARRATIVE_PREFIX = 'PRISM_'

/** Team Development Studio. A real colleague's own assessment. */
export const REAL_PERSON_FILE_PREFIX = 'PRISM_Profile_'

/**
 * The notice a real-person export leads with.
 *
 * It occupies the position the synthetic-data notice occupies today — printed
 * in full at the top of page one, in both Word and PDF, never referenced or
 * abbreviated. The two claims it has to make are that the subject is real and
 * that the document is not a decision: an exported PDF outlives the tab it came
 * from and will be read by people who never saw the caveat on screen.
 */
export const REAL_PERSON_NOTICE =
  'REAL PERSON — this is a named colleague’s own PRISM assessment, not an invented profile. ' +
  'A development input, never a selection, promotion or performance decision. ' +
  'Confidential personal data: share it only with the person it describes and those who need it to support them.'

/** `2026-09-02` — ISO, so the date cannot be read as a different day elsewhere. */
export function reportDateLabel(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/**
 * The footer stamped on every page of a real-person export.
 *
 * Names the person and the date the report was produced, because a PRISM
 * profile is a snapshot: a page found on its own months later must say who it
 * is about and how old it is, or it gets read as current.
 */
export function realPersonFooter(name: string, date: Date = new Date()): string {
  return `${name} — PRISM profile, ${reportDateLabel(date)}`
}

/** The footer the Character Lab has always stamped. Stated, not defaulted. */
export function syntheticFooter(title: string): string {
  return `${title} — synthetic profile`
}
