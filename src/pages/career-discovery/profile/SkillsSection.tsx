import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRemoveSkill, useSaveSkill, useSkillSuggestions, useSkills } from "@/hooks/profile/useSkills"
import { discoveryErrorMessage } from "@/hooks/career-discovery/useCareerDiscovery"
import type { SkillSuggestion } from "@/types/profile/skills"
import { DiscoveryError } from "../DiscoveryParts"

const skillSchema = z.object({
  name: z.string().trim().min(1, "Type a skill to add.").max(60, "Keep a skill to 60 characters."),
})
type SkillForm = z.infer<typeof skillSchema>

function SuggestionRow({ s, onAdd, busy }: { s: SkillSuggestion; onAdd: () => void; busy: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <span className="font-medium">{s.name}</span>
        {s.match === "matched" ? (
          <span className="ml-2 text-xs text-muted-foreground">O*NET skill</span>
        ) : (
          <span className="ml-2 text-xs text-muted-foreground">{s.label}</span>
        )}
      </div>
      {s.alreadySaved ? (
        <span className="text-xs text-muted-foreground">Already added</span>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={onAdd} disabled={busy}>
          Add
        </Button>
      )}
    </li>
  )
}

/**
 * JF-11 — Skills on the one profile section: typed by the person, or read from
 * their own résumé as SUGGESTIONS. A suggestion is saved only when the person
 * presses Add on it; asking for suggestions saves nothing.
 */
export function SkillsSection() {
  const skills = useSkills(true)
  const [asked, setAsked] = useState(false)
  const suggestions = useSkillSuggestions(asked)
  const save = useSaveSkill()
  const remove = useRemoveSkill()
  const form = useForm<SkillForm>({ resolver: zodResolver(skillSchema), defaultValues: { name: "" } })
  const onSubmit = form.handleSubmit((v) =>
    save.mutate({ name: v.name, source: "manual" }, { onSuccess: () => form.reset({ name: "" }) }),
  )
  const s = suggestions.data
  const mine = skills.data ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {skills.isLoading ? <p className="text-muted-foreground">Loading your skills…</p> : null}
        {skills.isError ? <DiscoveryError message={discoveryErrorMessage(skills.error)} /> : null}
        {skills.isSuccess && mine.length === 0 ? (
          <p className="text-muted-foreground">No skills added yet. Type one, or read them from your résumé.</p>
        ) : null}
        {mine.length ? (
          <ul aria-label="Your skills" className="flex flex-wrap gap-2">
            {mine.map((k) => (
              <li key={k.id}>
                <Badge variant="secondary" className="gap-1.5">
                  {k.name}
                  {k.matched ? <span className="text-[10px] uppercase opacity-70">O*NET</span> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${k.name}`}
                    onClick={() => remove.mutate(k.id)}
                    disabled={remove.isPending}
                    className="rounded-sm opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <form onSubmit={onSubmit} className="flex items-end gap-2" noValidate>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cd-skill">Add a skill</Label>
            <Input id="cd-skill" placeholder="e.g. Customer service" {...form.register("name")} />
          </div>
          <Button type="submit" disabled={save.isPending}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add
          </Button>
        </form>
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
        {save.isError ? <DiscoveryError message={discoveryErrorMessage(save.error)} /> : null}
        {remove.isError ? <DiscoveryError message={discoveryErrorMessage(remove.error)} /> : null}

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground">
              Read skills from your résumé. Nothing is added until you choose it.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (asked ? void suggestions.refetch() : setAsked(true))}
              disabled={suggestions.isFetching}
            >
              Suggest from my résumé
            </Button>
          </div>
          {suggestions.isFetching ? <p className="text-muted-foreground">Reading your résumé…</p> : null}
          {suggestions.isError ? <DiscoveryError message={discoveryErrorMessage(suggestions.error)} /> : null}
          {s && !suggestions.isFetching ? (
            <div className="space-y-2">
              {s.source ? (
                <p className="text-xs text-muted-foreground">From {s.source.filename ?? "your résumé"}</p>
              ) : null}
              {s.message ? <p className="text-muted-foreground">{s.message}</p> : null}
              {s.onet?.message ? <p className="text-xs text-muted-foreground">{s.onet.message}</p> : null}
              {s.suggestions.length ? (
                <ul aria-label="Suggested skills" className="divide-y">
                  {s.suggestions.map((x) => (
                    <SuggestionRow
                      key={x.name}
                      s={x}
                      busy={save.isPending}
                      onAdd={() => save.mutate({ name: x.name, source: "resume" })}
                    />
                  ))}
                </ul>
              ) : null}
              {s.onet?.state === "ready" && s.onet.attribution ? (
                <p className="text-xs text-muted-foreground">{s.onet.attribution}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
