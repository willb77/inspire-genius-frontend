import { useState } from "react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { AlertTriangle, CheckCircle2, Loader2, MessageSquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddStudentNote,
  useCareerExerciseSwitch,
  useConfirmStudentPaths,
  useStudentExerciseSessions,
} from "@/hooks/career-exercise/useCounselorCareerExercise"
import {
  EXERCISE_STAGES,
  type CounselorNote,
  type ExerciseSession,
  type ExerciseStage,
} from "@/types/career-exercise/counselor"
import { MAX_NOTE_CHARS, counselorNoteSchema, noteMessageKey } from "./counselorNote.schema"
import { counselorErrorMessage } from "./counselorErrors"

/**
 * CX-6 — a counselor's view of one student's career exploration exercise.
 * Shared by the practitioner and manager pages.
 *
 * - The server decides who may see a student (the student's `development`
 *   grant AND a counselor relationship). A refusal is shown as a refusal,
 *   never as "no sessions".
 * - The student's words are shown read-only. A counselor's note sits beside
 *   them, labelled as a note; nothing here can edit what the student said.
 * - "Confirm Primary and Backup Paths" sends the version the counselor is
 *   looking at, so a confirmation is never recorded against paths they did
 *   not see.
 * - Nothing renders, and nothing is asked, until the server says the
 *   `career_exercise` switch is on for the signed-in person.
 */

const STAGE_TITLES: Record<ExerciseStage, string> = {
  welcome: "Welcome",
  discover: "How I work best",
  pillars: "My four pillars",
  explore: "Careers explored",
  narrow: "Sorting the roles",
  test: "Real-world experiments",
  commit: "Primary and Backup Paths",
  close: "Wrap-up",
}

const BUCKET_LABELS: Record<string, string> = {
  curious: "Curious",
  maybe: "Maybe",
  not_for_me: "Not for me",
}

const STATUS_LABELS: Record<string, string> = {
  active: "In progress",
  paused: "Paused",
  closed: "Finished",
}

function when(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString()
}

function roleLabel(t: TFunction, role: string | null | undefined): string {
  return role
    ? t("careerExercise.counselorRole", { role: role, defaultValue: "Counselor ({{role}})" })
    : t("careerExercise.counselor", { defaultValue: "Counselor" })
}

function stageTitle(t: TFunction, stage: ExerciseStage): string {
  return t(`careerExercise.stage.${stage}`, { defaultValue: STAGE_TITLES[stage] })
}

function bucketLabel(t: TFunction, bucket: string | null | undefined): string | null | undefined {
  const known = bucket ? BUCKET_LABELS[bucket] : undefined
  return known ? t(`careerExercise.bucket.${bucket}`, { defaultValue: known }) : bucket
}

function statusLabel(t: TFunction, status: string): string {
  const known = STATUS_LABELS[status]
  return known ? t(`careerExercise.status.${status}`, { defaultValue: known }) : status
}

function money(n: number | null): string | null {
  return n == null ? null : `$${Math.round(n).toLocaleString()}`
}

