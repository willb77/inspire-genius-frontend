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
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";
import { ROUTES } from "@/constants/routes";

const MEMBERS_PAGE_SIZE = 50;

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
};

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
      })),
    [usersRes?.data?.users]
  );
  const total = usersRes?.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));

  const memberColumns: Column<MemberRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
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
    </SuperAdminLayout>
  );
}
