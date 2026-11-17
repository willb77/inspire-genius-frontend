import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import AuthHeader from "@/components/auth/AuthHeader"
import AuthLayout from "@/components/auth/AuthLayout"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEventOptions } from "@/hooks/intake/useEventRegistration"
import { usePublicEvents } from "@/hooks/intake/usePublicEvents"
import type { EventOption } from "@/types/eventRegistration"
import type { PublicEvent } from "@/types/publicEvents"
import { EventDescription } from "./EventDescription"
import { EventRegistrationDialog } from "./EventRegistrationDialog"
import { optionFor } from "./eventRegistration"
import { briefDescription } from "./eventSummary"
import { formatEventClock, formatEventDate, formatEventTime } from "./eventTime"
import { EVENTS_NEXT_STEP, JoinBrandPanel } from "./JoinBrandPanel"

/** The stub's copy, kept verbatim: shown while the public events switch is off (404). */
export const EVENTS_NOT_OPEN_COPY =
  "No events are scheduled yet. Register your interest and tick the webinar box to hear when the next one is announced."
/** The switch is on and nothing is listed. */
export const EVENTS_EMPTY_COPY = "No upcoming events right now"
export const EVENTS_ERROR_COPY = "We could not load the events just now. Please try again in a few minutes."

const STATUS_CLASS = "rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground"

const PILL = "rounded-full px-5"

function EventTile({
  event,
  option,
  onRegister,
  onInfo,
}: {
  event: PublicEvent
  option?: EventOption
  onRegister: (o: EventOption) => void
  onInfo: (e: PublicEvent) => void
}) {
  const { t } = useTranslation("joinPages")
  const brief = briefDescription(event.description)
  return (
    <li className="flex flex-col rounded-xl border bg-card px-5 py-5 shadow-xs">
      <h2 className="text-base font-semibold">{event.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <time dateTime={event.starts_at} className="flex flex-col">
          <span data-testid="event-date">{formatEventDate(event.starts_at, event.time_zone)}</span>
          <span data-testid="event-time">{formatEventClock(event.starts_at, event.time_zone)}</span>
        </time>
      </p>
      {brief && <p className="mt-3 flex-1 text-sm">{brief}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {event.description && (
          <Button
            type="button"
            variant="outline"
            className={PILL}
            aria-label={t("events.moreInfoAria", { defaultValue: "More Info: {{title}}", title: event.title })}
            onClick={() => onInfo(event)}
          >
            {t("events.moreInfo", { defaultValue: "More Info" })}
          </Button>
        )}
        {option &&
          (option.full ? (
            <p className="text-sm font-medium text-muted-foreground">
              {t("events.full", { defaultValue: "This event is full." })}
            </p>
          ) : (
            <Button
              type="button"
              className={PILL}
              aria-label={t("events.registerAria", { defaultValue: "Register for {{title}}", title: event.title })}
              onClick={() => onRegister(option)}
            >
              {t("events.register", { defaultValue: "Register" })}
            </Button>
          ))}
      </div>
    </li>
  )
}

/** The full description, in a dialog. Markdown through the same allow-list as before. */
function EventInfoDialog({
  event,
  option,
  onRegister,
  onClose,
}: {
  event: PublicEvent
  option?: EventOption
  onRegister: (o: EventOption) => void
  onClose: () => void
}) {
  const { t } = useTranslation("joinPages")
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            <time dateTime={event.starts_at}>{formatEventTime(event.starts_at, event.time_zone)}</time>
          </DialogDescription>
        </DialogHeader>
        {event.description && <EventDescription markdown={event.description} />}
        {option && !option.full && (
          <div className="mt-2">
            <Button type="button" className={PILL} onClick={() => onRegister(option)}>
              {t("events.register", { defaultValue: "Register" })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  const { t } = useTranslation("joinPages")
  const events = usePublicEvents()
  const data = events.data
  // Asked only once the list shows an event, so a tier with nothing listed (or the
  // switch off) makes no second request; any failure of it just means no buttons.
  const options = useEventOptions(data?.kind === "list" && data.events.length > 0)
  const [registering, setRegistering] = useState<EventOption | null>(null)
  const [info, setInfo] = useState<PublicEvent | null>(null)
  const register = (o: EventOption) => {
    setInfo(null)
    setRegistering(o)
  }

  let body
  if (events.isPending) {
    body = (
      <p role="status" aria-busy="true" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t("events.loading", { defaultValue: "Loading events…" })}
      </p>
    )
  } else if (events.isError || !data) {
    body = (
      <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-6 text-sm text-destructive">
        {t("events.error", { defaultValue: EVENTS_ERROR_COPY })}
      </p>
    )
  } else if (data.kind === "not_open") {
    body = (
      <p role="status" className={STATUS_CLASS}>
        {t("events.notOpen", { defaultValue: EVENTS_NOT_OPEN_COPY })}
      </p>
    )
  } else if (data.events.length === 0) {
    body = (
      <p role="status" className={STATUS_CLASS}>
        {t("events.empty", { defaultValue: EVENTS_EMPTY_COPY })}
      </p>
    )
  } else {
    body = (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={t("events.listAria", { defaultValue: "Upcoming events" })}>
        {data.events.map((e, i) => (
          <EventTile
            key={`${e.starts_at}-${i}`}
            event={e}
            option={optionFor(e, options.data)}
            onRegister={register}
            onInfo={setInfo}
          />
        ))}
      </ul>
    )
  }

  return (
    <AuthLayout
      contentClassName="max-w-[720px]"
      showTestimonial={false}
      brandPanel={<JoinBrandPanel nextStep={EVENTS_NEXT_STEP} />}
    >
      <AuthHeader title={t("events.title", { defaultValue: "Upcoming events" })} />
      {body}
      {info && (
        <EventInfoDialog
          key={`${info.starts_at}-${info.title}`}
          event={info}
          option={optionFor(info, options.data)}
          onRegister={register}
          onClose={() => setInfo(null)}
        />
      )}
      {registering && <EventRegistrationDialog key={registering.id} event={registering} onClose={() => setRegistering(null)} />}
      <p className="mt-6 text-sm">
        {/* A plain anchor, not a router Link: the page renders with no router. */}
        <a href={ROUTES.JOIN} className="font-medium text-[#466bc4] underline-offset-4 hover:underline">
          {t("events.backToRegister", { defaultValue: "← Register your interest" })}
        </a>
      </p>
    </AuthLayout>
  )
}
