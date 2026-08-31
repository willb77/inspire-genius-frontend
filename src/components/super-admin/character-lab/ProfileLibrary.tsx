import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useDeleteProfile,
  usePatchProfile,
  useSavedProfiles,
} from "@/hooks/super-admin/useCharacterLab"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { ProfileSummary } from "@/types/character-lab"

/**
 * The recall list: every character this operator has saved.
 *
 * "Load" hands the profile back to the Build tab so it can be re-read,
 * re-analysed or exported. "Edit" changes the character's name, source and
 * notes WITHOUT re-scoring — the notes are the evidence the next run scores
 * against, so the intended loop is: edit, load, rebuild.
 *
 * Deleting asks first. These cost several model calls to produce and the list
 * is usually assembled just before a demo.
 */
export default function ProfileLibrary({
  onLoad,
  loadingId,
}: {
  onLoad: (id: string) => void
  loadingId: string | null
}) {
  const { data: profiles, isLoading, error } = useSavedProfiles()
  const patch = usePatchProfile()
  const remove = useDeleteProfile()

  const [editing, setEditing] = useState<ProfileSummary | null>(null)
  const [draft, setDraft] = useState({ name: "", source: "", notes: "" })
  const [confirming, setConfirming] = useState<ProfileSummary | null>(null)

  function openEdit(p: ProfileSummary) {
    setEditing(p)
    setDraft({ name: p.name, source: p.source, notes: p.notes })
  }

  async function saveEdit() {
    if (!editing) return
    if (!draft.name.trim()) {
      toast.error("A character needs a name.")
      return
    }
    try {
      await patch.mutateAsync({ id: editing.id, patch: draft })
      toast.success(`Updated ${draft.name.trim()}`)
      setEditing(null)
    } catch (err) {
      // The server refuses a rename onto an existing name with a 409 and says
      // so; surfacing its message beats a generic failure the operator cannot
      // act on. Via apiErrorMessage so a 422 — whose `detail` is an array of
      // objects — reports instead of crashing the page.
      toast.error(apiErrorMessage(err, "Could not save the change"))
    }
  }

  async function confirmDelete() {
    if (!confirming) return
    const name = confirming.name
    try {
      await remove.mutateAsync(confirming.id)
      toast.success(`Deleted ${name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete")
    } finally {
      setConfirming(null)
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (error) {
    return (
      <p className="text-sm text-destructive">
        The saved characters could not be loaded. This is a load failure, not an empty library —
        do not assume nothing is saved.
      </p>
    )
  }

  if (!profiles?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing saved yet. Build a character on the <strong>Build</strong> tab, then press
        <strong> Save to library</strong>.
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y rounded-md border">
        {profiles.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.source || "no source recorded"} · {p.scored} scale
                {p.scored === 1 ? "" : "s"}
                {p.has_analysis ? " · analysed" : " · not analysed"}
                {p.updated_at ? ` · updated ${new Date(p.updated_at).toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onLoad(p.id)}
                disabled={loadingId === p.id}
              >
                {loadingId === p.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Load
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEdit(p)}
                aria-label={`Edit ${p.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(p)}
                aria-label={`Delete ${p.name}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit character</DialogTitle>
            <DialogDescription>
              Changes the record, not the scores. Add what you know, then load the character and
              rebuild — the next run scores against these notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cl-edit-name">Name</Label>
              <Input
                id="cl-edit-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-edit-source">Source</Label>
              <Input
                id="cl-edit-source"
                value={draft.source}
                onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-edit-notes">What else do we know about them?</Label>
              <Textarea
                id="cl-edit-notes"
                rows={6}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Scenes, decisions, how they behave under pressure. Treated as evidence about the character."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={patch.isPending}>
              {patch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirming?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved profile. Scenarios that used this character keep their own
              record of the run and are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
