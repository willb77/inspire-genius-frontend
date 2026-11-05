/**
 * RWO-8 §10 — "Add a role" in Step 2. A role typed here counts as on file for
 * the draft, the same way an interview answer does. Page state only.
 */
import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  cleanRole,
  EMPTY_ROLE,
  ROLE_BULLET_MAX,
  ROLE_DATE_MAX,
  ROLE_TEXT_MAX,
  ROLES_MAX,
  roleLine,
  type RoleDraft,
} from "@/lib/resume/guided/roles"

export function GuidedRoles({ roles, onRoles }: { roles: RoleDraft[]; onRoles: (r: RoleDraft[]) => void }) {
  // null = no form open; -1 = adding; n = editing roles[n].
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<RoleDraft>(EMPTY_ROLE)

  const open = (i: number) => {
    setEditing(i)
    setForm(i >= 0 ? { ...roles[i], bullets: [...roles[i].bullets, "", "", ""].slice(0, 3) } : { ...EMPTY_ROLE, bullets: ["", "", ""] })
  }
  const save = () => {
    if (!cleanRole(form) || editing === null) return
    onRoles(editing >= 0 ? roles.map((r, i) => (i === editing ? form : r)) : [...roles, form])
    setEditing(null)
  }
  const set = (patch: Partial<RoleDraft>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-2 rounded-lg border p-4" data-testid="guided-roles">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Roles you add</h3>
        {editing === null && roles.length < ROLES_MAX ? (
          <Button size="sm" variant="outline" onClick={() => open(-1)} data-testid="guided-add-role">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add a role
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Missing a job from your résumé? Add it here. It counts as on file for this draft, like your answers to the
        questions — not saved to your profile.
      </p>
      {roles.length ? (
        <ul className="space-y-1">
          {roles.map((r, i) => (
            <li key={`${r.title}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">{roleLine(r)}</span>
              <span className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" aria-label={`Edit ${r.title}`} onClick={() => open(i)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${r.title}`}
                  onClick={() => {
                    onRoles(roles.filter((_, j) => j !== i))
                    if (editing === i) setEditing(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {editing !== null ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3" data-testid="guided-role-form">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="g-role-title">Job title</Label>
              <Input id="g-role-title" maxLength={ROLE_TEXT_MAX} value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-role-org">Organization</Label>
              <Input id="g-role-org" maxLength={ROLE_TEXT_MAX} value={form.organization} onChange={(e) => set({ organization: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-role-start">Start (e.g. 06/2019)</Label>
              <Input id="g-role-start" maxLength={ROLE_DATE_MAX} value={form.start} onChange={(e) => set({ start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-role-end">End</Label>
              <Input
                id="g-role-end"
                maxLength={ROLE_DATE_MAX}
                value={form.present ? "" : form.end}
                disabled={form.present}
                onChange={(e) => set({ end: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Checkbox id="g-role-present" checked={form.present} onCheckedChange={(v) => set({ present: v === true })} />
                <Label htmlFor="g-role-present" className="text-xs font-normal">
                  I still work here
                </Label>
              </div>
            </div>
          </div>
          {form.bullets.map((b, i) => (
            <div key={i} className="space-y-1">
              <Label htmlFor={`g-role-bullet-${i}`}>{i === 0 ? "What you did (up to 3 lines, optional)" : `Line ${i + 1}`}</Label>
              <Input
                id={`g-role-bullet-${i}`}
                maxLength={ROLE_BULLET_MAX}
                value={b}
                onChange={(e) => set({ bullets: form.bullets.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!cleanRole(form)}>
              Save role
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
