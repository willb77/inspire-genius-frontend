import { useState } from "react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { decisionPathErrorMessage, useSaveRuleSet } from "@/hooks/job-blueprint/useDecisionPath"
import type {
  DecisionOnFail,
  DecisionPathStatus,
  DecisionRule,
  DecisionRuleKind,
  DecisionRuleSet,
} from "@/types/job-blueprint"

/**
 * The district's written minimum standard, as data. Only a DRAFT can be
 * edited; the server freezes a version when it is activated, so every
 * decision made under it can be reconstructed. The server validates every rule
 * and returns every problem at once; this form checks shape only.
 */
const OPERATOR: Record<DecisionRuleKind, string> = {
  degree: "at_least",
  licensure_path: "in",
  background_check_status: "in",
  attested_requirement: "is_true",
}

function kindLabel(t: TFunction, kind: DecisionRuleKind): string {
  const labels: Record<DecisionRuleKind, string> = {
    degree: t("ruleEditor.kind.degree", { defaultValue: "Degree (at least)" }),
    licensure_path: t("ruleEditor.kind.licensurePath", { defaultValue: "Licensure path (one of)" }),
    background_check_status: t("ruleEditor.kind.backgroundCheck", { defaultValue: "Background-check status, as attested (one of)" }),
    attested_requirement: t("ruleEditor.kind.attested", { defaultValue: "Attested requirement (yes)" }),
  }
  return labels[kind]
}

const makeRuleSchema = (t: TFunction) =>
  z.object({
    id: z.string().trim().regex(/^[A-Za-z0-9-]+$/, t("ruleEditor.val.id", { defaultValue: "Letters, digits or '-'" })),
    kind: z.enum(["degree", "licensure_path", "background_check_status", "attested_requirement"]),
    label: z.string().trim().min(1, t("ruleEditor.val.label", { defaultValue: "Give the rule a label" })).max(200),
    expected: z.string().trim(),
    onFail: z.enum(["refer", "hold", "none"]),
    sourceRef: z.string().trim().min(1, t("ruleEditor.val.sourceRef", { defaultValue: "Name the clause of the written standard" })).max(300),
  })

const makeSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("ruleEditor.val.name", { defaultValue: "Name the rule set" })).max(200),
    rules: z.array(makeRuleSchema(t)).min(1, t("ruleEditor.val.rules", { defaultValue: "Add at least one rule" })),
    residencyWhen: z.string().trim(),
    decisionMakers: z.string().trim().min(3, t("ruleEditor.val.makers", { defaultValue: "Name at least one decision-maker by email" })),
  })
type Values = z.input<ReturnType<typeof makeSchema>>

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

function toRule(r: Values["rules"][number]): DecisionRule {
  const expected =
    r.kind === "attested_requirement" ? true : r.kind === "degree" ? r.expected.trim() : splitList(r.expected)
  return {
    id: r.id.trim(),
    kind: r.kind,
    label: r.label.trim(),
    operator: OPERATOR[r.kind],
    expected,
    onFail: r.onFail as DecisionOnFail,
    sourceRef: r.sourceRef.trim(),
  }
}

function fromRuleSet(rs: DecisionRuleSet | null): Values {
  if (!rs) {
    return {
      name: "",
      rules: [{ id: "degree", kind: "degree", label: "", expected: "bachelor", onFail: "refer", sourceRef: "" }],
      residencyWhen: "",
      decisionMakers: "",
    }
  }
  return {
    name: rs.name,
    rules: rs.rules.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      expected: Array.isArray(r.expected) ? r.expected.join(", ") : r.expected === true ? "" : String(r.expected ?? ""),
      onFail: r.onFail,
      sourceRef: r.sourceRef,
    })),
    residencyWhen: rs.routePolicy.find((e) => e.route === "residency")?.when.join(", ") ?? "",
    decisionMakers: "",
  }
}

