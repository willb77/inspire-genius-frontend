"use client";

import { useMemo, useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";
import UserFormModal from "@/components/shared/forms/UserFormModal";
import type { UserFormValues } from "@/components/shared/forms/userForm.constants";
import ConfirmActionModal from "@/components/shared/forms/ConfirmActionModal";
import ManagementHeader from "@/components/super-admin/ManagementHeader";
import {
  useUserManagement,
  useInviteUser,
  useUpdateUser,
  useDeleteUser,
  useResendInvitation,
} from "@/hooks/super-admin/user-management/useUserManagement";
import { toast } from "sonner";
import type { UserRow } from "@/types/super-admin/user-management";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

export default function UserManagement() {
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching } = useUserManagement({
    page,
    limit: pageSize,
  });
  const users = useMemo(() => data?.data?.users ?? [], [data]);
  const pagination = data?.data?.pagination ?? {
    total: 0,
    page,
    limit: pageSize,
  };

  const rows: UserRow[] = useMemo(() => {
    return users.map((u) => {
      let status: "Active" | "Deactivated" | "Awaiting";
      if (u.user_status?.toLowerCase?.() === "active" || u.is_active) {
        status = "Active";
      } else if (u.user_status?.toLowerCase?.() === "awaiting") {
        status = "Awaiting";
      } else {
        status = "Deactivated";
      }

      return {
        id: u.user_id,
        name: u.full_name ?? "",
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        status,
        invitation_id: u.invitation_id,
        invitation_status:
          u.invitation_status?.toLowerCase?.() || "not_applicable",
      };
    });
  }, [users]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  const inviteMutation = useInviteUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resendMutation = useResendInvitation();

  const openAdd = () => setAddOpen(true);
  const openEdit = (row: UserRow) => {
    setSelected(row);
    setEditOpen(true);
  };
  const openDeactivate = (row: UserRow) => {
    setSelected(row);
    setDeactivateOpen(true);
  };
  const openDelete = (row: UserRow) => {
    setSelected(row);
    setDeleteOpen(true);
  };

  const handleAdd = async (values: UserFormValues) => {
    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
    };

    try {
      await inviteMutation.mutateAsync(body);
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = async (values: UserFormValues) => {
    if (!selected) return;

    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      is_active:
        selected.status === "Awaiting" ? undefined : values.status === "Active",
    };

    try {
      await updateMutation.mutateAsync({
        email: selected.email,
        payload: body,
      });
    } catch (e) {
      throw e;
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;

    const body = {
      first_name: selected.first_name ?? "",
      last_name: selected.last_name ?? "",
      is_active: false,
    };

    try {
      await updateMutation.mutateAsync({
        email: selected.email,
        payload: body,
      });

      setDeactivateOpen(false);
    } catch (e) {}
  };

  const handleDelete = async () => {
    if (!selected) return;

    try {
      await deleteMutation.mutateAsync(selected.email);
      setDeleteOpen(false);
    } catch (e) {}
  };

  const handleResend = async (row: UserRow) => {
    if (!row.invitation_id) {
      toast.error("No invitation found to resend");
      return;
    }

    try {
      await resendMutation.mutateAsync(row.invitation_id);
    } catch (e) {}
  };

  const columns: Column<UserRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant="secondary"
          className={
            row.status === "Active"
              ? "bg-green-100 text-green-700 border-transparent"
              : "bg-gray-200 text-gray-700 border-transparent"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "invitation_status",
      header: "Invitation Status",
      render: (row) => {
        const badgeConfig: Record<
          string,
          { label: string; className: string }
        > = {
          invitation_sent: {
            label: "Invitation Sent",
            className: "bg-yellow-100 text-yellow-700 border-transparent",
          },
          accepted: {
            label: "Accepted",
            className: "bg-green-100 text-green-700 border-transparent",
          },
          expired: {
            label: "Expired",
            className: "bg-red-100 text-red-700 border-transparent",
          },
        };
        const badge = badgeConfig[row.invitation_status];
        if (!badge) return null;
        return (
          <Badge variant="secondary" className={badge.className}>
            {badge.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <ActionMenu
          row={row}
          align="end"
          showView={false}
          showEdit={true}
          showResend={row.status === "Awaiting"}
          showDeactivate={false}
          showDelete={row.status === "Awaiting"}
          onEdit={() => openEdit(row)}
          onResend={() => handleResend(row)}
          onDeactivate={() => openDeactivate(row)}
          onDelete={() => openDelete(row)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader title="User Management" addLabel="Add User" onAdd={openAdd}
        />
        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          {isLoading || isRefetching ? (
            <LoadingSkeleton columns={5} rows={pageSize} />
          ) : (
            <DataTable columns={columns} data={rows} />
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Show{" "}
            {users.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} results
          </div>
          <Pagination
            pageCount={Math.max(1, Math.ceil(pagination.total / pagination.limit) )}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>

      <UserFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
        submitLabel={inviteMutation.isPending ? "Adding User..." : "Add User"}
        allowStatusEdit={false}
      />

      <UserFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={
          selected
            ? {
                first_name: selected.first_name ?? "",
                last_name: selected.last_name ?? "",
                email: selected.email,
                status:
                  selected.status === "Deactivated" ? "Deactivated" : "Active",
              }
            : undefined
        }
        onSubmit={handleEdit}
        title="Edit User"
        submitLabel={
          updateMutation.isPending ? "Updating User..." : "Save Changes"
        }
        allowStatusEdit={selected?.status !== "Awaiting"}
      />

      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate User"
        description="Are you sure you want to deactivate this user?"
        fields={[{ label: "User Name", value: selected?.name ?? "" }]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        confirmLoading={updateMutation.isPending}
      />

      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description="Are you sure you want to permanently delete this user? This action cannot be undone."
        fields={[{ label: "User Name", value: selected?.name ?? "" }]}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        confirmLoading={deleteMutation.isPending}
      />
    </SuperAdminLayout>
  );
}