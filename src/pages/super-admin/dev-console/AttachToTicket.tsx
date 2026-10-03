import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAttachToTicket } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleMe } from "@/types/devConsole";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";

interface AttachToTicketProps {
  sessionId: string;
  me: DevConsoleMe;
}

/** Writes the session summary to a support ticket as an internal note. */
export function AttachToTicket({ sessionId, me }: AttachToTicketProps) {
  const { t } = useTranslation("devConsole");
  const attach = useAttachToTicket();
  const schema = useMemo(
    () => z.object({ ticketId: z.string().trim().min(1, t("attach.required")).max(100) }),
    [t]
  );
  const { register, handleSubmit, formState } = useForm<{ ticketId: string }>({
    resolver: zodResolver(schema),
    defaultValues: { ticketId: "" },
  });

  const submit = handleSubmit(({ ticketId }) => attach.mutate({ sessionId, ticketId }));

  return (
    <form onSubmit={submit} className="space-y-1.5" noValidate>
      <Label htmlFor="dc-ticket" className="text-xs font-semibold">
        {t("attach.title")}
      </Label>
      <div className="flex gap-2">
        <Input id="dc-ticket" className="h-8 text-xs" placeholder={t("attach.ticketId")} {...register("ticketId")} />
        <Button type="submit" size="sm" variant="outline" disabled={attach.isPending}>
          <Paperclip className="mr-1 size-3.5" aria-hidden="true" />
          {t("attach.submit")}
        </Button>
      </div>
      {formState.errors.ticketId ? (
        <p role="alert" className="text-xs text-destructive">
          {formState.errors.ticketId.message}
        </p>
      ) : null}
      {attach.isSuccess ? (
        <p role="status" className="text-xs text-muted-foreground">
          {t("attach.done")}
        </p>
      ) : null}
      <DevConsoleErrorAlert error={attach.error} me={me} />
    </form>
  );
}
