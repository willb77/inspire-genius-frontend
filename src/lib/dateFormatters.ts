import { format } from "date-fns"

/** Full timestamp in dd/MM/yyyy:HH:mm:ss (24h, with seconds). Safe on bad input. */
export function formatFullTimestamp(input?: number | string | Date | null): string {
  try {
    const d =
      input == null ? new Date()
      : input instanceof Date ? input
      : new Date(input)
    return isNaN(d.getTime()) ? format(new Date(), "dd/MM/yyyy:HH:mm:ss") : format(d, "dd/MM/yyyy:HH:mm:ss")
  } catch {
    return format(new Date(), "dd/MM/yyyy:HH:mm:ss")
  }
}
