/**
 * Coaching notes — read, edit, delete. Creation lives in `useDevelopmentGoals`
 * (`useCreateCoachingNote`), where it was already wired for the note-about-a-
 * goal composer; it now invalidates this list too.
 *
 * These are **one manager's** notes about one member. The server scopes every
 * read and write to the calling manager, so there is nothing here that another
 * coach or the member can see — and the UI must not suggest otherwise.
 *
 * None of these three hooks opts into the global error net
 * (`lib/mutationErrorToast.ts`): each is awaited by the panel, which renders
 * the server's own sentence. A 400 over a goal/milestone that belongs to
 * somebody else is a real answer and must reach the manager verbatim.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteCoachingNote,
  listCoachingNotes,
  updateCoachingNote,
  type CoachingNote,
  type UpdateCoachingNoteInput,
} from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * This manager's notes for this member, newest first.
 *
 * The order is the server's and is not re-sorted here: `created_at` is the only
 * thing that dates an observation, and a client-side sort on a possibly-absent
 * timestamp would reorder them silently.
 */
export function useMemberNotes(memberId: string | undefined) {
  return useQuery<CoachingNote[]>({
    queryKey: developmentKeys.notes(memberId ?? ""),
    queryFn: async () => {
      const r = await listCoachingNotes(memberId as string)
      return r.data?.data?.notes ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 30_000,
  })
}

/** Edit a note. Only the fields passed are written; an explicit null clears one. */
export function useUpdateCoachingNote(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<CoachingNote, Error, { noteId: string; input: UpdateCoachingNoteInput }>({
    mutationFn: async ({ noteId, input }) => {
      const r = await updateCoachingNote(memberId as string, noteId, input)
      const data = r.data?.data
      if (!data) throw new Error("The note was not saved.")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.notes(memberId) })
    },
  })
}

/** Delete a note. A 404 means "not there, or not yours" — the two are one answer. */
export function useDeleteCoachingNote(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<string, Error, string>({
    mutationFn: async (noteId) => {
      const r = await deleteCoachingNote(memberId as string, noteId)
      if (!r.data?.data?.deleted) throw new Error("The note was not deleted.")
      return noteId
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.notes(memberId) })
    },
  })
}
