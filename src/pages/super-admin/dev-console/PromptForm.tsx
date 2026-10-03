import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEV_CONSOLE_PROMPT_MAX,
  DEV_CONSOLE_SHORTCUTS,
  type DevConsoleModel,
  type DevConsoleRepo,
} from "@/types/devConsole";

const MODELS = ["auto", "haiku", "sonnet", "opus"] as const;

const SHORTCUT_LABEL_KEY: Record<(typeof DEV_CONSOLE_SHORTCUTS)[number], string> = {
  "/where": "shortcuts.where",
  "/explain": "shortcuts.explain",
  "/why-failing": "shortcuts.whyFailing",
  "/review": "shortcuts.review",
  "/history": "shortcuts.history",
};

export interface PromptValues {
  repo: string;
  model: DevConsoleModel;
  ref: string;
  prompt: string;
}

interface PromptFormProps {
  repos: DevConsoleRepo[];
  models: DevConsoleModel[];
  defaultModel: DevConsoleModel;
  disabled: boolean;
  pending: boolean;
  /** Called with valid values; resolves true when the job was accepted (clears the prompt). */
  onSubmit: (values: PromptValues) => Promise<boolean>;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Strip a leading shortcut so a second shortcut click replaces, not stacks. */
function withShortcut(prompt: string, shortcut: string): string {
  const rest = prompt.replace(/^\/[a-z-]+\s*/, "");
  return `${shortcut} ${rest}`;
}

export function PromptForm({ repos, models, defaultModel, disabled, pending, onSubmit }: PromptFormProps) {
  const { t } = useTranslation("devConsole");

  const schema = useMemo(
    () =>
      z.object({
        repo: z.string().min(1, t("form.repoRequired")),
        model: z.enum(MODELS),
        ref: z.string().trim().max(200),
        prompt: z
          .string()
          .trim()
          .min(1, t("form.promptRequired"))
          .max(DEV_CONSOLE_PROMPT_MAX, t("form.promptTooLong", { max: DEV_CONSOLE_PROMPT_MAX })),
      }),
    [t]
  );

  const form = useForm<PromptValues>({
    resolver: zodResolver(schema),
    defaultValues: { repo: repos[0]?.key ?? "", model: defaultModel, ref: "", prompt: "" },
  });
  const { register, handleSubmit, setValue, watch, formState, getValues, resetField } = form;

  // The repo list arrives after first render; select its first entry once it does.
  useEffect(() => {
    if (!getValues("repo") && repos[0]) setValue("repo", repos[0].key);
  }, [repos, getValues, setValue]);

  const repoKey = watch("repo");
  const prompt = watch("prompt");
  const repo = repos.find((r) => r.key === repoKey);
  const offered = models.length ? models : [...MODELS];

  const submit = handleSubmit(async (values) => {
    const accepted = await onSubmit(values);
    if (accepted) resetField("prompt");
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="dc-repo">{t("form.repo")}</Label>
          <select id="dc-repo" className={selectClass} disabled={disabled} {...register("repo")}>
            {repos.length === 0 ? <option value="">{t("form.noRepos")}</option> : null}
            {repos.map((r) => (
              <option key={r.key} value={r.key}>
                {r.full_name}
              </option>
            ))}
          </select>
          {formState.errors.repo ? (
            <p role="alert" className="text-xs text-destructive">
              {formState.errors.repo.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="dc-model">{t("form.model")}</Label>
          <select id="dc-model" className={selectClass} disabled={disabled} {...register("model")}>
            {offered.map((m) => (
              <option key={m} value={m}>
                {t(`models.${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dc-ref">{t("form.ref")}</Label>
          <Input
            id="dc-ref"
            disabled={disabled}
            placeholder={t("form.refPlaceholder", { branch: repo?.default_branch ?? "development" })}
            {...register("ref")}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("form.shortcuts")}</span>
          {DEV_CONSOLE_SHORTCUTS.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 font-mono text-xs"
              title={t(SHORTCUT_LABEL_KEY[s])}
              disabled={disabled}
              onClick={() => setValue("prompt", withShortcut(getValues("prompt"), s), { shouldDirty: true })}
            >
              {s}
            </Button>
          ))}
        </div>
        <Label htmlFor="dc-prompt" className="sr-only">
          {t("form.prompt")}
        </Label>
        <Textarea
          id="dc-prompt"
          rows={4}
          disabled={disabled}
          placeholder={t("form.promptPlaceholder")}
          aria-label={t("form.prompt")}
          {...register("prompt")}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formState.errors.prompt ? (
              <span role="alert" className="text-destructive">
                {formState.errors.prompt.message}
              </span>
            ) : null}
          </span>
          <span>{t("form.count", { count: prompt.length, max: DEV_CONSOLE_PROMPT_MAX })}</span>
        </div>
      </div>

      <Button type="submit" disabled={disabled || pending}>
        <Send className="mr-1 size-4" aria-hidden="true" />
        {pending ? t("form.sending") : t("form.send")}
      </Button>
    </form>
  );
}
