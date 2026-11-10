import { ClipboardList, Layers, UsersRound } from "lucide-react"

/**
 * The /join brand wall (IN-2c follow-up). Passed to `AuthLayout` as
 * `brandPanel`, which keeps it on screen while the form scrolls.
 *
 * Marketing copy only, in a public repo: no testimonial, no named customer,
 * no promise that someone will contact the registrant (there is no automatic
 * reply in phase 1). Hidden below `lg` with the rest of the wall.
 */

/** The "What happens next" box on /join: it refers to the form's first tick box. */
export const JOIN_NEXT_STEP =
  "No account and nothing to install. Tick the first box to hear when the next webinar is scheduled."
/** The same box on /events, which has no form and so no box to tick. */
export const EVENTS_NEXT_STEP =
  "No account and nothing to install. Register your interest to hear when the next event is announced."

const SETTINGS = ["Individuals", "Teams", "Organisations", "Education", "Enterprise"] as const

const iconBox =
  "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border border-teal-400/35 bg-[#127A8A]/35 text-teal-300"

export function JoinBrandPanel({ nextStep = JOIN_NEXT_STEP }: { nextStep?: string } = {}) {
  return (
    <div className="flex max-w-[460px] flex-col gap-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#e7b65a]">Register your interest</p>
      <h2 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
        Support every client{" "}
        <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
          between sessions
        </span>
      </h2>
      <p className="text-[14px] leading-relaxed text-white/65">
        Inspires Genius gives mentors and practitioners an AI mentoring partner that works alongside them, so
        clients keep making progress after the session ends.
      </p>

      <ul className="flex flex-col gap-3" aria-label="What Inspires Genius offers">
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <UsersRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-white">Built for practitioners</p>
            <p className="text-[12.5px] leading-snug text-white/60">
              Invite your clients, follow their progress, and give each one an AI mentor that is there between your
              sessions.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <ClipboardList className="h-4 w-4" />
          </span>
          <p className="text-[12.5px] leading-snug text-white/60">
            <span className="block text-[13.5px] font-semibold text-white">
              Works with the assessments you already use
            </span>{" "}
            (DISC, CliftonStrengths, MBTI, Big Five) grounded in PRISM to enhance all mentoring results.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-white">For every setting</p>
            <p className="text-[12.5px] leading-snug text-white/60">One platform, sized to the work.</p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Settings">
              {SETTINGS.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/85"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </li>
      </ul>

      <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#e7b65a]">What happens next</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/70">
          {nextStep}
        </p>
      </div>
    </div>
  )
}

