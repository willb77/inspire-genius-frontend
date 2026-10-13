import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/super-admin/organization/DataTable";
import Pagination from "@/components/shared/Pagination";
import { useOrg } from "@/hooks/super-admin/organization-management/useOrganizationManagement";
import {
  useChangeUserRole,
  useSetUserManager,
  useUserManagement,
} from "@/hooks/super-admin/user-management/useUserManagement";
import { useChangeUserOrg, useOrgDirectory } from "@/hooks/super-admin/user-management/useOrgAssignment";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import {
  ManagerSelect,
  OrgMoveSelect,
  RoleSelect,
} from "@/components/super-admin/organization/OrgMemberEditors";
import type { PersonOption } from "@/components/super-admin/organization/orgMemberEditors.constants";
import { ROUTES } from "@/constants/routes";

const MEMBERS_PAGE_SIZE = 50;
/** The user list's maximum page; the manager picker offers this many people. */
const MANAGER_CANDIDATES_LIMIT = 100;

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  /** undefined: the backend did not say (older than the manager fields). */
  manager_user_id: string | null | undefined;
  manager_name: string | null;
};

/** A change waiting for the confirm step. Every edit here is confirmed first. */
type PendingChange =
  | { kind: "manager"; member: MemberRow; managerId: string | null; managerName: string }
  | { kind: "role"; member: MemberRow; role: string }
  | { kind: "org"; member: MemberRow; toOrgId: string | null; toOrgName: string };

const StatusBadge = ({ label, active }: { label: string; active: boolean }) => (
  <Badge
    variant="secondary"
    className={
      active
        ? "bg-green-100 text-green-700 border-transparent"
        : "bg-gray-200 text-gray-700 border-transparent"
    }
  >
    {label}
  </Badge>
);

/**
 * One organization: its details from org-service (GET /v1/orgs/{id}) and its
 * members from auth-service (GET /v1/user-management/users?organization_id=),
 * which reads `user_profiles.org_id` — the only place membership lives.
 *
 * Coach assignment, businesses and licences are not shown: the monolith
 * routes they called answer on no tier, and nothing else serves them.
 */