function StudentWords({ session, stage }: { session: ExerciseSession; stage: ExerciseStage }) {
  const { t } = useTranslation("practitionerPages")
  const none = (
    <p className="text-sm text-muted-foreground">{t("careerExercise.nothingRecorded", { defaultValue: "Nothing recorded for this step yet." })}</p>
  )
  switch (stage) {
    case "discover":
      if (!session.self_portrait && session.profile_reactions.length === 0) return none
      return (
        <div className="space-y-2">
          {session.self_portrait && (
            <blockquote className="border-l-2 pl-3 text-sm italic">{session.self_portrait}</blockquote>
          )}
          {session.profile_reactions.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {session.profile_reactions.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )
    case "pillars": {
      const entries = Object.entries(session.pillars)
      if (entries.length === 0) return none
      return (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium capitalize">{k}</dt>
              <dd>{v.join(", ") || "—"}</dd>
            </div>
          ))}
        </dl>
      )
    }
    case "explore": {
      const reactions = Object.entries(session.posting_reaction)
      if (session.roles.length === 0 && reactions.length === 0) return none
      return (
        <div className="space-y-2 text-sm">
          <ul className="space-y-1">
            {session.roles.map((r) => {
              const pay = [money(r.wage_p25), money(r.wage_median), money(r.wage_p75)]
              return (
                <li key={r.onet_soc}>
                  <span className="font-medium">{r.title}</span> · {r.cluster}
                  {r.typical_education ? ` · ${r.typical_education}` : ""}
                  {pay[1]
                    ? r.wage_area
                      ? t("careerExercise.medianArea", { pay: pay[1], area: r.wage_area, defaultValue: " · median {{pay}} ({{area}})" })
                      : t("careerExercise.median", { pay: pay[1], defaultValue: " · median {{pay}}" })
                    : ""}
                </li>
              )
            })}
          </ul>
          {reactions.map(([k, v]) => (
            <p key={k}>
              <span className="font-medium">{k === "look_forward" ? t("careerExercise.looksForward", { defaultValue: "Looks forward to" }) : k === "dread" ? t("careerExercise.dreads", { defaultValue: "Dreads" }) : k}:</span>{" "}
              {v.join(", ")}
            </p>
          ))}
        </div>
      )
    }
    case "narrow": {
      const sorted = session.roles.filter((r) => r.bucket)
      if (sorted.length === 0) return none
      return (
        <ul className="space-y-1 text-sm">
          {sorted.map((r) => (
            <li key={r.onet_soc}>
              <span className="font-medium">{r.title}</span> — {bucketLabel(t, r.bucket ?? "")}
              {r.reason ? `: ${r.reason}` : ""}
            </li>
          ))}
        </ul>
      )
    }
    case "test":
      if (session.experiments.length === 0) return none
      return (
        <ul className="space-y-1 text-sm">
          {session.experiments.map((x, i) => {
            const role = session.roles.find((r) => r.onet_soc === x.onet_soc)
            return (
              <li key={i}>
                {x.kind} — {role?.title ?? x.onet_soc}
                {x.target_date
                  ? t("careerExercise.byDate", { date: when(x.target_date), defaultValue: " by {{date}}" })
                  : ""}
              </li>
            )
          })}
        </ul>
      )
    case "commit":
      if (!session.paths) return none
      return (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">{t("careerExercise.primaryPath", { defaultValue: "Primary Path" })}</dt>
            <dd>{session.paths.primary}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("careerExercise.backupPath", { defaultValue: "Backup Path" })}</dt>
            <dd>{session.paths.backup}</dd>
          </div>
        </dl>
      )
    default:
      return null
  }
}

type NoteInput = z.input<typeof counselorNoteSchema>
type NoteOutput = z.output<typeof counselorNoteSchema>

