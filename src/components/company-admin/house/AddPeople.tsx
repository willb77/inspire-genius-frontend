import { useCallback, useState } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/bulk-import/FileUploader"
import { DataPreviewTable } from "@/components/bulk-import/DataPreviewTable"
import RosterAgeNotice from "@/components/minors/RosterAgeNotice"
import { PageState } from "@/components/shared/house/PageState"
import { BUTTON_WORDS } from "@/lib/house/glossary"
import { useRecordPeople } from "@/hooks/company-admin/useRecordPeople"
import { useRosterAgeCapture } from "@/hooks/useMinorConsent"
import type { BulkUserRecord, RawUserRecord } from "@/types/bulk-import"

/**
 * The plain-words notice every Add people panel carries. People recorded from
 * a company-admin import do not get a sign-in account yet: that needs the
 * organization's Inspire Genius contact. Never present the import as access.
 */
export const ADD_PEOPLE_NOTICE =
  "People you add here are recorded in your organization, but they cannot sign in yet. " +
  "Your organization's Inspire Genius contact has to activate their accounts first. " +
  "No email is sent to them from here."

type Step = "upload" | "check" | "result"

export type AddPeopleProps = {
  /** Close the panel (the People list stays underneath). */
  onClose: () => void
}

/**
 * House-style "Add people" for the company admin (area `company-admin`).
 *
 * Built from the shared import parts: the same file reader, the same row
 * checks and the same recording call as the classic import page. It leaves out
 * that page's invitation steps and its "skip onboarding" option, because
 * neither gives a company admin's people a way to sign in today.
 */
export function AddPeople({ onClose }: AddPeopleProps) {
  const [step, setStep] = useState<Step>("upload")
  const [records, setRecords] = useState<RawUserRecord[]>([])
  const [lastValid, setLastValid] = useState<BulkUserRecord[]>([])
  const record = useRecordPeople()
  const { ageCaptureAllowed, recordFrom: recordRosterAges, mutation: rosterAges } = useRosterAgeCapture()

  const handleParsed = useCallback((parsed: RawUserRecord[]) => {
    setRecords(parsed)
    setStep("check")
  }, [])

  const send = useCallback(
    (valid: BulkUserRecord[]) => {
      setLastValid(valid)
      setStep("result")
      record.mutate(valid, { onSuccess: () => recordRosterAges(valid) })
    },
    [record, recordRosterAges],
  )

  const startOver = () => {
    record.reset()
    // A new run must not show the previous run's dates-of-birth summary.
    rosterAges.reset()
    setRecords([])
    setLastValid([])
    setStep("upload")
  }

  const data = record.data
  const notRecorded = (data?.results ?? []).filter((r) => r.status !== "success")

  return (
    <section aria-labelledby="add-people-title" className="mb-6 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 id="add-people-title" className="text-lg font-semibold text-foreground">
          Add people
        </h2>
        {/* Closing mid-import would unmount this panel and skip the roster-age
            write that follows a successful import, so wait for it. */}
        <Button variant="ghost" size="sm" onClick={onClose} disabled={record.isPending}>
          {BUTTON_WORDS.close}
        </Button>
      </div>

      <div role="note" className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-foreground">{ADD_PEOPLE_NOTICE}</p>
      </div>

      {step === "upload" && <FileUploader onParsed={handleParsed} />}

      {step === "check" && (
        <DataPreviewTable
          records={records}
          onRecordsChange={setRecords}
          onProceed={send}
          ageCaptureAllowed={ageCaptureAllowed}
        />
      )}

      {step === "result" && record.isPending && <PageState kind="loading" rows={2} />}

      {step === "result" && record.isError && (
        <PageState
          kind="error"
          message="We couldn't finish recording these people. Some may already be on the list, so check People before trying again."
          onRetry={() => send(lastValid)}
        />
      )}

      {step === "result" && data && (
        <div className="space-y-3">
          <p className="text-base text-foreground">
            Recorded {data.succeeded} of {data.total} {data.total === 1 ? "person" : "people"}.
          </p>
          <p className="text-sm text-muted-foreground">
            They cannot sign in yet. Ask your organization&apos;s Inspire Genius contact to activate them.
          </p>
          {notRecorded.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                Not recorded ({notRecorded.length})
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {notRecorded.map((r, i) => (
                  <li key={`${r.email}-${i}`}>
                    {r.email}
                    {r.error ? `: ${r.error}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === "result" && (
        <RosterAgeNotice isPending={rosterAges.isPending} isError={rosterAges.isError} data={rosterAges.data} />
      )}

      {step !== "upload" && !record.isPending && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={startOver}>
            Add more people
          </Button>
        </div>
      )}
    </section>
  )
}

export default AddPeople
