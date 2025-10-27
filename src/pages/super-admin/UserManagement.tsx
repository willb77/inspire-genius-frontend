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
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";
import type { UserManagementUser } from "@/services/super-admin/user-management/user-management.service";
import {
  inviteUser,
  type InviteUserPayload,
  updateUserByEmail,
  type UpdateUserPayload,
  deleteUserByEmail,
  resendInvitation,
} from "@/services/super-admin/user-management/user-management.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "Active" | "Awaiting" | "Deactivated";
  invitation_id?: string | null;
};

export default function UserManagement() {
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const { data: usersResp } = useUserManagement({ page, limit: pageSize });

  const queryClient = useQueryClient();
  const inviteMutation = useMutation({
    mutationFn: (payload: InviteUserPayload) => inviteUser(payload),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User invitation sent successfully.");
      // refresh users list
      queryClient.invalidateQueries({
        queryKey: ["user-management"],
        exact: false,
      });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to invite user";
      toast.error(msg);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { email: string; payload: UpdateUserPayload }) =>
      updateUserByEmail(vars.email, vars.payload),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User updated successfully.");
      queryClient.invalidateQueries({
        queryKey: ["user-management"],
        exact: false,
      });
      setModalMode(null);
      setSelected(null);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to update user";
      toast.error(msg);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (email: string) => deleteUserByEmail(email),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User deleted successfully.");
      queryClient.invalidateQueries({
        queryKey: ["user-management"],
        exact: false,
      });
      setConfirmMode(null);
      setSelected(null);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to delete user";
      toast.error(msg);
    },
  });
  const resendMutation = useMutation({
    mutationFn: (invitation_id: string) => resendInvitation(invitation_id),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "Invitation resent successfully.");
      queryClient.invalidateQueries({
        queryKey: ["user-management"],
        exact: false,
      });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to resend invitation";
      toast.error(msg);
    },
  });

  const mappedRows = useMemo<UserRow[]>(() => {
    const users: UserManagementUser[] = usersResp?.data?.users ?? [];

    const toName = (u: UserManagementUser) =>
      u.full_name ||
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      u.email;

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
        name: toName(u),
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        status,
        invitation_id: u.invitation_id,
      };
    });
  }, [usersResp]);

  const total = usersResp?.data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // dialog state
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [confirmMode, setConfirmMode] = useState<
    "deactivate" | "delete" | null
  >(null);

  const openAdd = () => setModalMode("add");

  const openEdit = (row: UserRow) => {
    setSelected(row);
    setModalMode("edit");
  };

  const openConfirmDeactivate = (row: UserRow) => {
    setSelected(row);
    setConfirmMode("deactivate");
  };

  const openConfirmDelete = (row: UserRow) => {
    setSelected(row);
    setConfirmMode("delete");
  };

  const handleAdd = (values: UserFormValues) => {
    const payload: InviteUserPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
    };
    inviteMutation.mutate(payload, {
      onSuccess: () => {
        setModalMode(null);
        setSelected(null);
      },
    });
  };
  const handleEdit = (values: UserFormValues) => {
    if (!selected?.email) return;
    const payload: UpdateUserPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
    };
    updateMutation.mutate({ email: selected.email, payload });
  };
  const handleDeactivate = () => {
    setConfirmMode(null);
  };
  const handleDelete = () => {
    if (!selected?.email) return;
    deleteMutation.mutate(selected.email);
  };
  const handleResend = (row: UserRow) => {
    const invId = row.invitation_id;
    if (!invId) {
      toast.error("No invitation found to resend.");
      return;
    }
    resendMutation.mutate(invId);
  };

  const columns: Column<UserRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const statusClass =
          row.status === "Active"
            ? "bg-green-100 text-green-700 border-transparent"
            : "bg-gray-200 text-gray-700 border-transparent";

        return (
          <Badge variant="secondary" className={statusClass}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => {
        const status = row.status?.toLowerCase();

        const showResend = status === "awaiting";
        const showDelete = status === "awaiting" || status === "deactivated";
        const showDeactivate = status === "active";

        return (
          <ActionMenu
            row={row}
            align="end"
            showView={false}
            showEdit
            showResend={showResend}
            showDeactivate={showDeactivate}
            showDelete={showDelete}
            onEdit={() => openEdit(row)}
            onResend={() => handleResend(row)}
            onDeactivate={() => openConfirmDeactivate(row)}
            onDelete={() => openConfirmDelete(row)}
          />
        );
      },
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={openAdd}
        />
        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          <DataTable columns={columns} data={mappedRows} />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Show {mappedRows.length} of {total} results
          </div>
          <Pagination
            pageCount={totalPages}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>

      <UserFormModal
        open={!!modalMode}
        onOpenChange={(open) => {
          if (!open) {
            setModalMode(null);
            setSelected(null);
          }
        }}
        mode={modalMode ?? "add"}
        defaultValues={
          selected
            ? {
                first_name: selected.first_name ?? "",
                last_name: selected.last_name ?? "",
                email: selected.email,
              }
            : undefined
        }
        onSubmit={modalMode === "edit" ? handleEdit : handleAdd}
        title={modalMode === "edit" ? "Edit User" : "Add User"}
        submitLabel={modalMode === "edit" ? "Save Changes" : "Add User"}
      />

      <ConfirmActionModal
        open={!!confirmMode}
        onOpenChange={() => setConfirmMode(null)}
        title={confirmMode === "delete" ? "Delete User" : "Deactivate User?"}
        description={
          confirmMode === "delete"
            ? "Are you sure you want to permanently delete this user? This action cannot be undone."
            : "Are you sure you want to deactivate the Organization?"
        }
        fields={[{ label: "User Name", value: selected?.name ?? "" }]}
        confirmLabel={confirmMode === "delete" ? "Delete" : "Deactivate"}
        confirmVariant="destructive"
        onConfirm={confirmMode === "delete" ? handleDelete : handleDeactivate}
      />
    </SuperAdminLayout>
  );
}
