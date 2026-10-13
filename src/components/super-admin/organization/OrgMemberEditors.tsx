import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/types/roles";
import {
  EDITABLE_ROLES,
  NONE_VALUE,
  type PersonOption,
} from "@/components/super-admin/organization/orgMemberEditors.constants";

interface ManagerSelectProps {
  memberId: string;
  memberName: string;
  /** null: no manager. undefined: the user list did not say (an older backend). */
  managerId: string | null | undefined;
  managerName: string | null | undefined;
  /** People in the same organization. The member themself is left out here. */
  candidates: PersonOption[];
  disabled?: boolean;
  onPick: (managerId: string | null, managerName: string) => void;
}

/**
 * Pick a manager from the same organization, or "None".
 *
 * The server refuses a manager from another organization and a user managing
 * themself; this list only offers people the server would accept. A current
 * manager the list does not contain (an existing cross-organization line, or
 * someone past the first page) is still shown as the current value.
 */
export function ManagerSelect({
  memberId,
  memberName,
  managerId,
  managerName,
  candidates,
  disabled,
  onPick,
}: ManagerSelectProps) {
  // Showing "None" when the backend simply did not report the line would
  // claim a fact nobody read, and invite clearing a line that exists.
  if (managerId === undefined) {
    return <span className="text-sm text-muted-foreground">Not available yet</span>;
  }
  const options = candidates.filter((c) => c.id !== memberId);
  const current = managerId ?? NONE_VALUE;
  const currentMissing = !!managerId && !options.some((o) => o.id === managerId);
  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(v) => {
        if (v === current) return;
        if (v === NONE_VALUE) onPick(null, "None");
        else onPick(v, options.find((o) => o.id === v)?.name ?? v);
      }}
    >
      <SelectTrigger className="w-48" aria-label={`Manager of ${memberName}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None</SelectItem>
        {currentMissing && (
          <SelectItem value={managerId as string}>{managerName || "Current manager"}</SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface RoleSelectProps {
  memberName: string;
  role: string;
  disabled?: boolean;
  onPick: (role: string) => void;
}

export function RoleSelect({ memberName, role, disabled, onPick }: RoleSelectProps) {
  return (
    <Select
      value={role}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== role) onPick(v);
      }}
    >
      <SelectTrigger className="w-40" aria-label={`Role of ${memberName}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!EDITABLE_ROLES.includes(role as (typeof EDITABLE_ROLES)[number]) && (
          <SelectItem value={role}>{ROLE_LABELS[role] ?? role}</SelectItem>
        )}
        {EDITABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r] ?? r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface OrgMoveSelectProps {
  memberName: string;
  currentOrgId: string;
  orgs: PersonOption[];
  disabled?: boolean;
  onPick: (toOrgId: string | null, toOrgName: string) => void;
}

/** Move the member to another organization, or remove them from this one. */
export function OrgMoveSelect({ memberName, currentOrgId, orgs, disabled, onPick }: OrgMoveSelectProps) {
  return (
    <Select
      value={currentOrgId}
      disabled={disabled}
      onValueChange={(v) => {
        if (v === currentOrgId) return;
        if (v === NONE_VALUE) onPick(null, "No organization");
        else onPick(v, orgs.find((o) => o.id === v)?.name ?? v);
      }}
    >
      <SelectTrigger className="w-44" aria-label={`Organization of ${memberName}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!orgs.some((o) => o.id === currentOrgId) && (
          <SelectItem value={currentOrgId}>This organization</SelectItem>
        )}
        {orgs.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
        <SelectItem value={NONE_VALUE}>Remove from organization</SelectItem>
      </SelectContent>
    </Select>
  );
}
