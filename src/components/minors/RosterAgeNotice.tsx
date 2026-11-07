import type { RosterAgesResult } from "@/types/minorConsent"

type RosterAgeNoticeProps = {
  isPending: boolean
  isError: boolean
  data?: RosterAgesResult
}

/**
 * N-2: the outcome of recording the roster's dates of birth, stated plainly.
 *
 * This is a separate request from the import, so it can fail on its own. A
 * student whose date was not recorded is not treated as a minor by the gate,
 * so every row that was not recorded is counted here, never left unsaid.
 * Renders nothing unless a recording was attempted.
 */
export default function RosterAgeNotice({ isPending, isError, data }: RosterAgeNoticeProps) {
  if (isPending) {
    return (
      <p role="status" className="mt-3 text-sm text-slate-600">
        Recording dates of birth…
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        The dates of birth could not be recorded. The people were imported, but none of their dates of
        birth were saved. Import the file again to retry.
      </p>
    )
  }
  if (!data) return null
  const notRecorded = data.total - data.recorded
  return (
    <div
      role={notRecorded > 0 ? "alert" : "status"}
      className={
        notRecorded > 0
          ? "mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          : "mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      }
    >
      <p>
        Dates of birth recorded for {data.recorded} of {data.total} people.
      </p>
      {notRecorded > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {data.invalid_date > 0 && <li>{data.invalid_date} had a date that could not be used.</li>}
          {data.not_permitted > 0 && <li>{data.not_permitted} belong to another organisation.</li>}
          {data.not_enabled > 0 && (
            <li>{data.not_enabled} are in an organisation where under-18 support is not switched on.</li>
          )}
        </ul>
      )}
    </div>
  )
}