export default function OrganizationView() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;
  const [tab, setTab] = useState<"details" | "members">("members");
  const [page, setPage] = useState(1);

  const { data: org, isLoading, isError, error, refetch } = useOrg(orgId);

  const {
    data: usersRes,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useUserManagement(
    {
      organization_id: orgId,
      page,
      limit: MEMBERS_PAGE_SIZE,
      // Membership is the org column; a super-admin who sits in this org is
      // a member too, so the listing does not hide them here.
      include_super_admins: true,
    },
    { enabled: !!orgId }
  );

  const members = useMemo<MemberRow[]>(
    () =>
      (usersRes?.data?.users ?? []).map((u) => ({
        id: u.user_id,
        name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" "),
        email: u.email ?? "",
        role: u.role ?? "",
        status: u.is_active ? "Active" : "Inactive",
        is_active: Boolean(u.is_active),
        manager_user_id: u.manager_user_id,
        manager_name: u.manager_name ?? null,
      })),
    [usersRes?.data?.users]
  );

  // Manager candidates: everyone in this organization, up to the list route's
  // page maximum. A separate read from the paged table so page 2 can still
  // pick a manager listed on page 1.
  const { data: candidatesRes } = useUserManagement(
    {
      organization_id: orgId,
      page: 1,
      limit: MANAGER_CANDIDATES_LIMIT,
      include_super_admins: true,
    },
    { enabled: !!orgId }
  );
  const candidates = useMemo<PersonOption[]>(
    () =>
      (candidatesRes?.data?.users ?? []).map((u) => ({
        id: u.user_id,
        name:
          u.full_name ||
          [u.first_name, u.last_name].filter(Boolean).join(" ") ||
          u.email,
      })),
    [candidatesRes?.data?.users]
  );
  const candidatesTruncated =
    (candidatesRes?.data?.pagination?.total ?? 0) > MANAGER_CANDIDATES_LIMIT;

  const { data: orgDirectory } = useOrgDirectory(!!orgId);
  const orgOptions = useMemo<PersonOption[]>(
    () => (orgDirectory ?? []).map((o) => ({ id: o.id, name: o.name })),
    [orgDirectory]
  );

  const [pending, setPending] = useState<PendingChange | null>(null);
  const setManager = useSetUserManager();
  const changeRole = useChangeUserRole();
  const changeOrg = useChangeUserOrg();
  const busy = setManager.isPending || changeRole.isPending || changeOrg.isPending;

  const confirmPending = () => {
    if (!pending || !orgId) return;
    const done = { onSettled: () => setPending(null) };
    if (pending.kind === "manager") {
      setManager.mutate(
        { user_id: pending.member.id, manager_user_id: pending.managerId },
        done
      );
    } else if (pending.kind === "role") {
      changeRole.mutate(
        { user_id: pending.member.id, email: pending.member.email, payload: { role: pending.role } },
        done
      );
    } else {
      changeOrg.mutate(
        { userId: pending.member.id, fromOrgId: orgId, toOrgId: pending.toOrgId },
        done
      );
    }
  };

  const pendingText = (() => {
    if (!pending) return null;
    const who = pending.member.name || pending.member.email;
    if (pending.kind === "manager") {
      return {
        title: pending.managerId ? "Change manager?" : "Clear manager?",
        description:
          "The manager decides whose Team Development roster this person is on and who can open their development record.",
        fields: [
          { label: "Person", value: who },
          { label: "From", value: pending.member.manager_name || "None" },
          { label: "To", value: pending.managerName },
        ],
        confirm: pending.managerId ? "Change manager" : "Clear manager",
      };
    }
    if (pending.kind === "role") {
      return {
        title: "Change role?",
        description: "The role decides what this person can see and do across the platform.",
        fields: [
          { label: "Person", value: who },
          { label: "From", value: pending.member.role },
          { label: "To", value: pending.role },
        ],
        confirm: "Change role",
      };
    }
    return {
      title: pending.toOrgId ? "Move to another organization?" : "Remove from organization?",
      description:
        "This person leaves this organization. Their manager line is not changed; clear it first if it should go too.",
      fields: [
        { label: "Person", value: who },
        { label: "To", value: pending.toOrgName },
      ],
      confirm: pending.toOrgId ? "Move" : "Remove",
    };
  })();
  const total = usersRes?.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));

  const memberColumns: Column<MemberRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <RoleSelect
          memberName={row.name || row.email}
          role={row.role}
          disabled={busy}
          onPick={(role) => setPending({ kind: "role", member: row, role })}
        />
      ),
    },
    {
      key: "manager",
      header: "Manager",
      render: (row) => (
        <ManagerSelect
          memberId={row.id}
          memberName={row.name || row.email}
          managerId={row.manager_user_id}
          managerName={row.manager_name}
          candidates={candidates}
          disabled={busy}
          onPick={(managerId, managerName) =>
            setPending({ kind: "manager", member: row, managerId, managerName })
          }
        />
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (row) => (
        <OrgMoveSelect
          memberName={row.name || row.email}
          currentOrgId={orgId as string}
          orgs={orgOptions}
          disabled={busy}
          onPick={(toOrgId, toOrgName) =>
            setPending({ kind: "org", member: row, toOrgId, toOrgName })
          }
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge label={row.status} active={row.is_active} />,
    },
  ];

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading organization details...
        </div>
      </SuperAdminLayout>
    );
  }

  if (isError || !org) {
    const status = error?.response?.status;
    return (
      <SuperAdminLayout>
        <div role="alert" className="flex flex-col justify-center items-center h-64 gap-3">
          <div className="text-sm text-red-600">
            {status === 404
              ? "This organization doesn't exist or has been deactivated."
              : `Couldn't load this organization${status ? ` (HTTP ${status})` : ""}.`}
          </div>
          <div className="flex gap-2">
            {status !== 404 && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.SUPER_ADMIN.ORGANIZATIONS}>Back to organizations</Link>
            </Button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const details = [
    { label: "Name", value: org.name },
    { label: "Type", value: org.type ?? "" },
    { label: "Status", value: org.active ? "Active" : "Deactivated" },
    { label: "Email", value: org.email ?? "" },
    { label: "Website URL", value: org.website_url ?? "" },
    { label: "Contact", value: org.contact ?? "" },
    { label: "Created On", value: org.created_at ?? "" },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">
              Coach assignment, businesses and licences are not available yet.
            </p>
          </div>
          <StatusBadge label={org.active ? "Active" : "Deactivated"} active={org.active} />
        </div>

        <Tabs value={tab} onValueChange={(v: string) => setTab(v as "details" | "members")}>
          <TabsList className="mb-2">
            <TabsTrigger value="members">Members{total ? ` (${total})` : ""}</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <p className="text-sm text-muted-foreground mb-3">
              To add someone, invite them or set their organization from{" "}
              <Link className="underline" to={ROUTES.SUPER_ADMIN.USERS}>
                User Management
              </Link>
              .
              {candidatesTruncated &&
                ` The manager list offers the first ${MANAGER_CANDIDATES_LIMIT} members.`}
            </p>
            {membersLoading && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                Loading members...
              </div>
            )}
            {!membersLoading && membersError && (
              <div role="alert" className="flex flex-col justify-center items-center h-40 gap-3">
                <div className="text-sm text-red-600">Couldn&apos;t load members.</div>
                <Button variant="outline" size="sm" onClick={() => refetchMembers()}>
                  Try again
                </Button>
              </div>
            )}
            {!membersLoading && !membersError && members.length === 0 && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                This organization has no members yet.
              </div>
            )}
            {!membersLoading && !membersError && members.length > 0 && (
              <>
                <DataTable columns={memberColumns} data={members} />
                {pageCount > 1 && (
                  <div className="flex justify-end mt-3">
                    <Pagination pageCount={pageCount} page={page} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {details.map(({ label, value }) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Input value={value} readOnly />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmActionModal
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
        title={pendingText?.title ?? ""}
        description={pendingText?.description}
        fields={pendingText?.fields ?? []}
        confirmLabel={pendingText?.confirm ?? "Confirm"}
        confirmLoading={busy}
        onConfirm={confirmPending}
      />
    </SuperAdminLayout>
  );
}
