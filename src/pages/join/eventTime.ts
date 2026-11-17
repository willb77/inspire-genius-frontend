/** Unknown zone → UTC, never a throw that blanks the list. */
function inZone(startsAt: string, timeZone: string, locale: string | undefined, options: Intl.DateTimeFormatOptions): string {
  const when = new Date(startsAt)
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(when)
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(when)
  }
}

/** The date alone, in the event's zone ("Tuesday, March 3, 2099"). */
export function formatEventDate(startsAt: string, timeZone: string, locale?: string): string {
  return inZone(startsAt, timeZone, locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

/** The time alone, in the event's zone, zone named ("9:00 AM EST"). */
export function formatEventClock(startsAt: string, timeZone: string, locale?: string): string {
  return inZone(startsAt, timeZone, locale, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })
}

/**
 * An event's start, in the event's own time zone, with the zone named
 * ("Tuesday, March 3, 2099 at 9:00 AM EST"). An unknown zone falls back to UTC
 * and says so, rather than throwing and blanking the list.
 */
export function formatEventTime(startsAt: string, timeZone: string, locale?: string): string {
  const when = new Date(startsAt)
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(when)
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(when)
  }
}
