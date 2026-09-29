/**
 * Notes tab (TDS-2) — this manager's coaching notes about one member.
 *
 * ## What the server enforces, and what that means here
 *
 * - **Per-manager.** Every read and write is scoped to the calling manager, so
 *   these notes are one coach's candid read of a person and nothing else sees
 *   them. The panel says so in a sentence, because a surface that merely fails
 *   to mention it invites a manager to assume the opposite.
 * - **A goal OR a milestone, never both** (400). Rather than validate that after
 *   the fact, the composer offers ONE "about" picker whose value is either a
 *   goal or a milestone, so the rejected request cannot be built.
 * - **A ref that belongs to somebody else is a 400, not a 404.** The server
 *   writes that sentence as primary copy; it is rendered verbatim.
 * - **404 means "no such note" OR "not yours", indistinguishable by design.**
 *   Nothing here says "you don't have permission" — that would confirm the
 *   existence of another manager's note.
 *
 * ## Failure
 *
 * Every write is awaited and every rejection is both toasted and rendered
 * inline, and a failed save never clears what the manager typed. `apiErrorMessage`
 * is mandatory on the way to a toast: FastAPI sends `detail` as a STRING for a
 * raised HTTPException and an ARRAY of objects for a 422, and handing that array
 * to sonner renders an object as a React child — React #31, a blank page.
 */
