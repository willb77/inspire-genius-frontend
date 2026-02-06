import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/super-admin/organization/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import ActionMenu from "@/components/shared/ActionMenu";
import AddOrganization from "@/components/super-admin/organization/AddOrganizations";
import UserFormModal from "@/components/shared/forms/UserFormModal";
import type { UserFormValues } from "@/components/shared/forms/userForm.constants";
import {
  useAssignCoachesToBusiness,
  useOrganizationViewDetail,
  useOrganizationAgents,
  useRemoveCoachesFromOrganization,
  useRemoveCoachesFromBusiness,
  useRoles,
} from "@/hooks/super-admin/organization-management/useOrganizationManagement";
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";
import { inviteUser } from "@/services/super-admin/user-management/user-management.service";
import { toast } from "sonner";

type TabType = "basic" | "coaches" | "users";
type ModalType = "admin" | "coach" | "user" | null;

const MODAL_FOR_TAB: Record<string, ModalType> = {
  basic: "admin",
  coaches: "coach",
  users: "user",
};

const BUTTON_LABEL_FOR_TAB: Record<string, string> = {
  basic: "Admin",
  coaches: "Coaches",
  users: "Users",
};

const StatusBadge = ({
  status,
  isActive,
}: {
  status: string;
  isActive: boolean;
}) => (
  <Badge
    variant="secondary"
    className={
      isActive || status === "Active"
        ? "bg-green-100 text-green-700 border-transparent"
        : "bg-gray-200 text-gray-700 border-transparent"
    }
  >
    {status}
  </Badge>
);

// Table row shapes
type LicenseRow = {
  tier: string;
  start: string;
  end: string;
  remaining: number;
  status: string;
  is_active: boolean;
};

type CoachRow = {
  id: string;
  agent_id: string;
  name: string;
  accent: string;
  gender: string;
  tones: string;
  status: string;
  is_active: boolean;
  is_assigned_to_business?: boolean;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
};

