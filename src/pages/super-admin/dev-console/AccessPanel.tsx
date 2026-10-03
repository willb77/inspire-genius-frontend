import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { UserMinus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmins, useGrant, useRevoke } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleMe } from "@/types/devConsole";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";

interface AccessPanelProps {
  me: DevConsoleMe;
}

/**
 * Owner only: who may use the console. Rendered only when `/me` says
 * `owner: true`; the server enforces it regardless (403 OWNER_ONLY).
 */
export function AccessPanel({ me }: AccessPanelProps) {
  const { t } = useTranslation("devConsole");
  const admins = useAdmins(me.owner);
  const grant = useGrant();
  const revoke = useRevoke();

  const schema = useMemo(() => z.object({ email: z.email(t("access.invalidEmail")) }), [t]);
  const { register, handleSubmit, formState, reset } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(({ email }) =>
    grant.mutate(email.trim(), { onSuccess: () => reset({ email: "" }) })
  );

  return (
    <section className="space-y-2" aria-labelledby="dc-access-title">
      <h3 id="dc-access-title" className="text-sm font-semibold">
        {t("access.title")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("access.ownerNote")}</p>
      <DevConsoleErrorAlert error={admins.error} me={me} />
      {admins.data && admins.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("access.empty")}</p>
      ) : null}
      <ul className="space-y-1">
        {(admins.data ?? []).map((a) => (
          <li key={a.email} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{a.email}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(a.email)}
            >
              <UserMinus className="mr-1 size-3.5" aria-hidden="true" />
              {t("access.revoke")}
            </Button>
          </li>
        ))}
      </ul>
      <DevConsoleErrorAlert error={revoke.error} me={me} />
      <form onSubmit={submit} className="space-y-1" noValidate>
        <Label htmlFor="dc-grant" className="sr-only">
          {t("access.email")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="dc-grant"
            type="email"
            className="h-8 text-xs"
            placeholder={t("access.email")}
            {...register("email")}
          />
          <Button type="submit" size="sm" variant="outline" disabled={grant.isPending}>
            <UserPlus className="mr-1 size-3.5" aria-hidden="true" />
            {t("access.grant")}
          </Button>
        </div>
        {formState.errors.email ? (
          <p role="alert" className="text-xs text-destructive">
            {formState.errors.email.message}
          </p>
        ) : null}
      </form>
      <DevConsoleErrorAlert error={grant.error} me={me} />
    </section>
  );
}