import { useState } from "react"
import { toast } from "sonner"
import { NotebookPen, Trash2, Lock, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { NOTE_KIND_LABEL } from "@/constants/development"
import type { Milestone, SummitGoal } from "@/types/development"
import type {
  CoachingNote,
  CoachingNoteKind,
} from "@/services/manager/development/growthService"
import {
  useCreateCoachingNote,
  useDeleteCoachingNote,
  useMemberNotes,
  useUpdateCoachingNote,
} from "@/hooks/manager/development"
import { useDevSkin } from "../skin"

const NOTE_KINDS: CoachingNoteKind[] = ["observation", "plan", "outcome"]

/** "4 Sep 2026", or "" when the server sent no timestamp. */
function formatNoteDate(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * `"goal:g1"` → `{goalId:"g1"}`; `"milestone:m1"` → `{milestoneId:"m1"}`; else `{}`.
 *
 * The "about" picker has ONE value space, so a note can carry a goal id or a
 * milestone id and never both — the server's 400 is unreachable from this UI
 * rather than caught after the round trip. Kept module-private: a second value
 * export here would trip `react-refresh/only-export-components`.
 */
function aboutToRef(value: string): { goalId?: string; milestoneId?: string } {
  if (value.startsWith("goal:")) return { goalId: value.slice("goal:".length) }
  if (value.startsWith("milestone:")) return { milestoneId: value.slice("milestone:".length) }
  return {}
}

function KindPicker({
  value,
  onChange,
  idPrefix,
}: {
  value: CoachingNoteKind
  onChange: (kind: CoachingNoteKind) => void
  idPrefix: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Note kind">
      {NOTE_KINDS.map((kind) => (
        <Button
          key={`${idPrefix}-${kind}`}
          type="button"
          size="sm"
          variant={value === kind ? "default" : "outline"}
          role="radio"
          aria-checked={value === kind}
          onClick={() => onChange(kind)}
        >
          {NOTE_KIND_LABEL[kind]}
        </Button>
      ))}
    </div>
  )
}

export type NotesPanelProps = {
  memberId: string
  /** For the sentences; "this member" when absent. */
  memberName?: string
  /** The member's shared goals — the only goals a note may point at. */
  goals?: Pick<SummitGoal, "goalId" | "title">[]
  /** The member's roadmap milestones. A note points AT one; it never carries a
   *  horizon, due date or status of its own — those live on the milestone. */
  milestones?: Pick<Milestone, "milestoneId" | "title">[]
}

export function NotesPanel({ memberId, memberName, goals = [], milestones = [] }: NotesPanelProps) {
  const sk = useDevSkin()
  const who = memberName?.trim() || "this member"

  const { data: notes, isLoading, isError } = useMemberNotes(memberId)
  const create = useCreateCoachingNote(memberId)
  const update = useUpdateCoachingNote(memberId)
  const remove = useDeleteCoachingNote(memberId)

  const [kind, setKind] = useState<CoachingNoteKind>("observation")
  const [body, setBody] = useState("")
  const [about, setAbout] = useState<string>("none")
  const [composerError, setComposerError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKind, setEditKind] = useState<CoachingNoteKind>("observation")
  const [editBody, setEditBody] = useState("")
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const goalTitle = new Map(goals.map((g) => [g.goalId, g.title]))
  const milestoneTitle = new Map(milestones.map((m) => [m.milestoneId, m.title]))

  const submitNew = async () => {
    const text = body.trim()
    if (!text) return
    setComposerError(null)
    try {
      await create.mutateAsync({ kind, body: text, source: "manual", ...aboutToRef(about) })
      // Cleared ONLY on success: a failed save that also loses what was typed
      // costs the note twice.
      setBody("")
      setAbout("none")
      toast.success("Note saved.")
    } catch (err) {
      const message = apiErrorMessage(err, "That note wasn't saved. Nothing was recorded.")
      setComposerError(message)
      toast.error(message)
    }
  }

  const beginEdit = (note: CoachingNote) => {
    setEditingId(note.id)
    setEditKind((note.kind as CoachingNoteKind) ?? "observation")
    setEditBody(note.body ?? "")
  }

  const submitEdit = async (noteId: string) => {
    const text = editBody.trim()
    if (!text) return
    try {
      // Only `kind` and `body` are sent: the server writes exactly the keys it
      // receives, so omitting the refs leaves this note's goal/milestone link
      // untouched. Sending `null` would CLEAR it.
      await update.mutateAsync({ noteId, input: { kind: editKind, body: text } })
      setEditingId(null)
      toast.success("Note updated.")
    } catch (err) {
      toast.error(apiErrorMessage(err, "That edit wasn't saved. The note is unchanged."))
    }
  }

  const submitDelete = async (noteId: string) => {
    try {
      await remove.mutateAsync(noteId)
      setConfirmingDeleteId(null)
      toast.success("Note deleted.")
    } catch (err) {
      // A 404 here reads "no such note" — never "not allowed", which would tell
      // the caller somebody else's note exists.
      toast.error(apiErrorMessage(err, "That note is no longer there."))
    }
  }

  return (
    <div className="space-y-4">
      <p className={cn("flex items-start gap-1.5 rounded-md p-2.5 text-[11px]", sk.bgMuted50, sk.text500)}>
        <Lock className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sk.text400)} aria-hidden="true" />
        <span>
          Only you can see these notes. They are not shared with {who}, with their other coaches, or
          with anyone who inherits the report.
        </span>
      </p>

      {/* Composer */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <form
            className="space-y-3"
            aria-label="Write a note"
            onSubmit={(e) => {
              e.preventDefault()
              void submitNew()
            }}
          >
            <KindPicker value={kind} onChange={setKind} idPrefix="new" />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`What you observed, what you plan, or what came of it. Only you read this.`}
              rows={3}
              className="text-sm"
              aria-label="Note body"
            />
            {/* ONE picker, so "a goal or a milestone, not both" cannot be sent. */}
            <div className="flex flex-wrap items-center gap-2">
              <label className={cn("text-xs font-medium", sk.text600)} htmlFor="note-about">
                About
              </label>
              <select
                id="note-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className={cn("rounded-md border px-2 py-1.5 text-xs", sk.border200, sk.text700)}
              >
                <option value="none">Nothing in particular</option>
                {goals.map((g) => (
                  <option key={g.goalId} value={`goal:${g.goalId}`}>
                    Goal: {g.title}
                  </option>
                ))}
                {milestones.map((m) => (
                  <option key={m.milestoneId} value={`milestone:${m.milestoneId}`}>
                    Milestone: {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={create.isPending || body.trim().length === 0}>
                <NotebookPen className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {create.isPending ? "Saving…" : "Save note"}
              </Button>
            </div>
          </form>
          {composerError ? (
            <p
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"
            >
              {composerError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className={cn("py-10 text-center text-sm", sk.text400)}>Loading notes…</div>
      ) : isError ? (
        <Card className="border-dashed">
          <CardContent className={cn("p-6 text-center text-sm", sk.text500)} role="alert">
            Couldn&rsquo;t load your notes for {who}. Nothing has been lost — try again.
          </CardContent>
        </Card>
      ) : (notes?.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
            You haven&rsquo;t written any notes about {who} yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" aria-label="Your notes about this member">
          {notes?.map((note) => {
            const aboutLine = note.goalId
              ? `Goal: ${goalTitle.get(note.goalId) ?? note.goalId}`
              : note.milestoneId
                ? `Milestone: ${milestoneTitle.get(note.milestoneId) ?? note.milestoneId}`
                : ""
            const when = formatNoteDate(note.createdAt)
            return (
              <li key={note.id}>
                <Card>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{NOTE_KIND_LABEL[note.kind] ?? note.kind}</Badge>
                      {aboutLine ? (
                        <span className={cn("text-xs", sk.text500)}>{aboutLine}</span>
                      ) : null}
                      {when ? <span className={cn("ml-auto text-xs", sk.text400)}>{when}</span> : null}
                    </div>

                    {editingId === note.id ? (
                      <form
                        className="space-y-2"
                        aria-label="Edit this note"
                        onSubmit={(e) => {
                          e.preventDefault()
                          void submitEdit(note.id)
                        }}
                      >
                        <KindPicker value={editKind} onChange={setEditKind} idPrefix={`edit-${note.id}`} />
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={3}
                          className="text-sm"
                          aria-label="Edit note body"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={update.isPending || editBody.trim().length === 0}
                          >
                            {update.isPending ? "Saving…" : "Save changes"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className={cn("whitespace-pre-wrap text-sm", sk.text700)}>{note.body}</p>
                        {confirmingDeleteId === note.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("text-xs", sk.text600)}>
                              Delete this note? It cannot be recovered.
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={remove.isPending}
                              onClick={() => void submitDelete(note.id)}
                            >
                              {remove.isPending ? "Deleting…" : "Delete note"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmingDeleteId(null)}
                            >
                              Keep it
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="ghost" onClick={() => beginEdit(note)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmingDeleteId(note.id)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
