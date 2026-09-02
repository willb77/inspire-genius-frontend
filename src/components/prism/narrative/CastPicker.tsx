import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProfileSummary } from "@/types/character-lab"

/**
 * Choose which saved characters a comparison or scenario runs over.
 *
 * `max` is enforced here as well as on the server. The client check exists to
 * stop the operator selecting a fifth and being refused after the fact; the
 * server check is the one that matters, and neither replaces the other.
 */
export default function CastPicker({
  profiles,
  loading,
  selected,
  onChange,
  max,
  min = 1,
  idPrefix,
}: {
  profiles: ProfileSummary[]
  loading: boolean
  selected: string[]
  onChange: (ids: string[]) => void
  max: number
  min?: number
  idPrefix: string
}) {
  if (loading) return <Skeleton className="h-24 w-full" />

  if (!profiles.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved characters yet. Build one on the <strong>Build</strong> tab and save it — this
        list reads from what you have saved, not from the tab you left open.
      </p>
    )
  }

  const atCap = selected.length >= max

  function toggle(id: string, on: boolean) {
    if (on) {
      if (selected.includes(id) || atCap) return
      onChange([...selected, id])
    } else {
      onChange(selected.filter((s) => s !== id))
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {profiles.map((p) => {
          const on = selected.includes(p.id)
          const id = `${idPrefix}-${p.id}`
          return (
            <div key={p.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id={id}
                checked={on}
                // Disabled only when adding another would exceed the cap — never
                // when it is already selected, or the operator could not
                // deselect their way back under it.
                disabled={!on && atCap}
                onCheckedChange={(v) => toggle(p.id, v === true)}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-tight">
                <span className="font-medium">{p.name}</span>
                {p.source && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{p.source}</span>
                )}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {p.scored} scale{p.scored === 1 ? "" : "s"} scored
                  {p.has_analysis ? " · analysed" : ""}
                </span>
              </Label>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length} selected · needs at least {min}, at most {max}.
        {atCap && " Deselect one to choose a different character."}
      </p>
    </div>
  )
}