function NoteForm({ studentId, sessionId, stage }: { studentId: string; sessionId: string; stage: ExerciseStage }) {
  const { t } = useTranslation("practitionerPages")
  const add = useAddStudentNote(studentId)
  const form = useForm<NoteInput, unknown, NoteOutput>({
    resolver: zodResolver(counselorNoteSchema),
    defaultValues: { text: "" },
  })
  const fieldId = `note-${sessionId}-${stage}`
  const onSubmit = form.handleSubmit((values) => {
    add.mutate(
      { sessionId, body: { stage, text: values.text } },
      { onSuccess: () => form.reset({ text: "" }) },
    )
  })
  const rawFieldError = form.formState.errors.text?.message
  const noteMsg = rawFieldError ? noteMessageKey(rawFieldError) : null
  const fieldError = noteMsg
    ? t(`careerExerciseUi:${noteMsg.key}`, { max: MAX_NOTE_CHARS, defaultValue: noteMsg.en })
    : rawFieldError
  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
        {t("careerExercise.addNoteOn", { stage: stageTitle(t, stage), defaultValue: "Add a note on “{{stage}}”" })}
      </Label>
      <Textarea id={fieldId} rows={2} {...form.register("text")} />
      {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      {add.isError && (
        <p role="alert" className="text-xs text-destructive">
          {counselorErrorMessage(add.error, t("careerExercise.noteSaveFailed", { defaultValue: "The note could not be saved." }), t)}
        </p>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={add.isPending}>
        {add.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="mr-1 h-4 w-4" aria-hidden />}
        {t("careerExercise.addNote", { defaultValue: "Add note" })}
      </Button>
    </form>
  )
}

function Notes({ notes }: { notes: CounselorNote[] }) {
  const { t } = useTranslation("practitionerPages")
  if (notes.length === 0) return null
  return (
    <ul className="space-y-2" aria-label={t("careerExercise.counselorNotes", { defaultValue: "Counselor notes" })}>
      {notes.map((n) => (
        <li key={n.id} className="rounded-md bg-muted/60 p-2 text-sm">
          <p className="text-xs text-muted-foreground">
            {t("careerExercise.noteMeta", { role: roleLabel(t, n.by_role), date: when(n.at), defaultValue: "Note · {{role}} · {{date}}" })}
          </p>
          <p className="whitespace-pre-wrap">{n.text}</p>
        </li>
      ))}
    </ul>
  )
}

function ConfirmPaths({ studentId, session }: { studentId: string; session: ExerciseSession }) {
  const { t } = useTranslation("practitionerPages")
  const confirm = useConfirmStudentPaths(studentId)
  const c = session.paths_confirmation
  if (!session.paths) return null
  return (
    <div className="space-y-2">
      {c && c.current && (
        <p className="flex items-center gap-1 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {t("careerExercise.confirmedBy", { role: roleLabel(t, c.by_role).toLowerCase(), date: when(c.at), defaultValue: "Confirmed by {{role}} on {{date}}" })}
        </p>
      )}
      {c && !c.current && (
        <p className="flex items-center gap-1 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {t("careerExercise.pathsChanged", { date: when(c.at), defaultValue: "The student changed their paths after they were confirmed on {{date}}." })}
        </p>
      )}
      {confirm.isError && (
        <p role="alert" className="text-sm text-destructive">
          {counselorErrorMessage(confirm.error, t("careerExercise.confirmFailed", { defaultValue: "The paths could not be confirmed." }), t)}
        </p>
      )}
      {!(c && c.current) && (
        <Button
          size="sm"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate({ sessionId: session.session_id, version: session.version })}
        >
          {confirm.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
          {t("careerExercise.confirmPaths", { defaultValue: "Confirm Primary and Backup Paths" })}
        </Button>
      )}
    </div>
  )
}

function SessionDetail({ studentId, session }: { studentId: string; session: ExerciseSession }) {
  const { t } = useTranslation("practitionerPages")
  const reached = EXERCISE_STAGES.slice(0, EXERCISE_STAGES.indexOf(session.stage) + 1)
  const notes = session.annotations.filter((a): a is CounselorNote => a.kind === "note")
  return (
    <div className="space-y-4">
      {reached.map((stage) => (
        <section key={stage} aria-labelledby={`h-${session.session_id}-${stage}`} className="space-y-3 rounded-lg border p-4">
          <h3 id={`h-${session.session_id}-${stage}`} className="font-semibold">
            {stageTitle(t, stage)}
          </h3>
          <StudentWords session={session} stage={stage} />
          {stage === "commit" && <ConfirmPaths studentId={studentId} session={session} />}
          <Notes notes={notes.filter((n) => n.stage === stage)} />
          <NoteForm studentId={studentId} sessionId={session.session_id} stage={stage} />
        </section>
      ))}
    </div>
  )
}

export function CounselorExerciseView({ studentId }: { studentId: string | undefined }) {
  const { t } = useTranslation("practitionerPages")
  const sw = useCareerExerciseSwitch()
  const q = useStudentExerciseSessions(studentId, sw === "on")
  const [picked, setPicked] = useState<string | null>(null)

  if (sw === "loading") return <Skeleton className="h-24 w-full" />
  if (sw === "off") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("careerExercise.off", { defaultValue: "The career exploration exercise is not switched on for your organization." })}
      </p>
    )
  }
  if (!studentId) return <p role="alert">{t("careerExercise.noStudent", { defaultValue: "No student was named." })}</p>
  if (q.isPending) return <Skeleton className="h-40 w-full" />
  if (q.isError) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
        <div>
          <p>{counselorErrorMessage(q.error, t("careerExercise.loadFailed", { defaultValue: "We couldn't load this student's career exercise." }), t)}</p>
          {(q.error as { response?: { status?: number } } | null)?.response?.status === 403 && (
            <p className="text-muted-foreground">
              {t("careerExercise.onlyShared", { defaultValue: "Only a counselor the student has shared their development with can see it." })}
            </p>
          )}
        </div>
      </div>
    )
  }

  const sessions = q.data.sessions
  if (sessions.length === 0) {
    return <p className="text-sm">
        {t("careerExercise.notStarted", { defaultValue: "This student has not started the career exploration exercise yet." })}
      </p>
  }
  const current = sessions.find((s) => s.session_id === picked) ?? sessions[0]
  return (
    <div className="space-y-4">
      {sessions.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("careerExercise.sessions", { defaultValue: "Sessions" })}>
          {sessions.map((s) => (
            <Button
              key={s.session_id}
              size="sm"
              variant={s.session_id === current.session_id ? "default" : "outline"}
              aria-pressed={s.session_id === current.session_id}
              onClick={() => setPicked(s.session_id)}
            >
              {when(s.updated_at)} · {statusLabel(t, s.status)}
            </Button>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {t("careerExercise.statusLine", { status: statusLabel(t, current.status), stage: stageTitle(t, current.stage), date: when(current.updated_at), defaultValue: "{{status}} · at “{{stage}}” · updated {{date}}" })}
      </p>
      <SessionDetail studentId={studentId} session={current} />
    </div>
  )
}
