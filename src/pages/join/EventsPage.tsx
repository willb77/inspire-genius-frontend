import { Loader2 } from "lucide-react"
import AuthHeader from "@/components/auth/AuthHeader"
import AuthLayout from "@/components/auth/AuthLayout"
import { ROUTES } from "@/constants/routes"
import { usePublicEvents } from "@/hooks/intake/usePublicEvents"
import type { PublicEvent } from "@/types/publicEvents"
import { formatEventTime } from "./eventTime"
import { EVENTS_NEXT_STEP, JoinBrandPanel } from "./JoinBrandPanel"

/** The stub's copy, kept verbatim: shown while the public events switch is off (404). */
export const EVENTS_NOT_OPEN_COPY =
  "No events are scheduled yet. Register your interest and tick the webinar box to hear when the next one is announced."
/** The switch is on and nothing is listed. */
export const EVENTS_EMPTY_COPY = "No upcoming events right now"
export const EVENTS_ERROR_COPY = "We could not load the events just now. Please try again in a few minutes."

const STATUS_CLASS = "rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground"

function EventItem({ event }: { event: PublicEvent }) {
  return (
    <li className="rounded-lg border px-4 py-4">
      <h2 className="text-base font-semibold">{event.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        <time dateTime={event.starts_at}>{formatEventTime(event.starts_at, event.time_zone)}</time>
      </p>
      {/* Plain text only: React escapes it, and nothing here turns text into links or markup. */}
      {event.description && <p className="mt-2 whitespace-pre-line text-sm">{event.description}</p>}
    </li>
  )
}

/**
 * `/events` — public "Upcoming events", linked from /join. No sign-in.
 *
 * Reads the events an admin flagged public in Administration → Intake, through
 * the public intake route (monorepo CSA 2026-11-10-public-events-list-csa.md).
 * Four states, kept distinct so a failure never looks like an empty list:
 * - the list;
 * - `[]` → "No upcoming events right now";
 * - 404 (the switch is off — today's state on every tier) → the stub's copy, unchanged;
 * - a network or server error → a visible `role="alert"`.
 */
export default function EventsPage() {
  const events = usePublicEvents()
  const data = events.data

  let body
  if (events.isPending) {
    body = (
      <p role="status" aria-busy="true" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading events…
      </p>
    )
  } else if (events.isError || !data) {
    body = (
      <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-6 text-sm text-destructive">
        {EVENTS_ERROR_COPY}
      </p>
    )
  } else if (data.kind === "not_open") {
    body = (
      <p role="status" className={STATUS_CLASS}>
        {EVENTS_NOT_OPEN_COPY}
      </p>
    )
  } else if (data.events.length === 0) {
    body = (
      <p role="status" className={STATUS_CLASS}>
        {EVENTS_EMPTY_COPY}
      </p>
    )
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Upcoming events">
        {data.events.map((e, i) => (
          <EventItem key={`${e.starts_at}-${i}`} event={e} />
        ))}
      </ul>
    )
  }

  return (
    <AuthLayout
      contentClassName="max-w-[560px]"
      showTestimonial={false}
      brandPanel={<JoinBrandPanel nextStep={EVENTS_NEXT_STEP} />}
    >
      <AuthHeader title="Upcoming events" />
      {body}
      <p className="mt-6 text-sm">
        {/* A plain anchor, not a router Link: the page renders with no router. */}
        <a href={ROUTES.JOIN} className="font-medium text-[#466bc4] underline-offset-4 hover:underline">
          ← Register your interest
        </a>
      </p>
    </AuthLayout>
  )
}