export function RuleSetEditor({
  status,
  draft,
  onSaved,
}: {
  status: DecisionPathStatus
  draft: DecisionRuleSet | null
  onSaved?: () => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const [error, setError] = useState<string | null>(null)
  const save = useSaveRuleSet()
  const { register, control, handleSubmit, formState, watch } = useForm<Values>({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: fromRuleSet(draft),
  })
  const rules = useFieldArray({ control, name: "rules" })
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    const residency = splitList(v.residencyWhen)
    try {
      await save.mutateAsync({
        id: draft?.id,
        body: {
          name: v.name,
          rules: v.rules.map(toRule),
          routePolicy: residency.length ? [{ when: residency, route: "residency" }] : [],
          decisionMakerEmails: splitList(v.decisionMakers),
        },
      })
      toast.success(t("ruleEditor.saved", { defaultValue: "Draft saved." }))
      onSaved?.()
    } catch (err) {
      setError(decisionPathErrorMessage(err, t("ruleEditor.saveFailed", { defaultValue: "Could not save the rule set." })))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={t("ruleEditor.formLabel", { defaultValue: "Rule set" })}>
      <div className="space-y-1">
        <Label htmlFor="rs-name">{t("ruleEditor.name", { defaultValue: "Name" })}</Label>
        <Input id="rs-name" disabled={!!draft} {...register("name")} />
        <p className="text-xs text-red-600">{formState.errors.name?.message}</p>
      </div>
      {rules.fields.map((f, i) => {
        const kind = watch(`rules.${i}.kind`)
        const e = formState.errors.rules?.[i]
        return (
          <fieldset key={f.id} className="grid gap-2 rounded-md border border-[#e5e7eb] p-3 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium">{t("ruleEditor.ruleN", { defaultValue: "Rule {{n}}", n: i + 1 })}</legend>
            <div className="space-y-1">
              <Label htmlFor={`rule-${i}-id`}>{t("ruleEditor.ruleId", { defaultValue: "Rule id" })}</Label>
              <Input id={`rule-${i}-id`} {...register(`rules.${i}.id`)} />
              <p className="text-xs text-red-600">{e?.id?.message}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rule-${i}-kind`}>{t("ruleEditor.kind.label", { defaultValue: "Kind" })}</Label>
              <select id={`rule-${i}-kind`} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register(`rules.${i}.kind`)}>
                {status.ruleKinds.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(t, k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rule-${i}-label`}>{t("ruleEditor.label", { defaultValue: "Label" })}</Label>
              <Input id={`rule-${i}-label`} {...register(`rules.${i}.label`)} />
              <p className="text-xs text-red-600">{e?.label?.message}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rule-${i}-source`}>{t("ruleEditor.clause", { defaultValue: "Clause of the written standard" })}</Label>
              <Input id={`rule-${i}-source`} {...register(`rules.${i}.sourceRef`)} />
              <p className="text-xs text-red-600">{e?.sourceRef?.message}</p>
            </div>
            {kind !== "attested_requirement" ? (
              <div className="space-y-1">
                <Label htmlFor={`rule-${i}-expected`}>
                  {kind === "degree"
                    ? t("ruleEditor.lowestDegree", { defaultValue: "Lowest degree ({{levels}})", levels: status.degreeLevels.join(", ") })
                    : t("ruleEditor.acceptedValues", { defaultValue: "Accepted values, comma-separated" })}
                </Label>
                <Input id={`rule-${i}-expected`} {...register(`rules.${i}.expected`)} />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor={`rule-${i}-onfail`}>{t("ruleEditor.ifNotMet", { defaultValue: "If not met" })}</Label>
              <select id={`rule-${i}-onfail`} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register(`rules.${i}.onFail`)}>
                <option value="refer">{t("ruleEditor.onFail.refer", { defaultValue: "Refer" })}</option>
                <option value="hold">{t("ruleEditor.onFail.hold", { defaultValue: "Hold" })}</option>
                <option value="none">{t("ruleEditor.onFail.none", { defaultValue: "Nothing (used only to choose the route)" })}</option>
              </select>
            </div>
            <Button type="button" variant="ghost" onClick={() => rules.remove(i)} aria-label={t("ruleEditor.removeRule", { defaultValue: "Remove rule {{n}}", n: i + 1 })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </fieldset>
        )
      })}
      <p className="text-xs text-red-600">{formState.errors.rules?.message}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          rules.append({ id: `rule-${rules.fields.length + 1}`, kind: "attested_requirement", label: "", expected: "", onFail: "hold", sourceRef: "" })
        }
      >
        <Plus className="h-4 w-4" /> {t("ruleEditor.addRule", { defaultValue: "Add a rule" })}
      </Button>
      <div className="space-y-1">
        <Label htmlFor="rs-residency">{t("ruleEditor.residencyWhen", { defaultValue: "Recommend Residency when these rule ids all pass (comma-separated)" })}</Label>
        <Input id="rs-residency" {...register("residencyWhen")} />
        <p className="text-xs text-[#6b7280]">{t("ruleEditor.residencyNote", { defaultValue: "Otherwise a candidate who meets the minimum is recommended Apprentice." })}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="rs-makers">{t("ruleEditor.makersLabel", { defaultValue: "Decision-makers' emails (comma-separated)" })}</Label>
        <Input id="rs-makers" {...register("decisionMakers")} />
        <p className="text-xs text-[#6b7280]">
          {t("ruleEditor.makersNote", { defaultValue: "Each must hold the manager role or above in your organisation. Only they can record a decision under this version." })}
          {draft
            ? ` ${t("ruleEditor.makersCurrent", { defaultValue: "Currently: {{names}} — enter them again to keep them.", names: draft.decisionMakers.map((d) => d.name).join(", ") })}`
            : ""}
        </p>
        <p className="text-xs text-red-600">{formState.errors.decisionMakers?.message}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? t("ruleEditor.saving", { defaultValue: "Saving…" }) : t("ruleEditor.saveDraft", { defaultValue: "Save draft" })}
      </Button>
    </form>
  )
}