export default function OrganizationView() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabType>("basic");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<
    string | "organization"
  >("organization");
  const [assigningAgentId, setAssigningAgentId] = useState<string | null>(null);

  const isOrganizationLevel = selectedBusinessId === "organization";

  const {
    data: orgViewRes,
    isLoading,
    refetch,
  } = useOrganizationViewDetail(params.id);
  const { data: rolesRes } = useRoles();
  const {
    data: orgAgentsRes,
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useOrganizationAgents(
    params.id,
    isOrganizationLevel ? undefined : (selectedBusinessId as string)
  );
  const { data: usersRes, isLoading: isLoadingUsers } = useUserManagement(
    {
      organization_id: params.id,
      business_id: isOrganizationLevel
        ? undefined
        : (selectedBusinessId as string),
      page: 1,
      limit: 50,
    },
    { enabled: tab === "users" && !isOrganizationLevel }
  );

  const assignCoachMutation = useAssignCoachesToBusiness({
    onSuccess: (res) => {
      toast.success(res.message || "Coaches assigned successfully");
      refetchAgents();
    },
    onError: (error) =>
      toast.error(error.message || "Failed to assign coaches"),
  });

  const removeCoachFromOrgMutation = useRemoveCoachesFromOrganization({
    onSuccess: (res) => {
      toast.success(res.message || "Coach removed successfully");
      refetchAgents();
    },
    onError: (error) => toast.error(error.message || "Failed to remove coach"),
  });

  const removeCoachFromBusinessMutation = useRemoveCoachesFromBusiness({
    onSuccess: (res) => {
      toast.success(res.message || "Coach removed successfully");
      refetchAgents();
    },
    onError: (error) => toast.error(error.message || "Failed to remove coach"),
  });

  const organization = useMemo(() => {
    if (!orgViewRes?.data) return null;
    const data = orgViewRes.data;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      admin_name: data.admin_name,
      admin_email: data.admin_email,
      contact: data.contact,
      email: data.email,
      status: data.status ? "Active" : "Deactivated",
      website_url: data.website_url ?? "",
      address: data.address ?? "",
      total_chat: data.total_chat,
      avg_online: data.avg_online,
      created_on: data.created_at,
    };
  }, [orgViewRes?.data]);

  const selectedBusiness = useMemo(
    () =>
      orgViewRes?.data?.businesses?.find((b) => b.id === selectedBusinessId),
    [orgViewRes?.data?.businesses, selectedBusinessId]
  );

  const businessOptions = useMemo(() => {
    const options = [{ id: "organization", label: "Organization" }];
    if (!orgViewRes?.data?.businesses) return options;
    const orgType = organization?.type?.toLowerCase();
    const businesses = orgViewRes.data.businesses;
    if (orgType === "both") {
      businesses.forEach((b) =>
        options.push({ id: b.id, label: b.business_type })
      );
    } else {
      const targetType = orgType === "education" ? "education" : "corporate";
      const business = businesses.find(
        (b) => b.business_type.toLowerCase() === targetType
      );
      if (business)
        options.push({ id: business.id, label: business.business_type });
    }
    return options;
  }, [orgViewRes?.data?.businesses, organization?.type]);

  const coachesData = useMemo<CoachRow[]>(() => {
    const list = (orgAgentsRes?.data?.agents ?? []) as Array<{
      id: string;
      agent_id: string;
      agent_name: string;
      preferences?: {
        accent?: { name?: string };
        gender?: { name?: string };
        tones?: Array<{ name?: string }>;
      };
      is_active: boolean;
      is_assigned_to_business?: boolean;
    }>;
    return list.map((agent) => ({
      id: agent.id,
      agent_id: agent.agent_id,
      name: agent.agent_name,
      accent: agent.preferences?.accent?.name ?? "-",
      gender: agent.preferences?.gender?.name ?? "-",
      tones: (agent.preferences?.tones ?? []).map((t) => t.name ?? "").filter(Boolean).join(", ") || "-",
      status: agent.is_active ? "Active" : "Inactive",
      is_active: agent.is_active,
      is_assigned_to_business: agent.is_assigned_to_business ?? false,
    }));
  }, [orgAgentsRes?.data?.agents]);

  const licenseRows = useMemo<LicenseRow[]>(() => {
    const list = (orgViewRes?.data?.licenses ?? []) as Array<{
      subscription_tier: string;
      start_date: string;
      end_date: string;
      days_remaining: number;
      status: string;
    }>;
    return list.map((l) => ({
      tier: l.subscription_tier,
      start: l.start_date,
      end: l.end_date,
      remaining: l.days_remaining,
      status: l.status,
      is_active: l.status === "active",
    }));
  }, [orgViewRes?.data?.licenses]);

  const usersData = useMemo<UserRow[]>(() => {
    const list = (usersRes?.data?.users ?? []) as Array<{
      user_id: string;
      full_name?: string;
      email?: string;
      role?: string;
      is_active?: boolean;
    }>;
    return list.map((u) => ({
      id: u.user_id,
      name: u.full_name ?? "",
      email: u.email ?? "",
      role: u.role ?? "",
      status: u.is_active ? "Active" : "Inactive",
      is_active: Boolean(u.is_active),
    }));
  }, [usersRes?.data?.users]);

  const handleInviteUser = async (values: UserFormValues, roleName: string) => {
    try {
      const role = rolesRes?.data?.roles?.find((r) => r.name === roleName);
      if (!role) throw new Error(`${roleName} role not found`);
      if (!organization?.id) throw new Error("Missing organization ID");
      if (isOrganizationLevel)
        throw new Error(`Please select a business to add ${roleName}`);
      const inviteRes = await inviteUser({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        role_id: role.id,
        organization_id: organization.id,
        business_id: selectedBusinessId as string,
      });
      if (inviteRes.status) {
        toast.success(inviteRes.message || `${roleName} invited successfully`);
        setActiveModal(null);
        refetch();
      } else {
        throw new Error(
          inviteRes.error_status?.description || `Failed to invite ${roleName}`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to add ${roleName}`
      );
    }
  };

  const handleAssignCoachToBusiness = async (agentId: string) => {
    if (!organization?.id || isOrganizationLevel) {
      toast.error("Cannot assign to organization level");
      return;
    }
    setAssigningAgentId(agentId);
    assignCoachMutation.mutate(
      {
        orgId: organization.id,
        businessId: selectedBusinessId as string,
        payload: { agent_ids: [agentId] },
      },
      { onSettled: () => setAssigningAgentId(null) }
    );
  };

  const handleRemoveCoach = async (agentId: string) => {
    if (!organization?.id) return;
    setAssigningAgentId(agentId);
    const onSettled = () => setAssigningAgentId(null);
    if (isOrganizationLevel) {
      removeCoachFromOrgMutation.mutate(
        { orgId: organization.id, payload: { agent_ids: [agentId] } },
        { onSettled }
      );
    } else {
      removeCoachFromBusinessMutation.mutate(
        {
          orgId: organization.id,
          businessId: selectedBusinessId as string,
          payload: { agent_ids: [agentId] },
        },
        { onSettled }
      );
    }
  };

  const licenseColumns = [
    { key: "tier", header: "Subscription Tier" },
    { key: "start", header: "Start Date" },
    { key: "end", header: "End Date" },
    { key: "remaining", header: "Days Remaining" },
    {
      key: "status",
      header: "Status",
      render: (row: LicenseRow) => (
        <StatusBadge status={row.status} isActive={row.is_active} />
      ),
    },
  ];

  const coachesColumns = [
    { key: "name", header: "Name" },
    { key: "gender", header: "Gender" },
    { key: "accent", header: "Accent" },
    { key: "tones", header: "Tones" },
    ...(!isOrganizationLevel
      ? [
          {
            key: "assignment",
            header: "Assignment",
            render: (row: CoachRow) =>
              row.is_assigned_to_business ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveCoach(row.agent_id)}
                  disabled={assigningAgentId === row.agent_id}
                >
                  {assigningAgentId === row.agent_id
                    ? "Unassigning..."
                    : "Unassign"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAssignCoachToBusiness(row.agent_id)}
                  disabled={assigningAgentId === row.agent_id}
                >
                  {assigningAgentId === row.agent_id
                    ? "Assigning..."
                    : "Assign"}
                </Button>
              ),
          },
        ]
      : []),
    {
      key: "actions",
      header: "Action",
      render: (row: CoachRow) => (
        <ActionMenu
          row={row}
          align="end"
          showView={false}
          showResend={false}
          showDeactivate={false}
          showEdit={true}
          showDelete={false}
        />
      ),
    },
  ];

  const usersColumns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    {
      key: "status",
      header: "Status",
      render: (row: UserRow) => (
        <StatusBadge status={row.status} isActive={row.status === "Active"} />
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row: UserRow) => (
        <ActionMenu
          row={row}
          align="end"
          showView={false}
          showResend={false}
          showDeactivate={false}
          showDelete={false}
          showEdit={true}
        />
      ),
    },
  ];

  const basicInfoFields = [
    { label: "Org Name", value: organization?.name },
    { label: "Admin Name", value: organization?.admin_name },
    { label: "Admin Email", value: organization?.admin_email },
    ...(!isOrganizationLevel
      ? [
          { label: "Business Admin Name", value: selectedBusiness?.admin_name },
          {
            label: "Business Admin Email",
            value: selectedBusiness?.admin_email,
          },
        ]
      : []),
    { label: "Website URL", value: organization?.website_url },
    { label: "Address", value: organization?.address },
    { label: "Contact", value: organization?.contact },
    { label: "Total Chat", value: organization?.total_chat },
    { label: "Average Online", value: organization?.avg_online },
    { label: "Created On", value: organization?.created_on },
  ];

  if (isLoading || !organization) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading organization details...
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between text-left">
          {businessOptions.length > 1 ? (
            <div className="space-y-2">
              <Select
                value={selectedBusinessId}
                onValueChange={setSelectedBusinessId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {businessOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Input value={organization.type} readOnly />
            </div>
          )}
          {(tab === "basic" ||
            (tab === "coaches" && isOrganizationLevel) ||
            tab === "users") && (
            <Button
              onClick={() => setActiveModal(MODAL_FOR_TAB[tab] ?? null)}
            >
              <Plus className="size-4" />
              Add {BUTTON_LABEL_FOR_TAB[tab] ?? ""}
            </Button>
          )}
        </div>

        <Tabs
          value={tab}
          onValueChange={(v: string) => setTab(v as TabType)}
          className="w-full"
        >
          <TabsList className="mb-2">
            <TabsTrigger value="basic">Basic & License Info</TabsTrigger>
            <TabsTrigger value="coaches">Coaches Info</TabsTrigger>
            <TabsTrigger
              value="users"
              disabled={isOrganizationLevel}
              className={
                isOrganizationLevel ? "opacity-50 cursor-not-allowed" : ""
              }
            >
              Users Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
                {basicInfoFields.map(({ label, value }) => (
                  <div key={label} className="space-y-2">
                    <Label>{label}</Label>
                    <Input value={value ?? ""} readOnly />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium mb-3">
                  License / Subscription History
                </h3>
                <DataTable columns={licenseColumns} data={licenseRows} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coaches">
            {isLoadingAgents && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                Loading coaches...
              </div>
            )}
            {!isLoadingAgents && coachesData.length === 0 && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                No coaches assigned
              </div>
            )}
            {!isLoadingAgents && coachesData.length > 0 && (
              <DataTable columns={coachesColumns} data={coachesData} />
            )}
          </TabsContent>

          <TabsContent value="users">
            {isLoadingUsers && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                Loading users...
              </div>
            )}
            {!isLoadingUsers && usersData.length === 0 && (
              <div className="flex justify-center items-center h-40 text-gray-500">
                No users found
              </div>
            )}
            {!isLoadingUsers && usersData.length > 0 && (
              <DataTable columns={usersColumns} data={usersData} />
            )}
          </TabsContent>
        </Tabs>

        <UserFormModal
          open={activeModal === "admin"}
          onOpenChange={(open) => setActiveModal(open ? "admin" : null)}
          title="Add Admin"
          mode="add"
          onSubmit={(values) => handleInviteUser(values, "admin")}
          submitLabel="Invite Admin"
        />
        {isOrganizationLevel && (
          <AddOrganization
            open={activeModal === "coach"}
            onOpenChange={(open) => {
              setActiveModal(open ? "coach" : null);
              if (!open) refetchAgents();
            }}
            flowType="coaches-only"
            organizationId={organization.id}
            isOrganizationLevel={true}
          />
        )}
        <UserFormModal
          open={activeModal === "user"}
          onOpenChange={(open) => setActiveModal(open ? "user" : null)}
          title="Add User"
          mode="add"
          onSubmit={(values) => handleInviteUser(values, "user")}
          submitLabel="Invite User"
        />
      </div>
    </SuperAdminLayout>
  );
}
