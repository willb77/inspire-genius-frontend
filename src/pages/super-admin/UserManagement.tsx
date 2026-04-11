"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  useInactiveUserCount,
  usePurgeInactiveUsers,
} from "@/hooks/super-admin/user-management/useUserManagement";
import { deleteUserByEmail } from "@/services/super-admin/user-management/user-management.service";
import { useRoles } from "@/hooks/super-admin/useRoles";
import { toast } from "sonner";
import type { UserRow } from "@/types/super-admin/user-management";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { ROLE_LABELS } from "@/types/roles";
import { Trash2, UserX, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UserManagement() {
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching } = useUserManagement({
    page,
    limit: pageSize,
  });
  const { data: rolesData } = useRoles();
  const roles = useMemo(() => rolesData?.data?.roles ?? [], [rolesData]);

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
        role: u.role,
        status,
        invitation_id: u.invitation_id,
        invitation_status:
          u.invitation_status?.toLowerCase?.() || "not_applicable",
        created_at: u.created_at,
        is_email_verified: u.is_email_verified,
      };
    });
  }, [users]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  // Bulk selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkActivateOpen, setBulkActivateOpen] = useState(false);
  const [bulkActivating, setBulkActivating] = useState(false);

  // Purge inactive users state
  const [purgeOpen, setPurgeOpen] = useState(false);
  const { data: inactiveCount, isLoading: isLoadingInactiveCount } =
    useInactiveUserCount(purgeOpen);
  const purgeMutation = usePurgeInactiveUsers();

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedEmails.has(r.email));

  const toggleSelectAll = useCallback(() => {
    setSelectedEmails((prev) => {
      if (rows.every((r) => prev.has(r.email))) {
        // Deselect all visible
        const next = new Set(prev);
        for (const r of rows) next.delete(r.email);
        return next;
      }
      // Select all visible
      const next = new Set(prev);
      for (const r of rows) next.add(r.email);
      return next;
    });
  }, [rows]);

  const toggleSelectOne = useCallback((email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }, []);

  const queryClient = useQueryClient();
  const inviteMutation = useInviteUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resendMutation = useResendInvitation();

  const openAdd = () => setAddOpen(true);
  const openView = (row: UserRow) => {
    setSelected(row);
    setViewOpen(true);
  };
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
  const openActivate = (row: UserRow) => {
    setSelected(row);
    setActivateOpen(true);
  };

  const getRoleIdByName = (roleName: string): string | undefined => {
    const role = roles.find((r) => r.name === roleName);
    return role?.id;
  };

  const handleAdd = async (values: UserFormValues) => {
    const roleId = getRoleIdByName(values.role);
    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      role_id: roleId,
    };

    await inviteMutation.mutateAsync(body);
  };

  const handleEdit = async (values: UserFormValues) => {
    if (!selected) return;

    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      is_active:
        selected.status === "Awaiting" ? undefined : values.status === "Active",
    };

    await updateMutation.mutateAsync({
      email: selected.email,
      payload: body,
    });
  };

  const handleDeactivate = async () => {
    if (!selected) return;

    await updateMutation.mutateAsync({
      email: selected.email,
      payload: {
        ...(selected.first_name ? { first_name: selected.first_name } : {}),
        ...(selected.last_name ? { last_name: selected.last_name } : {}),
        is_active: false,
      },
    });

    setDeactivateOpen(false);
  };

  const handleActivate = async () => {
    if (!selected) return;

    await updateMutation.mutateAsync({
      email: selected.email,
      payload: {
        ...(selected.first_name ? { first_name: selected.first_name } : {}),
        ...(selected.last_name ? { last_name: selected.last_name } : {}),
        is_active: true,
      },
    });

    setActivateOpen(false);
  };

  const handleDelete = async () => {
    if (!selected) return;

    await deleteMutation.mutateAsync(selected.email);
    setDeleteOpen(false);
  };

  const handleResend = async (row: UserRow) => {
    if (!row.invitation_id) {
      toast.error("No invitation found to resend");
      return;
    }

    await resendMutation.mutateAsync(row.invitation_id);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const emails = Array.from(selectedEmails);

    const results = await Promise.allSettled(
      emails.map((email) => deleteUserByEmail(email))
    );

    const succeeded: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.status !== false) {
        succeeded.push(emails[index]);
      } else {
        failed.push(emails[index]);
      }
    });

    // Keep only the failed emails selected
    setSelectedEmails(new Set(failed));

    // Invalidate query cache once after all operations
    queryClient.invalidateQueries({
      queryKey: ["super-admin", "user-management"],
      exact: false,
    });

    if (succeeded.length > 0 && failed.length === 0) {
      toast.success(`Deleted ${succeeded.length} user(s)`);
    } else if (succeeded.length > 0 && failed.length > 0) {
      toast.warning(
        `Deleted ${succeeded.length} user(s), but ${failed.length} could not be deleted`
      );
    } else {
      toast.error("No users could be deleted");
    }

    if (failed.length === 0) {
      setBulkDeleteOpen(false);
    }

    setBulkDeleting(false);
  };

  const handleBulkActivate = async () => {
    setBulkActivating(true);
    const emails = Array.from(selectedEmails);

    const results = await Promise.allSettled(
      emails.map((email) => {
        const user = rows.find((r) => r.email === email);
        return updateMutation.mutateAsync({
          email,
          payload: {
            ...(user?.first_name ? { first_name: user.first_name } : {}),
            ...(user?.last_name ? { last_name: user.last_name } : {}),
            is_active: true,
          },
        });
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0 && failed === 0) {
      toast.success(`Activated ${succeeded} user(s)`);
      setSelectedEmails(new Set());
    } else if (succeeded > 0) {
      toast.warning(`Activated ${succeeded} user(s), but ${failed} could not be activated`);
    } else {
      toast.error("No users could be activated");
    }

    queryClient.invalidateQueries({
      queryKey: ["super-admin", "user-management"],
      exact: false,
    });

    setBulkActivateOpen(false);
    setBulkActivating(false);
  };

  const handlePurgeInactive = async () => {
    await purgeMutation.mutateAsync();
    setPurgeOpen(false);
  };

  const columns: Column<UserRow>[] = [
    {
      key: "_select",
      header: (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedEmails.has(row.email)}
          onCheckedChange={() => toggleSelectOne(row.email)}
          aria-label={`Select ${row.email}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span className="text-sm">
          {ROLE_LABELS[row.role ?? ""] ?? row.role ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const statusStyles: Record<string, string> = {
          Active: "bg-green-100 text-green-700 border-transparent",
          Deactivated: "bg-red-100 text-red-700 border-transparent",
          Awaiting: "bg-yellow-100 text-yellow-700 border-transparent",
        };
        return (
          <Badge
            variant="secondary"
            className={statusStyles[row.status] ?? "bg-gray-200 text-gray-700 border-transparent"}
          >
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "invitation_status",
      header: "Invitation",
      render: (row) => {
        const badgeConfig: Record<
          string,
          { label: string; className: string }
        > = {
          invitation_sent: {
            label: "Sent",
            className: "bg-yellow-100 text-yellow-700 border-transparent",
          },
          pending: {
            label: "Pending",
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
        if (!badge) return <span className="text-sm text-muted-foreground">—</span>;
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
          showView={true}
          showEdit={row.status !== "Awaiting"}
          showResend={row.status === "Awaiting"}
          showDeactivate={row.status === "Active"}
          showActivate={row.status === "Deactivated"}
          showDelete={true}
          onView={() => openView(row)}
          onEdit={() => openEdit(row)}
          onResend={() => handleResend(row)}
          onDeactivate={() => openDeactivate(row)}
          onActivate={() => openActivate(row)}
          onDelete={() => openDelete(row)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <ManagementHeader
          title="User Management"
          addLabel="Add User"
          onAdd={openAdd}
          extraActions={
            <>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setPurgeOpen(true)}
              >
                <UserX className="size-4" />
                Purge Inactive
              </Button>
              {selectedEmails.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setBulkActivateOpen(true)}
                  >
                    <UserCheck className="size-4" />
                    Activate Selected ({selectedEmails.size})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete Selected ({selectedEmails.size})
                  </Button>
                </>
              )}
            </>
          }
        />
        <div className="h-[calc(100vh-13.5rem)] overflow-y-auto">
          {isLoading || isRefetching ? (
            <LoadingSkeleton columns={6} rows={pageSize} />
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
            pageCount={Math.max(1, Math.ceil(pagination.total / pagination.limit))}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* View User Detail Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="sr-only">View user information</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <DetailRow label="Name" value={selected.name || "—"} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Role" value={ROLE_LABELS[selected.role ?? ""] ?? selected.role ?? "—"} />
              <DetailRow label="Status">
                <Badge
                  variant="secondary"
                  className={
                    selected.status === "Active"
                      ? "bg-green-100 text-green-700 border-transparent"
                      : selected.status === "Awaiting"
                        ? "bg-yellow-100 text-yellow-700 border-transparent"
                        : "bg-red-100 text-red-700 border-transparent"
                  }
                >
                  {selected.status}
                </Badge>
              </DetailRow>
              <DetailRow
                label="Email Verified"
                value={selected.is_email_verified ? "Yes" : "No"}
              />
              <DetailRow
                label="Created"
                value={
                  selected.created_at
                    ? new Date(selected.created_at).toLocaleDateString()
                    : "—"
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <UserFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        onSubmit={handleAdd}
        submitLabel={inviteMutation.isPending ? "Adding User..." : "Add User"}
        allowStatusEdit={false}
      />

      {/* Edit User Modal */}
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
                role: selected.role ?? "",
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

      {/* Deactivate Confirmation */}
      <ConfirmActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate User"
        description="Are you sure you want to deactivate this user? They will no longer be able to log in."
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        confirmLoading={updateMutation.isPending}
      />

      {/* Activate Confirmation */}
      <ConfirmActionModal
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Activate User"
        description="Are you sure you want to reactivate this user? They will be able to log in again."
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Activate"
        onConfirm={handleActivate}
        confirmLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description="Are you sure you want to permanently delete this user? This action cannot be undone."
        fields={[
          { label: "Name", value: selected?.name ?? "" },
          { label: "Email", value: selected?.email ?? "" },
        ]}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        confirmLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmActionModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Users"
        description={`Are you sure you want to permanently delete ${selectedEmails.size} user(s)? This action cannot be undone.`}
        fields={[
          { label: "Users to delete", value: `${selectedEmails.size}` },
        ]}
        confirmLabel="Delete All"
        confirmVariant="destructive"
        onConfirm={handleBulkDelete}
        confirmLoading={bulkDeleting}
      />

      {/* Bulk Activate Confirmation */}
      <ConfirmActionModal
        open={bulkActivateOpen}
        onOpenChange={setBulkActivateOpen}
        title="Activate Selected Users"
        description={`Are you sure you want to activate ${selectedEmails.size} user(s)? They will be able to log in.`}
        fields={[
          { label: "Users to activate", value: `${selectedEmails.size}` },
        ]}
        confirmLabel="Activate All"
        onConfirm={handleBulkActivate}
        confirmLoading={bulkActivating}
      />

      {/* Purge Inactive Users Confirmation */}
      <ConfirmActionModal
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title="Purge Inactive Users"
        description="This will permanently delete all deactivated users from the system. This action cannot be undone."
        fields={[
          {
            label: "Inactive users to purge",
            value: isLoadingInactiveCount
              ? "Loading..."
              : `${inactiveCount ?? 0}`,
          },
        ]}
        confirmLabel="Purge All"
        confirmVariant="destructive"
        onConfirm={handlePurgeInactive}
        confirmLoading={purgeMutation.isPending}
      />
    </SuperAdminLayout>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-muted-foreground shrink-0">{label}</span>
      {children ?? <span className="text-sm text-right">{value}</span>}
    </div>
  );
}
