import type { JSX } from "react";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  prismAccessErrorMessage,
  useOrgPrismAccess,
  usePrismAccessPermissions,
  useSetOrgPrismAccess,
} from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";

interface OrgPrismAccessSwitchProps {
  orgId: string;
}

/**
 * Organization view → Details: "Members may request PRISM surveys".
 *
 * Renders nothing unless the backend says this person is an approver for
 * PRISM survey access — being a super-admin is not enough. The switch writes
 * one organisation row for the PRISM survey-request gate; which switch it
 * writes is fixed by the backend.
 */
export default function OrgPrismAccessSwitch({ orgId }: OrgPrismAccessSwitchProps): JSX.Element | null {
  const { canManagePrismAccess } = usePrismAccessPermissions(true);
  const query = useOrgPrismAccess(orgId, canManagePrismAccess);
  const setAccess = useSetOrgPrismAccess();

  if (!canManagePrismAccess) return null;

  const listed = query.data?.listed === true;
  const busy = setAccess.isPending || query.isLoading;

  return (
    <div className="space-y-2 rounded-md border p-4" data-testid="org-prism-access">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="org-prism-access-switch">Members may request PRISM surveys</Label>
          <p className="text-sm text-muted-foreground">
            When on, every member of this organisation may request a PRISM survey without an
            individual approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="org-prism-access-switch"
            checked={listed}
            disabled={busy || query.isError}
            onCheckedChange={(next: boolean) => setAccess.mutate({ orgId, listed: next })}
          />
        </div>
      </div>
      {query.data?.tier && (
        <p className="text-sm text-muted-foreground">
          The whole environment is switched on, so everyone may request a survey today.
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-sm text-red-600">
          {prismAccessErrorMessage(query.error, "Could not read this organisation's access.")}
        </p>
      )}
    </div>
  );
}
