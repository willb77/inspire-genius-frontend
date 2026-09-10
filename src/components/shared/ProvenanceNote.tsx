/**
 * One honest line about what a result was built from — shown ALWAYS, not only
 * when something is missing.
 *
 * Why symmetric. A line that appears only when PRISM is absent is a deficiency
 * warning however gently it is worded, because its presence IS the message: the
 * user infers that what they are looking at is the broken version. When every
 * result carries a provenance line, "no PRISM" stops being an alarm and becomes
 * one ordinary value of a field that always has a value. The user reads what
 * this was built from, not what they failed to do.
 *
 * The vocabulary deliberately mirrors the backend's ``_coverage_note`` /
 * ``_headline_without_prism`` in ``app/tools/lumen/self_portrait.py`` so the two
 * can never contradict each other on the same screen. Two rules are carried over
 * from there verbatim in spirit:
 *
 *   - Name what the read IS built on, never what it lacks. "No PRISM yet" is
 *     true and useless to someone who just uploaded a résumé.
 *   - Distinguish what MEASURES (PRISM, other instruments) from what DESCRIBES
 *     (résumé, bio, the user's own answers). A résumé describes; an instrument
 *     measures. Saying so is accurate without being pejorative.
 *
 * Styling is deliberately neutral — muted body text, no icon, no amber, no
 * border. A warning colour semantically means something is wrong, which is the
 * exact inference this component exists to prevent.
 */
import { cn } from "@/lib/utils"

/** Which inputs contributed to the result being shown. */
export type ProvenanceSources = {
  /** The PRISM behavioural assessment. The anchor other instruments read against. */
  prism?: boolean
  /** Any other completed instrument (CliftonStrengths, DISC, ...). */
  assessments?: boolean
  /** An uploaded résumé. */
  resume?: boolean
  /** A written bio. */
  bio?: boolean
  /** Goals the user has set — descriptive, their own words. */
  goals?: boolean
}

/** Ordered: the first missing one is the single upgrade we suggest. */
const NEXT_BEST: ReadonlyArray<[keyof ProvenanceSources, string]> = [
  ["prism", "Adding your PRISM profile tunes this to how you actually work."],
  ["resume", "Adding your résumé grounds this in what you have actually done."],
  ["bio", "Adding a short bio lets this pick up how you describe yourself."],
]

const SOLO: Record<keyof ProvenanceSources, string> = {
  prism: "Measured from your PRISM profile.",
  assessments: "Built from the assessments you have taken so far.",
  resume: "Built from your résumé — the record of what you have actually done.",
  bio: "Built from your bio — how you choose to describe yourself.",
  goals: "Built from the goals you have set, in your own words.",
}

/**
 * The lead sentence. Always says what the result RESTS ON.
 *
 * Exported for tests and for callers that need the sentence without the markup
 * (a document cover, an export header).
 */
export function provenanceLead(sources: ProvenanceSources): string {
  const present = (Object.keys(SOLO) as Array<keyof ProvenanceSources>).filter(
    (k) => sources[k],
  )
  if (present.length === 0) {
    return "Nothing on file yet."
  }
  if (present.length === 1) {
    return SOLO[present[0]]
  }

  const measured = (["prism", "assessments"] as const).filter((k) => sources[k])
  const described = (["resume", "bio", "goals"] as const).filter((k) => sources[k])

  if (measured.length > 0 && described.length > 0) {
    const noun = measured.length === 1 ? "instrument" : "instruments"
    return `Measured from ${measured.length} ${noun}, with your own words alongside for context.`
  }
  if (measured.length > 0) {
    const noun = measured.length === 1 ? "instrument" : "instruments"
    return `Measured from ${measured.length} ${noun}.`
  }
  // Described only. Naming this plainly is the honest half of the contract:
  // the read is real, and it is not a measurement.
  return "Built from your own words — descriptive, not measured."
}

/**
 * The forward half: the single best thing that would sharpen this, or "" when
 * everything is on file.
 *
 * Always an ADDITION ("tunes", "grounds", "picks up"), never a correction
 * ("fix", "improve accuracy", "make valid") — a correction verb tells the user
 * that what they already did was wrong.
 */
export function provenanceHint(sources: ProvenanceSources): string {
  const hit = NEXT_BEST.find(([key]) => !sources[key])
  if (!hit) return ""
  const anyPresent = (Object.keys(SOLO) as Array<keyof ProvenanceSources>).some(
    (k) => sources[k],
  )
  // With nothing on file the hint is the whole message, so it has to invite
  // rather than upsell.
  if (!anyPresent) {
    return "Add a résumé, a bio, or complete the PRISM assessment and this composes itself."
  }
  return hit[1]
}

export type ProvenanceNoteProps = {
  sources: ProvenanceSources
  /** Optional call to action rendered after the hint (a link or button). */
  action?: React.ReactNode
  className?: string
}

/**
 * Renders unconditionally. Callers must NOT wrap this in a
 * ``{!hasPrism && ...}`` guard — that reintroduces the asymmetry the component
 * exists to remove.
 */
export function ProvenanceNote({ sources, action, className }: ProvenanceNoteProps) {
  const lead = provenanceLead(sources)
  const hint = provenanceHint(sources)
  return (
    <p
      data-testid="provenance-note"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
    >
      <span>{lead}</span>
      {hint ? <span> {hint}</span> : null}
      {action ? <span className="ml-1">{action}</span> : null}
    </p>
  )
}

export default ProvenanceNote
