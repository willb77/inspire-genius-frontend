import { useState } from "react";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  prismAccessErrorMessage,
  useAddApprover,
  useApprovers,
  usePrismAccessPermissions,
  useRemoveApprover,
} from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";
import { PRISM_SURVEY_ACCESS_CAPABILITY } from "@/types/super-admin/prism-access";
import { VERTICAL_ENTITLEMENTS_CAPABILITY } from "@/types/super-admin/vertical-entitlements";
import { approverSchema } from "./approver.schema";

type ApproverInput = z.input<typeof approverSchema>;
type ApproverOutput = z.output<typeof approverSchema>;

const CAPABILITY_LABELS: Record<string, string> = {
  [PRISM_SURVEY_ACCESS_CAPABILITY]: "PRISM survey access",
  [VERTICAL_ENTITLEMENTS_CAPABILITY]: "Vertical entitlements",
};

const CAPABILITY_SCOPE: Record<string, string> = {
  [PRISM_SURVEY_ACCESS_CAPABILITY]: "change PRISM survey access",
  [VERTICAL_ENTITLEMENTS_CAPABILITY]: "grant or revoke vertical entitlements",
};

interface PrismApproversPanelProps {
  /** The control whose approvers this panel lists and adds. Defaults to PRISM survey access. */
  capability?: string;
}

const label = (cap: string): string => CAPABILITY_LABELS[cap] ?? cap;

/**
 * Approvers — who may use one admin control (PRISM survey access by default,
 * or vertical entitlements). Lists only that control's approvers. Shown only to the
 * owner (the backend decides who that is; this page never knows), and every
 * route behind it refuses anyone else. The owner is always an approver and
 * cannot be removed here.
 */
export default function PrismApproversPanel({
  capability = PRISM_SURVEY_ACCESS_CAPABILITY,
}: PrismApproversPanelProps = {}): JSX.Element | null {
  const { isOwner } = usePrismAccessPermissions(true);
  const list = useApprovers(isOwner);
  const add = useAddApprover();
  const remove = useRemoveApprover();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const form = useForm<ApproverInput, unknown, ApproverOutput>({
    resolver: zodResolver(approverSchema),
    defaultValues: { email: "", capability },
  });

  if (!isOwner) return null;

  const onSubmit = form.handleSubmit((values) => {
    add.mutate(values, { onSuccess: () => form.reset({ ...values, email: "" }) });
  });
  const fieldError = form.formState.errors.email?.message;
  const approvers = (list.data?.approvers ?? []).filter((a) => a.capability === capability);
  const others = approvers.filter((a) => !a.is_owner);

  return (
    <Card className="shadow-sm" data-testid="prism-approvers-panel">
      <CardHeader className="text-left">
        <CardTitle className="text-base font-semibold">Approvers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Super-admins who may {CAPABILITY_SCOPE[capability] ?? label(capability)}. Only you can add or remove them, and
          each one must also be a super-admin.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1 space-y-1">
            <Label htmlFor="approver-email">Email</Label>
            <Input
              id="approver-email"
              type="email"
              autoComplete="off"
              aria-invalid={!!fieldError}
              {...form.register("email")}
            />
          </div>
          <input type="hidden" {...form.register("capability")} />
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4" />
            )}
            Add approver
          </Button>
        </form>
        {fieldError && (
          <p role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        )}

        {list.isLoading && <p className="text-sm text-muted-foreground">Loading approvers…</p>}
        {list.isError && (
          <p role="alert" className="text-sm text-red-600">
            {prismAccessErrorMessage(list.error, "Could not load the approvers.")}
          </p>
        )}
        {!list.isLoading && !list.isError && others.length === 0 && (
          <p className="text-sm text-muted-foreground">No approvers besides you.</p>
        )}
        {approvers.length > 0 && (
          <ul className="divide-y rounded-md border">
            {approvers.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {a.email}
                  <span className="ml-2 text-xs text-muted-foreground">{label(a.capability)}</span>
                  {a.is_owner && (
                    <span className="ml-2 text-xs text-muted-foreground">(you, always)</span>
                  )}
                </span>
                {a.is_owner ? null : confirmId === a.id ? (
                  <span className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate({ id: a.id }, { onSettled: () => setConfirmId(null) })
                      }
                    >
                      Confirm remove
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${a.email}`}
                    onClick={() => setConfirmId(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
